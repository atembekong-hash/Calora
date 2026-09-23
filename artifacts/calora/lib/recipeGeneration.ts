/** Authenticated recipe and durable generated-media requests. */
import { supabase } from '@/lib/supabase';
import { getApiBaseUrl } from '@/lib/api-config';

export const SIGN_IN_MESSAGE = 'Please sign in to generate recipe ideas.';

export class RecipeAuthError extends Error {
  readonly signedOut = true;
  constructor(message: string = SIGN_IN_MESSAGE) { super(message); this.name = 'RecipeAuthError'; }
}

export class RecipeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly retryable = false,
    readonly retryAfterMs?: number,
  ) { super(message); this.name = 'RecipeApiError'; }
}

export type RecipeMediaStatus = 'generating' | 'stored' | 'url_ready' | 'retryable_error' | 'superseded';
export type RecipeMediaReviewState = 'needs_review' | 'accepted' | 'rejected';
export type GeneratedRecipePhoto = {
  mediaId: string;
  clientRecipeId: string;
  contentHash: string;
  imageId: string | null;
  imageUrl?: string;
  imageUrlExpiresAt?: string;
  modelVersion: string;
  promptVersion: string;
  status: RecipeMediaStatus;
  semanticReviewState: RecipeMediaReviewState;
  attempts: number;
  lastErrorCode?: string;
  createdAt: string;
  updatedAt: string;
};
export type GeneratedRecipePhotoInput = {
  clientRecipeId: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cuisine?: string;
  category?: string;
  mealType?: string;
  dietaryContext: string[];
};

type SessionLike = { access_token?: string | null; expires_at?: number | null } | null;
const tokenFromSession = (session: SessionLike) => typeof session?.access_token === 'string' && session.access_token ? session.access_token : null;
const isExpired = (session: SessionLike, skewSeconds = 30) => typeof session?.expires_at === 'number' && session.expires_at * 1000 <= Date.now() + skewSeconds * 1000;

export async function getFreshAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session as SessionLike;
  const token = tokenFromSession(session);
  if (!token) return null;
  if (!isExpired(session)) return token;
  const refreshed = await supabase.auth.refreshSession();
  return tokenFromSession(refreshed.data.session as SessionLike) ?? token;
}
async function forceRefreshedToken() {
  try { const { data } = await supabase.auth.refreshSession(); return tokenFromSession(data.session as SessionLike); }
  catch { return null; }
}

function retryAfterMs(response: Response, body: { retryAfterSecs?: unknown }): number | undefined {
  const header = response.headers?.get?.('retry-after');
  const seconds = Number(header ?? body.retryAfterSecs);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}
function abortError() { const error = new Error('Request cancelled.'); error.name = 'AbortError'; return error; }
function wait(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(abortError()); }, { once: true });
  });
}

export type AuthedJsonRequest = {
  path: string;
  body?: unknown;
  method?: 'GET' | 'POST';
  signal?: AbortSignal;
  signInMessage: string;
  fallbackMessage: string;
  idempotencyKey?: string;
  maxRetries?: number;
};

export async function authedJsonRequest<T>({ path, body, method = 'POST', signal, signInMessage, fallbackMessage, idempotencyKey, maxRetries = 0 }: AuthedJsonRequest): Promise<T> {
  let token = await getFreshAccessToken();
  if (!token) throw new RecipeAuthError(signInMessage);
  let authRetried = false;
  let retries = 0;
  while (true) {
    if (signal?.aborted) throw abortError();
    let response: Response;
    try {
      response = await fetch(`${getApiBaseUrl()}${path}`, {
        method,
        headers: {
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          Authorization: `Bearer ${token}`,
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        signal,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      if ((error as Error)?.name === 'AbortError' || signal?.aborted) throw error;
      if (retries++ < maxRetries) { await wait(Math.min(250 * 2 ** (retries - 1), 1000), signal); continue; }
      throw new RecipeApiError('You appear to be offline. Your recipe remains saved.', 0, 'offline', true);
    }
    if (response.status === 401 && !authRetried) {
      authRetried = true;
      token = await forceRefreshedToken() ?? '';
      if (!token) throw new RecipeAuthError(signInMessage);
      continue;
    }
    if (response.status === 401) throw new RecipeAuthError(signInMessage);
    const data = (await response.json().catch(() => ({}))) as T & { message?: string; code?: string; retryable?: boolean; retryAfterSecs?: number };
    if (response.ok) return data;
    const after = retryAfterMs(response, data);
    const retryable = data.retryable === true || response.status === 429 || response.status >= 500;
    if (retryable && retries++ < maxRetries) {
      await wait(after ?? Math.min(250 * 2 ** (retries - 1), 1000), signal);
      continue;
    }
    throw new RecipeApiError(data.message ?? fallbackMessage, response.status, data.code, retryable, after);
  }
}

export const postWithAuthRetry = <T>(request: AuthedJsonRequest) => authedJsonRequest<T>(request);
export type ConceptPayload = { ingredients: string[]; mealType: string; servings: number; maxMinutes: number; preferences: string[]; request: string };
export function requestRecipeConcepts<T>(payload: ConceptPayload, signal?: AbortSignal) { return authedJsonRequest<T>({ path: '/api/v1/recipes/concepts', body: payload, signal, signInMessage: SIGN_IN_MESSAGE, fallbackMessage: 'Ideas are unavailable.' }); }
export async function requestGuestRecipeConcepts<T>(payload: ConceptPayload, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/recipes/guest-concepts`, { method: 'POST', headers: { 'content-type': 'application/json' }, signal, body: JSON.stringify(payload) });
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(data.message ?? 'Guest recipe ideas are unavailable.');
  return data;
}
export function requestGeneratedRecipe<T>(payload: { title: string; summary: string; servings: number }) { return authedJsonRequest<T>({ path: '/api/v1/recipes/generated', body: payload, signInMessage: 'Please sign in to finish a recipe.', fallbackMessage: 'Recipe generation is unavailable.' }); }
export function requestGeneratedRecipePhoto(payload: GeneratedRecipePhotoInput, options: { signal?: AbortSignal; maxRetries?: number } = {}) {
  return authedJsonRequest<GeneratedRecipePhoto>({
    path: '/api/v1/recipes/photo', body: payload, signal: options.signal,
    idempotencyKey: `recipe-photo:${payload.clientRecipeId}`,
    maxRetries: options.maxRetries ?? 1,
    signInMessage: 'Please sign in to create a recipe photo.', fallbackMessage: 'Recipe photo generation is unavailable.',
  });
}
export function requestGeneratedRecipePhotoUrl(payload: { mediaId?: string; imageId?: string }, signal?: AbortSignal) {
  return authedJsonRequest<GeneratedRecipePhoto>({ path: '/api/v1/recipes/photo-url', body: payload, signal, maxRetries: 1, signInMessage: 'Please sign in to view your recipe photo.', fallbackMessage: 'Recipe photo is unavailable.' });
}
export function listGeneratedRecipeMedia(signal?: AbortSignal) { return authedJsonRequest<{ media: GeneratedRecipePhoto[] }>({ path: '/api/v1/recipes/media', method: 'GET', signal, maxRetries: 1, signInMessage: 'Please sign in to restore recipe photos.', fallbackMessage: 'Recipe photos are unavailable.' }); }
export function getGeneratedRecipeMedia(mediaId: string, signal?: AbortSignal) { return authedJsonRequest<GeneratedRecipePhoto>({ path: `/api/v1/recipes/media/${encodeURIComponent(mediaId)}`, method: 'GET', signal, maxRetries: 1, signInMessage: 'Please sign in to view recipe photo status.', fallbackMessage: 'Recipe photo is unavailable.' }); }
export function retryGeneratedRecipeMedia(mediaId: string, signal?: AbortSignal) { return authedJsonRequest<GeneratedRecipePhoto>({ path: `/api/v1/recipes/media/${encodeURIComponent(mediaId)}/retry`, signal, maxRetries: 1, signInMessage: 'Please sign in to retry a recipe photo.', fallbackMessage: 'Recipe photo retry is unavailable.' }); }
export function reviewGeneratedRecipeMedia(mediaId: string, reviewState: RecipeMediaReviewState) { return authedJsonRequest<GeneratedRecipePhoto>({ path: `/api/v1/recipes/media/${encodeURIComponent(mediaId)}/review`, body: { reviewState }, signInMessage: 'Please sign in to review a recipe photo.', fallbackMessage: 'Recipe photo review is unavailable.' }); }
export function acknowledgeGeneratedRecipeMediaRendered(mediaId: string) { return authedJsonRequest<void>({ path: `/api/v1/recipes/media/${encodeURIComponent(mediaId)}/rendered`, signInMessage: 'Please sign in to acknowledge a recipe photo.', fallbackMessage: 'Recipe photo acknowledgement is unavailable.' }); }
