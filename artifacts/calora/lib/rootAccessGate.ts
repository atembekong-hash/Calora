export type RootAccessGateInput = {
  hydrated: boolean;
  hydrationError: unknown;
  profileSyncReady: boolean;
  onboardingComplete: boolean;
  reviewRequested: boolean;
};

export type RootAccessGateState = {
  applicationReady: boolean;
  allowOnboarding: boolean;
  allowApplication: boolean;
};

/**
 * Computes the only two application route groups that may be mounted for an
 * account scope. Hydration, profile reconciliation, onboarding completion,
 * and required consent must all complete before protected application routes
 * become available.
 */
export function getRootAccessGateState({
  hydrated,
  hydrationError,
  profileSyncReady,
  onboardingComplete,
  reviewRequested,
}: RootAccessGateInput): RootAccessGateState {
  const applicationReady = hydrated
    && !hydrationError
    && profileSyncReady
    && onboardingComplete;

  return {
    applicationReady,
    allowOnboarding: !applicationReady || reviewRequested,
    allowApplication: applicationReady,
  };
}

/**
 * Invitation links may be received before an account is ready. Preserve the
 * invitation code but never target a protected profile route until the same
 * root access policy has admitted application routes.
 */
export function getInviteDestination(
  hasAuthenticatedUser: boolean,
  applicationReady: boolean,
): '/auth/sign-up' | '/' | '/(tabs)/profile' {
  if (!hasAuthenticatedUser) return '/auth/sign-up';
  return applicationReady ? '/(tabs)/profile' : '/';
}
