export interface RevenueCatIdentityApi {
  logIn(appUserId: string): Promise<unknown>;
  isAnonymous(): Promise<boolean>;
  logOut(): Promise<unknown>;
}

let transitionQueue: Promise<void> = Promise.resolve();
let requestedGeneration = 0;

/**
 * Serializes RevenueCat identity changes. A newer request supersedes an older
 * one before it starts, and an in-flight SDK completion is never reported as
 * applied after a newer account has been requested.
 */
export function synchronizeRevenueCatIdentity(
  targetId: string | null,
  api: RevenueCatIdentityApi,
): Promise<boolean> {
  const generation = ++requestedGeneration;
  const transition = transitionQueue.then(async () => {
    if (generation !== requestedGeneration) return false;

    if (targetId) {
      await api.logIn(targetId);
    } else if (!(await api.isAnonymous())) {
      if (generation !== requestedGeneration) return false;
      await api.logOut();
    }

    return generation === requestedGeneration;
  });
  // Keep the queue alive after an individual SDK failure so a later account
  // can still converge without waiting for an app restart.
  transitionQueue = transition.then(() => undefined, () => undefined);
  return transition;
}

/** Test-only reset for isolated identity-race tests. */
export function resetRevenueCatIdentityTransitions(): void {
  transitionQueue = Promise.resolve();
  requestedGeneration = 0;
}