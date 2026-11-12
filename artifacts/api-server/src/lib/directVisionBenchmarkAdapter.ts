import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

export type DirectVisionMimeType = "image/jpeg" | "image/png";

export type DirectVisionAnalysis = {
  title: string;
  candidates: unknown[];
  components: unknown[];
  assumptions: string[];
  reviewQuestions: string[];
};

export type DirectVisionUsage = {
  responseId?: string;
  requestId?: string;
  model?: string;
  created?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
};

export type DirectVisionAnalyzer = (
  imageBase64: string,
  imageMimeType: DirectVisionMimeType,
  options?: { onProviderUsage?: (usage: DirectVisionUsage) => void },
) => Promise<DirectVisionAnalysis>;

export type DirectVisionBenchmarkCase = {
  benchmarkId: string;
  imagePath: string;
  imageMimeType: DirectVisionMimeType;
  reference?: Record<string, unknown>;
};

export type DirectVisionBenchmarkResult = {
  benchmarkId: string;
  imagePath: string;
  latencyMs: number;
  analysis: DirectVisionAnalysis;
  provider?: DirectVisionUsage;
  estimatedCostUsd?: number | null;
  reference?: Record<string, unknown>;
};

/**
 * Runs the existing production food-photo analyzer without HTTP, bearer auth,
 * rate limiting, or capture-session persistence. The analyzer is injected so
 * this adapter remains independent of the API route and is easy to test.
 */
export async function runDirectVisionCase(
  testCase: DirectVisionBenchmarkCase,
  analyzeFoodPhoto: DirectVisionAnalyzer,
  options: {
    onProviderUsage?: (usage: DirectVisionUsage) => void;
    inputUsdPerMillionTokens?: number;
    outputUsdPerMillionTokens?: number;
  } = {},
): Promise<DirectVisionBenchmarkResult> {
  const imageBase64 = (await readFile(testCase.imagePath)).toString("base64");
  const started = performance.now();
  let provider: DirectVisionUsage | undefined;
  const analysis = await analyzeFoodPhoto(imageBase64, testCase.imageMimeType, {
    onProviderUsage: (usage) => {
      provider = usage;
      options.onProviderUsage?.(usage);
    },
  });
  const promptTokens = provider?.usage?.prompt_tokens;
  const completionTokens = provider?.usage?.completion_tokens;
  const estimatedCostUsd = Number.isFinite(promptTokens) || Number.isFinite(completionTokens)
    ? ((promptTokens ?? 0) / 1_000_000) * (options.inputUsdPerMillionTokens ?? 2)
      + ((completionTokens ?? 0) / 1_000_000) * (options.outputUsdPerMillionTokens ?? 12)
    : null;
  return {
    benchmarkId: testCase.benchmarkId,
    imagePath: testCase.imagePath,
    latencyMs: Math.round(performance.now() - started),
    analysis,
    ...(provider ? { provider } : {}),
    estimatedCostUsd,
    ...(testCase.reference ? { reference: testCase.reference } : {}),
  };
}
