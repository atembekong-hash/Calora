export type BudgetRun = {
  benchmarkId: string;
  estimatedCostUsd: number;
  recordedAt: string;
};

export type BudgetPending = {
  benchmarkId: string;
  reservationUsd: number;
  reservedAt: string;
};

export type DirectVisionBudgetLedger = {
  schemaVersion: 1;
  budgetUsd: number;
  recordedCostUsd: number;
  runs: BudgetRun[];
  pending: BudgetPending[];
  halted?: { benchmarkId: string; reason: string; haltedAt: string };
};

function finiteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function createBudgetLedger(budgetUsd: number): DirectVisionBudgetLedger {
  if (!finiteNonNegative(budgetUsd) || budgetUsd <= 0) throw new Error("Budget must be a positive finite number");
  return { schemaVersion: 1, budgetUsd, recordedCostUsd: 0, runs: [], pending: [] };
}

export function validateBudgetLedger(value: unknown, expectedBudgetUsd: number): DirectVisionBudgetLedger {
  if (!value || typeof value !== "object") throw new Error("Budget ledger is not an object");
  const ledger = value as Partial<DirectVisionBudgetLedger>;
  if (ledger.schemaVersion !== 1) throw new Error("Unsupported or damaged budget ledger schema");
  if (!finiteNonNegative(ledger.budgetUsd) || ledger.budgetUsd !== expectedBudgetUsd) throw new Error("Budget ledger limit does not match the configured limit");
  if (!finiteNonNegative(ledger.recordedCostUsd) || !Array.isArray(ledger.runs) || !Array.isArray(ledger.pending)) throw new Error("Budget ledger fields are damaged");
  if (ledger.halted !== undefined && (!ledger.halted || typeof ledger.halted.benchmarkId !== "string" || typeof ledger.halted.reason !== "string" || typeof ledger.halted.haltedAt !== "string")) throw new Error("Budget ledger halt marker is damaged");

  const runIds = new Set<string>();
  let runTotal = 0;
  for (const run of ledger.runs) {
    if (!run || typeof run !== "object" || typeof run.benchmarkId !== "string" || !run.benchmarkId || !finiteNonNegative(run.estimatedCostUsd) || typeof run.recordedAt !== "string") throw new Error("Budget ledger contains a damaged completed run");
    if (runIds.has(run.benchmarkId)) throw new Error(`Budget ledger duplicates completed run ${run.benchmarkId}`);
    runIds.add(run.benchmarkId);
    runTotal += run.estimatedCostUsd;
  }
  if (Math.abs(runTotal - ledger.recordedCostUsd) > 1e-9) throw new Error("Budget ledger total does not match completed runs");

  const pendingIds = new Set<string>();
  let pendingTotal = 0;
  for (const pending of ledger.pending) {
    if (!pending || typeof pending !== "object" || typeof pending.benchmarkId !== "string" || !pending.benchmarkId || !finiteNonNegative(pending.reservationUsd) || pending.reservationUsd <= 0 || typeof pending.reservedAt !== "string") throw new Error("Budget ledger contains a damaged pending reservation");
    if (pendingIds.has(pending.benchmarkId) || runIds.has(pending.benchmarkId)) throw new Error(`Budget ledger overlaps benchmark ${pending.benchmarkId}`);
    pendingIds.add(pending.benchmarkId);
    pendingTotal += pending.reservationUsd;
  }
  if (ledger.recordedCostUsd + pendingTotal > ledger.budgetUsd + 1e-9) throw new Error("Budget ledger exceeds its configured limit");
  return ledger as DirectVisionBudgetLedger;
}

export function reserveBudget(ledger: DirectVisionBudgetLedger, benchmarkId: string, reservationUsd: number): void {
  if (!benchmarkId || !finiteNonNegative(reservationUsd) || reservationUsd <= 0) throw new Error("Invalid budget reservation");
  const alreadyUsed = ledger.recordedCostUsd + ledger.pending.reduce((sum, item) => sum + item.reservationUsd, 0);
  if (alreadyUsed + reservationUsd > ledger.budgetUsd + 1e-9) throw new Error(`Budget reservation for ${benchmarkId} would exceed the configured limit`);
  if (ledger.runs.some((run) => run.benchmarkId === benchmarkId) || ledger.pending.some((item) => item.benchmarkId === benchmarkId)) throw new Error(`Benchmark ${benchmarkId} is already completed or reserved`);
  ledger.pending.push({ benchmarkId, reservationUsd, reservedAt: new Date().toISOString() });
}

export function recordBudget(ledger: DirectVisionBudgetLedger, benchmarkId: string, estimatedCostUsd: number): boolean {
  if (!finiteNonNegative(estimatedCostUsd)) throw new Error(`Missing or invalid provider cost for ${benchmarkId}`);
  const pendingIndex = ledger.pending.findIndex((item) => item.benchmarkId === benchmarkId);
  if (pendingIndex < 0) throw new Error(`No pending reservation exists for ${benchmarkId}`);
  const nextTotal = ledger.recordedCostUsd + estimatedCostUsd;
  if (nextTotal > ledger.budgetUsd + 1e-9) throw new Error(`Recorded cost for ${benchmarkId} exceeds the configured budget`);
  const reservation = ledger.pending[pendingIndex];
  ledger.pending.splice(pendingIndex, 1);
  ledger.recordedCostUsd = nextTotal;
  ledger.runs.push({ benchmarkId, estimatedCostUsd, recordedAt: new Date().toISOString() });
  return estimatedCostUsd > reservation.reservationUsd + 1e-9;
}
