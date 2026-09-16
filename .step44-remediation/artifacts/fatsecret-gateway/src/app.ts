import crypto from "node:crypto";
import express, { type Express, type Request, type Response } from "express";
import pino from "pino";

const fatSecretApi = "https://platform.fatsecret.com/rest";
const fatSecretTokenUrl = "https://oauth.fatsecret.com/connect/token";

export type GatewayConfig = {
  clientId: string;
  clientSecret: string;
  gatewaySecret: string;
  timeoutMs: number;
};

type GatewayError = {
  code: string;
  message: string;
  status: number;
};

type Token = { value: string; expiresAt: number };
type SanitizedLogger = { warn: (bindings: Record<string, unknown>, message: string) => void };

function configuredTimeout(value: string | undefined) {
  const parsed = Number(value ?? 8_000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8_000;
}

export function configFromEnv(): GatewayConfig {
  const clientId = process.env.FATSECRET_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET?.trim() ?? "";
  const gatewaySecret = process.env.CALORA_GATEWAY_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret || !gatewaySecret) {
    throw new Error("Missing FATSECRET_CLIENT_ID, FATSECRET_CLIENT_SECRET, or CALORA_GATEWAY_SECRET");
  }
  return { clientId, clientSecret, gatewaySecret, timeoutMs: configuredTimeout(process.env.FATSECRET_PROVIDER_TIMEOUT_MS) };
}

function secretMatches(received: string | undefined, expected: string) {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function providerError(code: string, message: string, status: number): GatewayError {
  return { code, message, status };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizedProviderError(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.error)) return null;
  const rawCode = payload.error.code;
  const code = typeof rawCode === "string" || typeof rawCode === "number" ? rawCode : "provider_error";
  return { error: { code, message: "FatSecret provider rejected the request." } };
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw providerError("invalid_request", `${field} is required.`, 400);
  return value.trim();
}

function optionalString(value: unknown, field: string, maxLength: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maxLength) throw providerError("invalid_request", `${field} is invalid.`, 400);
  return value.trim();
}

function boundedInteger(value: unknown, field: string, min: number, max: number) {
  if (!Number.isInteger(value) || typeof value !== "number" || value < min || value > max) {
    throw providerError("invalid_request", `${field} must be an integer between ${min} and ${max}.`, 400);
  }
  return value;
}

class FatSecretClient {
  private token: Token | null = null;
  private tokenRequest: Promise<string> | null = null;

  constructor(private readonly config: GatewayConfig, private readonly log: SanitizedLogger) {}

  private async accessToken() {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;
    if (this.tokenRequest) return this.tokenRequest;
    this.tokenRequest = this.requestToken().finally(() => { this.tokenRequest = null; });
    return this.tokenRequest;
  }

  private async requestToken() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");
      const response = await fetch(fatSecretTokenUrl, {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials&scope=basic%20premier",
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null) as { access_token?: unknown; expires_in?: unknown } | null;
      if (!response.ok || !body || typeof body.access_token !== "string") {
        throw providerError("token_unavailable", "FatSecret token acquisition failed.", response.status || 502);
      }
      const expiresIn = typeof body.expires_in === "number" && Number.isFinite(body.expires_in) ? body.expires_in : 3_600;
      this.token = { value: body.access_token, expiresAt: Date.now() + Math.max(60, expiresIn) * 1_000 };
      return this.token.value;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw providerError("timeout", "FatSecret token request timed out.", 504);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async request(path: string, params: Record<string, string | number>) {
    const token = await this.accessToken();
    const url = new URL(`${fatSecretApi}${path}`);
    Object.entries({ format: "json", ...params }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      const payload = await response.json().catch(() => null);
      if (!payload) throw providerError("invalid_response", "FatSecret returned an invalid response.", 502);
      const providerFailure = sanitizedProviderError(payload);
      if (providerFailure) return providerFailure;
      if (!response.ok) throw providerError("upstream_http_error", "FatSecret request failed.", response.status);
      return payload;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw providerError("timeout", "FatSecret request timed out.", 504);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

function gatewayFailure(error: unknown, log: SanitizedLogger) {
  const gatewayError = isRecord(error) && typeof error.code === "string" && typeof error.message === "string" && typeof error.status === "number"
    ? error as GatewayError
    : providerError("upstream_error", "FatSecret gateway request failed.", 502);
  log.warn({ code: gatewayError.code, status: gatewayError.status }, "FatSecret gateway request failed");
  return gatewayError;
}

export function createGatewayApp(config: GatewayConfig) {
  const app = express();
  const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
  const client = new FatSecretClient(config, log);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/fatsecret", (req, res, next) => {
    if (!secretMatches(req.header("x-calora-gateway-secret"), config.gatewaySecret)) {
      res.status(401).json({ error: { code: "unauthorized", message: "Unauthorized gateway request." } });
      return;
    }
    next();
  });

  const execute = async (req: Request, res: Response, buildRequest: () => { path: string; params: Record<string, string | number> }) => {
    try {
      if (!isRecord(req.body)) throw providerError("invalid_request", "A JSON request body is required.", 400);
      const request = buildRequest();
      const payload = await client.request(request.path, request.params);
      res.status(200).json(payload);
    } catch (error) {
      const failure = gatewayFailure(error, log);
      res.status(failure.status).json({ error: { code: failure.code, message: failure.message } });
    }
  };

  app.post("/fatsecret/recipes/search", (req, res) => execute(req, res, () => {
    const body = req.body as Record<string, unknown>;
    const limit = boundedInteger(body.limit, "limit", 1, 30);
    const offset = boundedInteger(body.offset, "offset", 0, Number.MAX_SAFE_INTEGER);
    const query = optionalString(body.query, "query", 120);
    const category = optionalString(body.category, "category", 80);
    return { path: "/recipes/search/v3", params: { search_expression: query || category || "", max_results: limit, page_number: Math.floor(offset / limit) } };
  }));

  app.post("/fatsecret/recipes/detail", (req, res) => execute(req, res, () => {
    const sourceId = requiredString((req.body as Record<string, unknown>).sourceId, "sourceId").replace(/^premium:FatSecret:/, "");
    return { path: "/recipe/v2", params: { recipe_id: sourceId } };
  }));

  app.post("/fatsecret/foods/search", (req, res) => execute(req, res, () => {
    const body = req.body as Record<string, unknown>;
    const limit = boundedInteger(body.limit, "limit", 1, 30);
    const offset = boundedInteger(body.offset, "offset", 0, Number.MAX_SAFE_INTEGER);
    const query = requiredString(body.query, "query");
    if (query.length > 120) throw providerError("invalid_request", "query is invalid.", 400);
    return { path: "/foods/search/v5", params: { search_expression: query, max_results: limit, page_number: Math.floor(offset / limit), food_type: "brand" } };
  }));

  app.post("/fatsecret/foods/detail", (req, res) => execute(req, res, () => {
    const sourceId = requiredString((req.body as Record<string, unknown>).sourceId, "sourceId").replace(/^fatsecret-food:/, "");
    return { path: "/food/v4", params: { food_id: sourceId } };
  }));

  return app;
}