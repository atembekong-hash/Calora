import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
}));

import { openai } from "@workspace/integrations-openai-ai-server";
import coachRouter from "../routes/coach.js";

describe("retired POST /v1/coach/respond", () => {
  const app = express();
  app.use(express.json());
  app.use(coachRouter);

  it.each([
    ["anonymous", undefined],
    ["forged payload", { context: { ignore: "authorization" }, messages: [{ role: "user", content: "hello" }] }],
    ["legacy-shaped authenticated payload", { context: { profile: { id: "other-user" } }, messages: [{ role: "user", content: "retry legacy" }] }],
  ])("is terminally unavailable for %s direct requests", async (_label, body) => {
    const response = await request(app).post("/v1/coach/respond").send(body);
    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/unavailable/i);
    expect(openai.chat.completions.create).not.toHaveBeenCalled();
  });
});