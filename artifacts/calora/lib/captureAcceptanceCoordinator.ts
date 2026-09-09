/**
 * Serializes a capture draft's staged durable acceptance. Keeping this small
 * coordinator independent of React makes the real production coalescing and
 * retry boundary directly testable.
 */
export type CaptureAcceptanceCoordinator<T> = {
  inFlight: Map<string, Promise<T>>;
  tail: Promise<void>;
};

export function createCaptureAcceptanceCoordinator<T>(): CaptureAcceptanceCoordinator<T> {
  return { inFlight: new Map(), tail: Promise.resolve() };
}

export function coordinateCaptureAcceptance<T>(
  coordinator: CaptureAcceptanceCoordinator<T>,
  draftId: string,
  transaction: () => Promise<T>,
): Promise<T> {
  const current = coordinator.inFlight.get(draftId);
  if (current) return current;
  // Invoke transaction only after all earlier draft transactions settle.
  // Rejections are absorbed by the tail so neither failure nor retry can
  // permanently lock later work.
  const result = coordinator.tail.catch(() => undefined).then(transaction);
  let shared: Promise<T>;
  shared = result.finally(() => {
    if (coordinator.inFlight.get(draftId) === shared) coordinator.inFlight.delete(draftId);
  });
  coordinator.inFlight.set(draftId, shared);
  coordinator.tail = shared.then(() => undefined, () => undefined);
  return shared;
}