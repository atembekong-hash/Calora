import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runDirectVisionCase,
  type DirectVisionAnalysis,
} from "../lib/directVisionBenchmarkAdapter.js";

const analysis: DirectVisionAnalysis = {
  title: "Synthetic test meal",
  candidates: [],
  components: [],
  assumptions: [],
  reviewQuestions: [],
};

describe("direct vision benchmark adapter", () => {
  it("passes the local image to the injected analyzer and preserves reference data", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calora-direct-vision-"));
    const imagePath = join(directory, "meal.jpg");
    const imageBytes = Buffer.from("synthetic-image-bytes");
    await writeFile(imagePath, imageBytes);
    const analyzer = vi.fn(async (base64: string, mime: "image/jpeg" | "image/png") => {
      expect(Buffer.from(base64, "base64")).toEqual(imageBytes);
      expect(mime).toBe("image/jpeg");
      return analysis;
    });

    try {
      const result = await runDirectVisionCase(
        {
          benchmarkId: "synthetic-001",
          imagePath,
          imageMimeType: "image/jpeg",
          reference: { calories: 500, nutritionStatus: "verified" },
        },
        analyzer,
      );

      expect(analyzer).toHaveBeenCalledOnce();
      expect(result).toMatchObject({
        benchmarkId: "synthetic-001",
        imagePath,
        analysis,
        reference: { calories: 500, nutritionStatus: "verified" },
      });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not mutate or persist the benchmark image", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calora-direct-vision-"));
    const imagePath = join(directory, "meal.png");
    await writeFile(imagePath, Buffer.from("png-placeholder"));
    const analyzer = vi.fn(async () => analysis);

    try {
      await runDirectVisionCase(
        { benchmarkId: "synthetic-002", imagePath, imageMimeType: "image/png" },
        analyzer,
      );
      await expect(readFile(imagePath, "utf8")).resolves.toBe("png-placeholder");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("records provider usage and computes the documented token-price estimate", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calora-direct-vision-"));
    const imagePath = join(directory, "meal.jpg");
    await writeFile(imagePath, Buffer.from("usage-image"));
    const analyzer = vi.fn(async (_base64: string, _mime: "image/jpeg" | "image/png", options?: { onProviderUsage?: (usage: { usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }) => void }) => {
      options?.onProviderUsage?.({ usage: { prompt_tokens: 1_000_000, completion_tokens: 100_000, total_tokens: 1_100_000 } });
      return analysis;
    });

    try {
      const result = await runDirectVisionCase({ benchmarkId: "usage-001", imagePath, imageMimeType: "image/jpeg" }, analyzer, {
        inputUsdPerMillionTokens: 2,
        outputUsdPerMillionTokens: 12,
      });
      expect(result.provider?.usage?.total_tokens).toBe(1_100_000);
      expect(result.estimatedCostUsd).toBeCloseTo(3.2, 8);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
