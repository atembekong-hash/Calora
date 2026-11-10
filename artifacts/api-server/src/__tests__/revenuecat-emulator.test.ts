import { afterAll, beforeAll, afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { grantPromoDays } from "../lib/revenuecat.js";

describe("Mission 422 loopback RevenueCat emulator", () => {
  let server: Server;
  let origin: string;
  let mode: "success" | "upstream" | "malformed" = "success";
  const idempotencyKeys: string[] = [];
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    origin: process.env.CALORA_TEST_REVENUECAT_V2_ORIGIN,
    allowHttp: process.env.CALORA_TEST_REVENUECAT_ALLOW_HTTP_EMULATOR,
    project: process.env.REVENUECAT_PROJECT_ID,
    secret: process.env.REVENUECAT_SECRET_API_KEY,
  };

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url?.startsWith("/v1/subscribers/") && req.method === "GET") {
        if (mode === "malformed") {
          res.writeHead(200, { "content-type": "application/json" });
          res.end("not-json");
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ subscriber: { entitlements: {} } }));
        return;
      }
      if (req.url?.includes("/promotional") && req.method === "POST") {
        const key = req.headers["idempotency-key"];
        if (typeof key === "string") idempotencyKeys.push(key);
        if (mode === "upstream") {
          res.writeHead(503, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "synthetic upstream failure" }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("emulator did not bind");
    origin = `http://127.0.0.1:${address.port}/`;
    process.env.NODE_ENV = "test";
    process.env.CALORA_TEST_REVENUECAT_V2_ORIGIN = origin;
    process.env.CALORA_TEST_REVENUECAT_ALLOW_HTTP_EMULATOR = "true";
    process.env.REVENUECAT_PROJECT_ID = "mission422-disposable";
    process.env.REVENUECAT_SECRET_API_KEY = "mission422-disposable-key";
  });

  afterEach(() => {
    mode = "success";
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.origin === undefined) delete process.env.CALORA_TEST_REVENUECAT_V2_ORIGIN;
    else process.env.CALORA_TEST_REVENUECAT_V2_ORIGIN = previous.origin;
    if (previous.allowHttp === undefined) delete process.env.CALORA_TEST_REVENUECAT_ALLOW_HTTP_EMULATOR;
    else process.env.CALORA_TEST_REVENUECAT_ALLOW_HTTP_EMULATOR = previous.allowHttp;
    if (previous.project === undefined) delete process.env.REVENUECAT_PROJECT_ID;
    else process.env.REVENUECAT_PROJECT_ID = previous.project;
    if (previous.secret === undefined) delete process.env.REVENUECAT_SECRET_API_KEY;
    else process.env.REVENUECAT_SECRET_API_KEY = previous.secret;
  });

  it("succeeds and forwards the durable attempt idempotency key", async () => {
    await grantPromoDays("synthetic-user", 30, "00000000-0000-4000-8000-000000000001");
    expect(idempotencyKeys).toContain("00000000-0000-4000-8000-000000000001");
  });

  it("surfaces a synthetic provider failure without retrying inside the DB path", async () => {
    mode = "upstream";
    await expect(grantPromoDays("synthetic-user", 30, "00000000-0000-4000-8000-000000000002"))
      .rejects.toThrow(/promo grant failed/);
  });

  it("rejects malformed provider subscriber output", async () => {
    mode = "malformed";
    await expect(grantPromoDays("synthetic-user", 30, "00000000-0000-4000-8000-000000000003"))
      .rejects.toThrow();
  });
});
