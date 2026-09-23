/**
 * Pure route policy for identity transitions.
 *
 * RootLayoutNav is the only navigation owner for a successfully established
 * session.  Auth screens may report progress/errors, but never decide the
 * authenticated destination or use history-dependent Back navigation.
 */

export type PostAuthIntent = 'none' | 'pending' | 'ordinary' | 'recovery';
export type PostAuthDestination = '/(tabs)' | '/' | '/auth/reset-password';

export type PostAuthNavigationPlan = {
  /**
   * Whether the auth group must remain available for callback/recovery input.
   * It is route availability, not route history: terminal transitions always
   * prune completed auth screens with dismissAll/replace.
   */
  authRoutesEnabled: boolean;
  /** The deterministic next route, if this state owns a transition. */
  destination: PostAuthDestination | null;
};

export type PostAuthRouter = {
  dismissAll(): void;
  replace(destination: PostAuthDestination): void;
};

/**
 * Suppresses repeated terminal navigation from browser and Router deliveries
 * of one logical callback. The key intentionally contains no callback URL,
 * OAuth code, token, email, or provider detail.
 */
export function createPostAuthNavigationCoordinator(router: PostAuthRouter) {
  let lastTransitionKey: string | null = null;

  return {
    transition({
      sessionId,
      intent,
      plan,
    }: {
      sessionId: string;
      intent: PostAuthIntent;
      plan: PostAuthNavigationPlan;
    }): boolean {
      if (!plan.destination) {
        return false;
      }

      // Intent is deliberately not part of the key. A Supabase SIGNED_IN event
      // can precede the email/OAuth action promise, but both describe the same
      // user entering the same destination and must not cause two transitions.
      const transitionKey = `${sessionId}:${plan.destination}`;
      if (lastTransitionKey === transitionKey) {
        return false;
      }

      lastTransitionKey = transitionKey;
      // Expo Router exposes dismissAll specifically for stack pruning. It is
      // paired with replace so neither the nested callback nor sign-in route
      // remains reachable through the system Back gesture.
      router.dismissAll();
      router.replace(plan.destination);
      return true;
    },
    reset() {
      lastTransitionKey = null;
    },
  };
}

export function getPostAuthNavigationPlan({
  restoreStatus,
  hasSession,
  intent,
  applicationReady,
}: {
  restoreStatus: 'loading' | 'ready' | 'failed';
  hasSession: boolean;
  intent: PostAuthIntent;
  applicationReady: boolean;
}): PostAuthNavigationPlan {
  // A storage fault is neither a guest decision nor a completed auth flow.
  // Keep the auth stack available for explicit user recovery after the error
  // screen instead of silently mounting the guest account namespace.
  if (restoreStatus !== 'ready' || !hasSession) {
    return { authRoutesEnabled: true, destination: null };
  }

  // Browser and Router callback deliveries can overlap. Until their shared
  // callback result settles, leave the callback surface mounted and do not let
  // a SIGNED_IN listener race a recovery callback to Home.
  if (intent === 'pending') {
    return { authRoutesEnabled: true, destination: null };
  }

  // Recovery comes only from the validated callback intent, never an arbitrary
  // listener delay. Auth must remain registered long enough to set the password.
  if (intent === 'recovery') {
    return { authRoutesEnabled: true, destination: '/auth/reset-password' };
  }

  // The root coordinator prunes obsolete sign-in/callback screens. Retaining
  // registration permits a later password-recovery universal link to be
  // received on an already signed-in device.
  return {
    authRoutesEnabled: true,
    destination: applicationReady ? '/(tabs)' : '/',
  };
}
