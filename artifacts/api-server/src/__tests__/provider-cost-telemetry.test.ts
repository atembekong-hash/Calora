import { describe, expect, it, vi } from "vitest";
import {
  estimateProviderCostUsd,
  recordProviderUsage,
} from "../lib/provider-cost-telemetry.js";

describe("provider cost telemetry", () => {
  it("estimates published gpt-5.4-mini token cost without rounding away small calls", () => {
    expect(
      estimateProviderCostUsd("gpt-5.4-mini", {
        prompt_tokens: 1_000,
        completion_tokens: 2_000,
      }),
    ).toBe(0.00975);
  });

  it("does not invent a production price for the measured Terra proxy", () => {
    expect(
      estimateProviderCostUsd("gpt-5.6-terra", {
        prompt_tokens: 10_000,
        completion_tokens: 2_000,
      }),
    ).toBeUndefined();
  });

  it("emits bounded aggregates and never includes identifiers or content", () => {
    const info = vi.fn();
    recordProviderUsage(
      {
        feature: "voice_log",
        model: "gpt-4o-mini-transcribe",
        elapsedMs: 123.6,
        succeeded: true,
        audioBytes: 4096,
      },
      { info },
    );
    expect(info).toHaveBeenCalledOnce();
    const [payload] = info.mock.calls[0] as [
      { event: string; feature: string; audioBytes: number },
    ];
    expect(payload).toEqual(
      expect.objectContaining({
        event: "calora_provider_usage",
        feature: "voice_log",
        audioBytes: 4096,
      }),
    );
    expect(JSON.stringify(payload)).not.toMatch(
      /user|prompt|response|secret|audio contents/i,
    );
  });

  it("swallows logger failures", () => {
    expect(() =>
      recordProviderUsage(
        {
          feature: "photo_scan",
          model: "gpt-5.6-terra",
          elapsedMs: 1,
          succeeded: false,
        },
        {
          info: () => {
            throw new Error("logger unavailable");
          },
        },
      ),
    ).not.toThrow();
  });
});
