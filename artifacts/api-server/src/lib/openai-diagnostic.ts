import { openai } from "@workspace/integrations-openai-ai-server";
import { withAiProviderDeadline } from "./ai-provider.js";
import { logger, safeErrorDetails } from "./logger.js";

const DIAGNOSTIC_FLAG = "1";
const DIAGNOSTIC_TIMEOUT_MS = 15_000;
const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

let diagnosticStarted = false;

type DiagnosticResult = {
  model: string;
  variant: string;
  success: boolean;
  errorStatus?: number;
  errorType?: string;
  errorCode?: string;
};

function resultFor(
  model: string,
  variant: string,
  error?: unknown,
): DiagnosticResult {
  if (!error) return { model, variant, success: true };
  const details = safeErrorDetails(error);
  return {
    model,
    variant,
    success: false,
    ...(details.errorStatus === undefined
      ? {}
      : { errorStatus: details.errorStatus }),
    ...(details.errorType === undefined
      ? {}
      : { errorType: details.errorType }),
    ...(details.errorCode === undefined
      ? {}
      : { errorCode: details.errorCode }),
  };
}

const syntheticText = (length: number) => "synthetic-context ".repeat(Math.ceil(length / 18)).slice(0, length);

async function probeCoachVariant(
  variant: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxCompletionTokens: number,
): Promise<DiagnosticResult> {
  const model = "gpt-5.4-mini";
  try {
    await withAiProviderDeadline(
      (signal) =>
        openai.chat.completions.create(
          { model, max_completion_tokens: maxCompletionTokens, messages },
          { signal },
        ),
      DIAGNOSTIC_TIMEOUT_MS,
    );
    return resultFor(model, variant);
  } catch (error) {
    return resultFor(model, variant, error);
  }
}

async function probeVisionVariant(
  variant: string,
  systemText: string,
  userText: string,
  detail: "low" | "high" | undefined,
  maxCompletionTokens: number,
): Promise<DiagnosticResult> {
  const model = "gpt-5.6-terra";
  try {
    await withAiProviderDeadline(
      (signal) =>
        openai.chat.completions.create(
          {
            model,
            max_completion_tokens: maxCompletionTokens,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemText },
              {
                role: "user",
                content: [
                  { type: "text", text: userText },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`,
                      ...(detail ? { detail } : {}),
                    },
                  },
                ],
              },
            ],
          },
          { signal },
        ),
      DIAGNOSTIC_TIMEOUT_MS,
    );
    return resultFor(model, variant);
  } catch (error) {
    return resultFor(model, variant, error);
  }
}

async function runRequestShapeVariants(): Promise<DiagnosticResult[]> {
  const coachSystem = syntheticText(5000);
  const coachSnapshot = `SERVER_OWNED_SNAPSHOT:\n${syntheticText(2000)}`;
  const coachHistory = Array.from({ length: 8 }, (_, index) => ({
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: syntheticText(700),
  }));
  const coachResults = [
    await probeCoachVariant(
      "coach-minimal-max700",
      [{ role: "user", content: "Reply with OK." }],
      700,
    ),
    await probeCoachVariant(
      "coach-long-system",
      [
        { role: "system", content: coachSystem },
        { role: "user", content: "Reply with OK." },
      ],
      700,
    ),
    await probeCoachVariant(
      "coach-snapshot-and-history",
      [
        { role: "system", content: `${coachSystem}\n${coachSnapshot}` },
        ...coachHistory,
      ],
      700,
    ),
  ];

  const visionResults = [
    await probeVisionVariant(
      "vision-json-low-max2048",
      "Return a JSON object with an empty items array.",
      "Identify the visible item.",
      "low",
      2048,
    ),
    await probeVisionVariant(
      "vision-json-high-max2048",
      "Return a JSON object with an empty items array.",
      "Identify the visible item.",
      "high",
      2048,
    ),
    await probeVisionVariant(
      "vision-realistic-high-max4096",
      syntheticText(5000),
      syntheticText(1000),
      "high",
      4096,
    ),
  ];

  return [...coachResults, ...visionResults];
}

/** Runs once only when explicitly enabled; never exposes prompts, bodies, or credentials. */
export async function runOneTimeOpenAiDiagnostic(): Promise<void> {
  if (
    diagnosticStarted ||
    process.env.CALORA_OPENAI_DIAGNOSTIC_ONCE !== DIAGNOSTIC_FLAG
  ) {
    return;
  }
  diagnosticStarted = true;
  const results = await runRequestShapeVariants();
  for (const result of results) {
    logger.warn(
      { event: "openai_request_shape_diagnostic", ...result },
      "OpenAI request-shape diagnostic result",
    );
  }
}
