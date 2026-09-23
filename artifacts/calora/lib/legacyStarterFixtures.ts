import type { CaloraState, FoodLog } from '@/context/CaloraContext';

/**
 * Exact signatures of the three historical production starter rows. Dates are
 * intentionally excluded because the old bundle stamped the local launch day.
 * A row is removed only when every other fixture field still matches; a user
 * row that merely reuses a starter id is preserved.
 */
const LEGACY_STARTER_LOG_SIGNATURES: ReadonlyArray<Readonly<Omit<FoodLog, 'date'>>> = [
  {
    id: 'starter-oats',
    name: 'Overnight oats with berries',
    meal: 'Breakfast',
    calories: 420,
    protein: 18,
    carbs: 58,
    fat: 14,
    fiber: 8,
    sugar: 19,
    sodium: 180,
    source: 'USDA verified',
    confidence: 98,
    time: '8:10 AM',
    serving: '1 bowl',
    preparation: 'Ready to eat',
  },
  {
    id: 'starter-salad',
    name: 'Chicken harvest salad',
    meal: 'Lunch',
    calories: 510,
    protein: 38,
    carbs: 34,
    fat: 25,
    fiber: 7,
    sugar: 8,
    sodium: 620,
    source: 'Brand verified',
    confidence: 95,
    time: '12:45 PM',
    serving: '1 bowl',
    preparation: 'Fresh',
  },
  {
    id: 'starter-apple',
    name: 'Honeycrisp apple',
    meal: 'Snack',
    calories: 95,
    protein: 0,
    carbs: 25,
    fat: 0,
    fiber: 4,
    sugar: 19,
    sodium: 2,
    source: 'USDA verified',
    confidence: 99,
    time: '3:20 PM',
    serving: '1 medium',
    preparation: 'Raw',
  },
];

function isExactLegacyStarterLog(log: FoodLog): boolean {
  const fixture = LEGACY_STARTER_LOG_SIGNATURES.find((candidate) => candidate.id === log.id);
  if (!fixture || !/^\d{4}-\d{2}-\d{2}$/.test(log.date)) return false;
  const comparableLog = { ...log } as Partial<FoodLog>;
  delete comparableLog.date;
  return Object.keys(comparableLog).length === Object.keys(fixture).length
    && Object.entries(fixture).every(([key, value]) => comparableLog[key as keyof FoodLog] === value);
}

/**
 * Removes only bundled starter fixtures from persisted state. Any row with a
 * changed field or a user-created identifier remains intact, and every direct
 * derivative of a removed starter row is cleaned with it.
 */
export function removeExactLegacyStarterFixtures(saved: Partial<CaloraState>): Partial<CaloraState> {
  const logs = saved.logs ?? [];
  const exactFixtureLogIds = new Set(
    logs.filter(isExactLegacyStarterLog).map((log) => log.id),
  );
  if (!exactFixtureLogIds.size) return saved;

  // A historic fixture id is safe to remove from dependent collections only
  // when every row carrying that id is still the exact bundled fixture. A
  // repaired/edited user row can retain a legacy id, so its derivatives must
  // survive even while the exact duplicate fixture row is removed.
  const removableFixtureLogIds = new Set(
    [...exactFixtureLogIds].filter((id) =>
      logs.filter((log) => log.id === id).every(isExactLegacyStarterLog),
    ),
  );

  const fixtureMemoryIds = new Set(
    (saved.foodMemories ?? [])
      .filter((memory) => removableFixtureLogIds.has(memory.diaryLogId))
      .map((memory) => memory.id),
  );
  const livingMemory = saved.livingMemory
    ? {
        ...saved.livingMemory,
        mealObservations: Object.fromEntries(
          Object.entries(saved.livingMemory.mealObservations ?? {})
            .filter(([id]) => !removableFixtureLogIds.has(id)),
        ),
        forgotten: saved.livingMemory.forgotten
          ? {
              ...saved.livingMemory.forgotten,
              meals: saved.livingMemory.forgotten.meals.filter((id) => !removableFixtureLogIds.has(id)),
            }
          : saved.livingMemory.forgotten,
      }
    : saved.livingMemory;

  return {
    ...saved,
    logs: logs.filter((log) => !isExactLegacyStarterLog(log)),
    foodDrafts: saved.foodDrafts ?? [],
    foodMemories: (saved.foodMemories ?? []).filter((memory) => !removableFixtureLogIds.has(memory.diaryLogId)),
    repeatPatterns: (saved.repeatPatterns ?? []).filter((pattern) => !fixtureMemoryIds.has(pattern.sourceMemoryId)),
    memoryCorrections: (saved.memoryCorrections ?? []).filter((correction) => !fixtureMemoryIds.has(correction.memoryId)),
    livingMemory,
  };
}
