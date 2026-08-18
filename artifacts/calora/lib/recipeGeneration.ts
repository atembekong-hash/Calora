/**
 * CaloraApp — authenticated AI recipe-generation requests.
 *
 * The Recipes → Create flow calls the concept and full-recipe endpoints with a
 * Supabase Bearer token. `getSession()` can hand back a stale/expired access
 * token (e.g. after the auto-refresh timer is throttled in a backgrounded web
 * preview). A request sent with that token 401s, and retrying with the same
 * token can never recover — which is exactly the "signed in but told to sign
 * in" failure. These helpers:
 *
 *  - resolve the freshest available access token before each request,
 *  - on a 401 *with* a token, force one `refreshSession()` and retry once,
 *  - only surface the sign-in message when there is genuinely no session.
 */

import { supabase } from '@/lib/supabase';
import { getApiBaseUrl } from '@/lib/api-config';

export const SIGN_IN_MESSAGE = 'Please sign in to generate recipe ideas.';

export class RecipeAuthError extends Error {
  readonly signedOut = true;
  constructor(message: string = SIGN_IN_MESSAGE) {
    super(message);
    this.name = 'RecipeAuthError';
  }
}

type SessionLike = { access_token?: string | null; expires_at?: number | null } | null;

function tokenFromSession(session: SessionLike): string | null {
  const token = session?.access_token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

function isExpired(session: SessionLike, skewSeconds = 30): boolean {
  const expiresAt = session?.expires_at;
  if (typeof expiresAt !== 'number') return false;
  return expiresAt * 1000 <= Date.now() + skewSeconds * 1000;
}

/**
 * Returns the current access token, forcing a refresh when the stored access
 * token is already (or nearly) expired. Returns null only when signed out.
 */
export async function getFreshAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session as SessionLike;
  const token = tokenFromSession(session);
  if (!token) return null;
  if (!isExpired(session)) return token;
  const refreshed = await supabase.auth.refreshSession();
  const refreshedToken = tokenFromSession(refreshed.data.session as SessionLike);
  // Fall back to the stored token so the server stays the authority — it may
  // still accept it, and a definitive 401 triggers the retry path below.
  return refreshedToken ?? token;
}

async function forceRefreshedToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.refreshSession();
    return tokenFromSession(data.session as SessionLike);
  } catch {
    return null;
  }
}

type AuthedJsonRequest = {
  path: string;
  body: unknown;
  signal?: AbortSignal;
  signInMessage: string;
  fallbackMessage: string;
};

/**
 * POSTs JSON to the API with a Bearer token. Signed-out users never hit the
 * network. A 401 despite a token triggers exactly one forced session refresh
 * and retry; a second 401 (or a failed refresh) surfaces the sign-in message.
 */
export async function postWithAuthRetry<T>({ path, body, signal, signInMessage, fallbackMessage }: AuthedJsonRequest): Promise<T> {
  const token = await getFreshAccessToken();
  if (!token) throw new RecipeAuthError(signInMessage);

  const send = (accessToken: string) =>
    fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
      signal,
      body: JSON.stringify(body),
    });

  let response = await send(token);
  if (response.status === 401) {
    const refreshedToken = await forceRefreshedToken();
    if (!refreshedToken) throw new RecipeAuthError(signInMessage);
    response = await send(refreshedToken);
    if (response.status === 401) throw new RecipeAuthError(signInMessage);
  }

  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(data.message ?? fallbackMessage);
  return data;
}

export type ConceptPayload = {
  ingredients: string[];
  mealType: string;
  servings: number;
  maxMinutes: number;
  preferences: string[];
  request: string;
};

export function requestRecipeConcepts<T>(payload: ConceptPayload, signal?: AbortSignal): Promise<T> {
  return postWithAuthRetry<T>({
    path: '/api/v1/recipes/concepts',
    body: payload,
    signal,
    signInMessage: SIGN_IN_MESSAGE,
    fallbackMessage: 'Ideas are unavailable.',
  });
}

export function requestGeneratedRecipe<T>(payload: { title: string; summary: string; servings: number }): Promise<T> {
  return postWithAuthRetry<T>({
    path: '/api/v1/recipes/generated',
    body: payload,
    signInMessage: 'Please sign in to finish a recipe.',
    fallbackMessage: 'Recipe generation is unavailable.',
  });
}
