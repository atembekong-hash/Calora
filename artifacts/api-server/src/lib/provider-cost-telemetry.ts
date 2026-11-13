export type ProviderFeature =
  | "photo_scan"
  | "barcode_scan"
  | "nutrition_label_scan"
  | "voice_log"
  | "text_log"
  | "receipt_scan"
  | "coach"
  | "recipe_creation"
  | "meal_planner";

export type ProviderUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
};

export type ProviderUsageEvent = {
  feature: ProviderFeature;
  provider: "openai";
  model: string;
  elapsedMs: number;
  succeeded: boolean;
  usage?: ProviderUsage | null;
  inputBytes?: number;
  audioBytes?: number;
  estimatedCostUsd?: number;
};

type TelemetryLogger = {
  info: (payload: Record<string, unknown>, message: string) => void;
};

const defaultTelemetryLogger: TelemetryLogger = {
  info(payload, message) {
    // Keep the fallback database-independent so tests and degraded startup can
    // measure provider calls without requiring application persistence.
    console.info(message, payload);
  },
};

// These are published OpenAI rates for gpt-5.4-mini. Terra is intentionally
// not assigned a token rate here: Calora has a measured benchmark proxy for it,
// but not a verified managed-gateway production price.
const TOKEN_PRICES_PER_MILLION: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
};

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

export function estimateProviderCostUsd(
  model: string,
  usage?: ProviderUsage | null,
): number | undefined {
  const prices = TOKEN_PRICES_PER_MILLION[model];
  if (!prices || !usage) return undefined;
  const input =
    finiteNonNegative(usage.prompt_tokens ?? usage.input_tokens) ?? 0;
  const output =
    finiteNonNegative(usage.completion_tokens ?? usage.output_tokens) ?? 0;
  return Number(
    ((input * prices.input + output * prices.output) / 1_000_000).toFixed(8),
  );
}

/**
 * Emits only bounded operational aggregates. It deliberately excludes user IDs,
 * prompts, provider bodies, response IDs, audio contents, and image contents.
 * Observability must never turn a successful provider request into a failure.
 */
export function recordProviderUsage(
  event: Omit<ProviderUsageEvent, "provider" | "estimatedCostUsd">,
  outputLogger: TelemetryLogger = defaultTelemetryLogger,
): void {
  try {
    const usage = event.usage ?? undefined;
    outputLogger.info(
      {
        event: "calora_provider_usage",
        provider: "openai",
        feature: event.feature,
        model: event.model,
        elapsedMs: Math.max(0, Math.round(event.elapsedMs)),
        succeeded: event.succeeded,
        promptTokens: finiteNonNegative(
          usage?.prompt_tokens ?? usage?.input_tokens,
        ),
        completionTokens: finiteNonNegative(
          usage?.completion_tokens ?? usage?.output_tokens,
        ),
        totalTokens: finiteNonNegative(usage?.total_tokens),
        inputBytes: finiteNonNegative(event.inputBytes),
        audioBytes: finiteNonNegative(event.audioBytes),
        estimatedCostUsd: estimateProviderCostUsd(event.model, usage),
      },
      "Calora provider usage recorded",
    );
  } catch {
    // Cost telemetry is advisory and must never affect the user operation.
  }
}

/** Record third-party lookup counts without storing barcodes or result data. */
export function recordExternalLookup(
  input: {
    feature: "barcode_scan";
    provider: "open_food_facts" | "fatsecret" | "usda";
    elapsedMs: number;
    succeeded: boolean;
  },
  outputLogger: TelemetryLogger = defaultTelemetryLogger,
): void {
  try {
    outputLogger.info(
      {
        event: "calora_external_lookup",
        feature: input.feature,
        provider: input.provider,
        elapsedMs: Math.max(0, Math.round(input.elapsedMs)),
        succeeded: input.succeeded,
      },
      "Calora external lookup recorded",
    );
  } catch {
    // Observability must never affect the lookup result.
  }
}
