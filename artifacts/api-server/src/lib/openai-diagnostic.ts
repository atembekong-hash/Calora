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
  success: boolean;
  errorStatus?: number;
  errorType?: string;
  errorCode?: string;
};

function resultFor(model: string, error?: unknown): DiagnosticResult {
  if (!error) return { model, success: true };
  const details = safeErrorDetails(error);
  return {
    model,
    success: false,
    ...(details.errorStatus === undefined ? {} : { errorStatus: details.errorStatus }),
    ...(details.errorType === undefined ? {} : { errorType: details.errorType }),
    ...(details.errorCode === undefined ? {} : { errorCode: details.errorCode }),
  };
}

async function probeCoachModel(): Promise<DiagnosticResult> {
  const model = "gpt-5.4-mini";
  try {
    await withAiProviderDeadline(
      (signal) =>
        openai.chat.completions.create(
          {
            model,
            max_completion_tokens: 8,
            messages: [{ role: "user", content: "Reply with OK." }],
          },
          { signal },
        ),
      DIAGNOSTIC_TIMEOUT_MS,
    );
    return resultFor(model);
  } catch (error) {
    return resultFor(model, error);
  }
}

async function probeVisionModel(): Promise<DiagnosticResult> {
  const model = "gpt-5.6-terra";
  try {
    await withAiProviderDeadline(
      (signal) =>
        openai.chat.completions.create(
          {
            model,
            max_completion_tokens: 8,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "Return a JSON object with an empty items array." },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`,
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
    return resultFor(model);
  } catch (error) {
    return resultFor(model, error);
  }
}

/** Runs once only when explicitly enabled; never exposes prompts, bodies, or credentials. */
export async function runOneTimeOpenAiDiagnostic(): Promise<void> {
  if (diagnosticStarted || process.env.CALORA_OPENAI_DIAGNOSTIC_ONCE !== DIAGNOSTIC_FLAG) {
    return;
  }
  diagnosticStarted = true;
  const results = await Promise.all([probeCoachModel(), probeVisionModel()]);
  for (const result of results) {
    logger.warn({ event: "openai_one_time_diagnostic", ...result }, "OpenAI diagnostic result");
  }
}
