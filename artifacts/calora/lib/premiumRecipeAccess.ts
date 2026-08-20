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