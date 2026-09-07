/**
 * A dependency-free, emitted release probe for the API's deletion-fence
 * signal construction boundary. It is verified from the built artifact before
 * a release is approved and is not loaded by the running API.
 */
export { accountDeletionFenceSignal } from "./lib/account-deletion-fence-signal";