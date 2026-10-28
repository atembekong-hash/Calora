import { isValidCanonicalWeightKg } from "@/lib/weightInput";

export type ProgressWeightSource = "manual" | "health";

export type ProgressWeightRecord = {
  id?: string;
  date: string;
  kg: number;
  source?: ProgressWeightSource;
};

export type ProgressWeightDisplay =
  | {
      kind: "record";
      kg: number;
      record: ProgressWeightRecord;
      sourceLabel: string;
      ageDays: number | null;
      isStale: boolean;
    }
  | {
      kind: "baseline";
      kg: number;
      sourceLabel: "Onboarding baseline";
      ageDays: null;
      isStale: false;
    }
  | {
      kind: "empty";
      kg: null;
      sourceLabel: null;
      ageDays: null;
      isStale: false;
    };

export type ProgressWeightSummary = {
  /** Valid recorded weigh-ins, ordered oldest to newest without mutating persistence data. */
  records: ProgressWeightRecord[];
  firstRecord: ProgressWeightRecord | null;
  latestRecord: ProgressWeightRecord | null;
  /** Change across recorded entries only; null means that a trend is not yet supported by records. */
  trendDeltaKg: number | null;
  display: ProgressWeightDisplay;
};

function isCalendarDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function dayDistance(from: string, to: string): number | null {
  if (!isCalendarDateKey(from) || !isCalendarDateKey(to)) return null;
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  return Math.round(
    (Date.UTC(toYear, toMonth - 1, toDay) -
      Date.UTC(fromYear, fromMonth - 1, fromDay)) /
      86_400_000,
  );
}

/** Describes a known weight source without inferring a source for legacy or unlabelled records. */
export function progressWeightSourceLabel(
  source: ProgressWeightRecord["source"],
  healthProvider?: "health-connect" | "healthkit" | "unsupported",
): string {
  if (source === "manual") return "Manual check-in";
  if (source === "health") {
    if (healthProvider === "healthkit") return "Imported from Apple Health";
    if (healthProvider === "health-connect")
      return "Imported from Health Connect";
    return "Imported from Health";
  }
  return "Recorded weigh-in";
}

/**
 * Creates a UI-safe summary from existing persisted records only. Invalid records
 * are omitted from display rather than repaired, synthesized, or written back.
 */
export function selectProgressWeightSummary(
  entries: readonly ProgressWeightRecord[],
  options: {
    onboardingBaselineKg?: number | null;
    today?: string;
    healthProvider?: "health-connect" | "healthkit" | "unsupported";
    staleAfterDays?: number;
  } = {},
): ProgressWeightSummary {
  const records = entries
    .map((entry, index) => ({ entry, index }))
    .filter(
      ({ entry }) =>
        isCalendarDateKey(entry.date) && isValidCanonicalWeightKg(entry.kg),
    )
    // Stable ties preserve the source-record order where a date has no recorded time.
    .sort(
      (a, b) => a.entry.date.localeCompare(b.entry.date) || a.index - b.index,
    )
    .map(({ entry }) => entry);

  const firstRecord = records[0] ?? null;
  const latestRecord = records.at(-1) ?? null;
  const trendDeltaKg =
    firstRecord && latestRecord && records.length >= 2
      ? latestRecord.kg - firstRecord.kg
      : null;

  if (latestRecord) {
    const ageDays = options.today
      ? dayDistance(latestRecord.date, options.today)
      : null;
    const staleAfterDays = options.staleAfterDays ?? 14;
    return {
      records,
      firstRecord,
      latestRecord,
      trendDeltaKg,
      display: {
        kind: "record",
        kg: latestRecord.kg,
        record: latestRecord,
        sourceLabel: progressWeightSourceLabel(
          latestRecord.source,
          options.healthProvider,
        ),
        ageDays,
        isStale: ageDays !== null && ageDays > staleAfterDays,
      },
    };
  }

  if (isValidCanonicalWeightKg(options.onboardingBaselineKg ?? Number.NaN)) {
    return {
      records,
      firstRecord: null,
      latestRecord: null,
      trendDeltaKg: null,
      display: {
        kind: "baseline",
        kg: options.onboardingBaselineKg!,
        sourceLabel: "Onboarding baseline",
        ageDays: null,
        isStale: false,
      },
    };
  }

  return {
    records,
    firstRecord: null,
    latestRecord: null,
    trendDeltaKg: null,
    display: {
      kind: "empty",
      kg: null,
      sourceLabel: null,
      ageDays: null,
      isStale: false,
    },
  };
}

/** Compact, truthful recency copy for the recorded-weight state. */
export function progressWeightRecencyLabel(
  display: ProgressWeightDisplay,
): string | null {
  if (display.kind !== "record") return null;
  if (display.ageDays === null) return "Recorded weigh-in";
  if (display.ageDays <= 0) return "Recorded today";
  if (display.ageDays === 1) return "Recorded yesterday";
  return `Last recorded ${display.ageDays} days ago`;
}
