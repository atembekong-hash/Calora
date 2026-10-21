export type DiscoverVisitEntry = {
  key: string;
  source: "calora" | "remote";
};

export type DiscoverVisitCompositionInput<T extends DiscoverVisitEntry> = {
  curated: readonly T[];
  remote: readonly T[];
  /** Stable for one visible visit; callers create a new token only on a real reopen. */
  seed: string;
};

export type DiscoverVisitComposition<T extends DiscoverVisitEntry> = {
  seed: string;
  entries: T[];
};

function dedupeByKey<T extends DiscoverVisitEntry>(entries: readonly T[]): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (!entry.key || seen.has(entry.key)) return false;
    seen.add(entry.key);
    return true;
  });
}

/** A deterministic non-cryptographic hash is sufficient for visual ordering, never security. */
function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededOrder<T extends DiscoverVisitEntry>(
  entries: readonly T[],
  seed: string,
): T[] {
  return dedupeByKey(entries)
    .map((entry) => ({ entry, score: stableHash(`${seed}\u001f${entry.key}`) }))
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.entry.key.localeCompare(right.entry.key),
    )
    .map(({ entry }) => entry);
}

/**
 * Builds one visit's initial composition. It deliberately interleaves verified
 * Calora originals and provider cards when both are available. The seed is
 * stable for the active visit so ordinary renders do not shuffle cards below a
 * reader's finger; the next focused visit uses a new seed.
 */
export function createDiscoverVisitComposition<T extends DiscoverVisitEntry>({
  curated,
  remote,
  seed,
}: DiscoverVisitCompositionInput<T>): T[] {
  const curatedOrdered = seededOrder(curated, `${seed}:calora`);
  const curatedKeys = new Set(curatedOrdered.map((entry) => entry.key));
  const remoteOrdered = seededOrder(
    remote.filter((entry) => !curatedKeys.has(entry.key)),
    `${seed}:remote`,
  );
  if (curatedOrdered.length === 0) return remoteOrdered;
  if (remoteOrdered.length === 0) return curatedOrdered;

  const mixed: T[] = [];
  const widest = Math.max(curatedOrdered.length, remoteOrdered.length);
  for (let index = 0; index < widest; index += 1) {
    const remoteEntry = remoteOrdered[index];
    const curatedEntry = curatedOrdered[index];
    // Provider first prevents the verified curated set from permanently owning
    // the top viewport while still keeping every source visibly represented.
    if (remoteEntry) mixed.push(remoteEntry);
    if (curatedEntry) mixed.push(curatedEntry);
  }
  return mixed;
}

/**
 * Cursor continuation must never move a card that is already on screen. New
 * provider identities append after the current visit composition. Curated
 * originals are deliberately not reinserted after an initial composition.
 */
export function appendDiscoverVisitComposition<T extends DiscoverVisitEntry>({
  current,
  curated: _curated,
  remote,
}: {
  current: readonly T[];
  curated: readonly T[];
  remote: readonly T[];
}): T[] {
  void _curated;
  const currentEntries = dedupeByKey(current);
  const known = new Set(currentEntries.map((entry) => entry.key));
  const appended = dedupeByKey(remote).filter((entry) => !known.has(entry.key));
  return [...currentEntries, ...appended];
}

/**
 * Reconcile source updates into the active visit. A new visit deliberately
 * composes both sources; a same-visit update may only append newly loaded
 * provider cards and must never move an already visible card.
 */
export function reconcileDiscoverVisitComposition<
  T extends DiscoverVisitEntry,
>({
  current,
  curated,
  remote,
  seed,
}: DiscoverVisitCompositionInput<T> & {
  current: DiscoverVisitComposition<T> | null;
}): DiscoverVisitComposition<T> {
  if (!current || current.seed !== seed) {
    return {
      seed,
      entries: createDiscoverVisitComposition({ curated, remote, seed }),
    };
  }
  return {
    seed,
    entries: appendDiscoverVisitComposition({
      current: current.entries,
      curated,
      remote,
    }),
  };
}

/** Generates an opaque per-app-session salt; all ordering after this is deterministic. */
export function createDiscoverVisitSessionSalt(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(2);
    cryptoApi.getRandomValues(values);
    return `${values[0].toString(36)}${values[1].toString(36)}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
