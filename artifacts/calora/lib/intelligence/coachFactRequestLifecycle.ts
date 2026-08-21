import type { CoachFactContextV1 } from './coachFactContext';
import { isCoachFactContextCurrent } from './coachFactContext';

export type CoachFactRequestScope = {
  accountId: string | null;
  hydrationGeneration: number;
  nonce: string;
  aborted: boolean;
};

/** In-memory only scope guard. Call invalidate on sign-out, clear, or hydration reset. */
export class CoachFactRequestLifecycle {
  private active: CoachFactRequestScope | null = null;

  begin(context: CoachFactContextV1, accountId: string | null, hydrationGeneration: number): CoachFactRequestScope {
    this.invalidate();
    const scope = { accountId, hydrationGeneration, nonce: context.requestNonce, aborted: false };
    this.active = scope;
    return scope;
  }

  invalidate() {
    if (this.active) this.active.aborted = true;
    this.active = null;
  }

  canAccept(scope: CoachFactRequestScope, context: CoachFactContextV1, current: Pick<CoachFactRequestScope, 'accountId' | 'hydrationGeneration'>) {
    return this.active === scope
      && !scope.aborted
      && scope.accountId === current.accountId
      && scope.hydrationGeneration === current.hydrationGeneration
      && scope.nonce === context.requestNonce
      && isCoachFactContextCurrent(context);
  }
}