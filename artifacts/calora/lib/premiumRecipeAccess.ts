/**
 * Premium recipe responses remain displayable only while the most recent
 * entitlement-verifying request has succeeded and no replacement validation is
 * in flight. Cached/provider data is never itself proof of current access.
 */
export function hasCurrentPremiumAccess(input: {
  isSuccess: boolean;
  isFetchedAfterMount: boolean;
  isFetching: boolean;
}): boolean {
  return input.isSuccess && input.isFetchedAfterMount && !input.isFetching;
}

/**
 * Keep a catalogue that was already verified for the current account visible
 * while React Query revalidates it. The caller must still handle 401/403 before
 * using this result and must reset the verified-account marker on account
 * changes.
 */
export function canDisplayPremiumCatalogue(input: {
  hasCurrentAccess: boolean;
  isFetching: boolean;
  hasVerifiedCurrentAccount: boolean;
}): boolean {
  return input.hasCurrentAccess
    || (input.isFetching && input.hasVerifiedCurrentAccount);
}