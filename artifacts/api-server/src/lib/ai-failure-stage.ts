export type AiFailureStage =
  | "provider"
  | "empty_response"
  | "parse"
  | "normalization";

export class AiFailureStageError extends Error {
  constructor(
    public readonly stage: AiFailureStage,
    public readonly originalError: unknown,
  ) {
    super(`AI request failed during ${stage}`);
    this.name = "AiFailureStageError";
  }
}

export function aiFailureStage(error: unknown): AiFailureStage | undefined {
  return error instanceof AiFailureStageError ? error.stage : undefined;
}

export function aiFailureCause(error: unknown): unknown {
  return error instanceof AiFailureStageError ? error.originalError : error;
}
