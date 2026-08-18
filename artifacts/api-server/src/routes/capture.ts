import { Router, type IRouter, type Request } from "express";
import { randomUUID } from "node:crypto";
import { AnalyzeCaptureBody } from "@workspace/api-zod";
import { db, pool, aiCaptureSessionsTable, aiCaptureCandidatesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { BRAND_NAME } from "../lib/brand.js";
import { verifyBearerToken, type VerifiedUser } from "../lib/supabase-auth.js";
import { ensureUserRow } from "../lib/user-rows.js";
import { checkRateLimit } from "../lib/rate-limit.js";

// ---------------------------------------------------------------------------
// DB-backed rate limiter for POST /v1/capture/analyze
//
// Bucket key priority:
//   1. Verified user ID — from a Supabase-validated Bearer token.  This is
//      the only key that cannot be spoofed: the token is verified before the
//      bucket is looked up, so a forged or unsigned JWT falls back to IP.
//   2. req.ip — Express resolves this from the X-Forwarded-For chain using
//      the configured trust proxy depth (set in app.ts).  Clients cannot
//      inject arbitrary entries because the trusted proxy overwrites the
//      outermost hop.
//
// A 1-hour fixed window keeps bursting expensive while staying invisible to
// genuine users logging meals throughout the day.
//
// State is stored in calora_capture_rate_limits (one row per key). A single
// atomic upsert handles reset detection, counter increment, and reads in one
// round-trip, so the limiter is consistent across server restarts and multiple
// instances without any in-process coordination.
// ---------------------------------------------------------------------------
const CAPTURE_RATE_WINDOW_SECS = 60 * 60; // 1 hour
const CAPTURE_RATE_LIMIT = 30; // max requests per window

// Quota enforcement uses the shared persistent limiter (../lib/rate-limit.ts).
// Failure policy: verified users fail OPEN (availability); anonymous/IP-keyed
// callers fail CLOSED so a limiter-store outage can never grant unmetered
// anonymous access to paid provider calls.

/**
 * Clears all persisted rate-limit buckets. Exported for use in tests only.
 * In production the table rows expire naturally when reset_at passes.
 */
export async function resetCaptureRateLimiter(): Promise<void> {
  await pool.query("DELETE FROM calora_capture_rate_limits");
}

/**
 * Resolve a tamper-resistant rate-limit key for the request.
 * Verified user ID is preferred; req.ip (trusted-proxy-resolved) is the fallback.
 */
function rateLimitKey(verifiedUser: VerifiedUser | null, req: Request): string {
  if (verifiedUser) return `user:${verifiedUser.id}`;
  return `ip:${req.ip ?? req.socket?.remoteAddress ?? "unknown"}`;
}

/**
 * Persists a successful analysis as a server-recorded capture session for
 * the authenticated caller. The returned server-issued session id is the
 * only id the diary first-log sync accepts, which anchors referral
 * qualification in a server-verified event instead of a client claim.
 *
 * Accepts a pre-verified user so the route can verify the token once and
 * share the result across rate limiting and session persistence without a
 * second Supabase round-trip.
 *
 * Anonymous or unverifiable requests persist nothing and fall back to the
 * client-provided/random session id (analysis still works, it just cannot
 * qualify a referral).
 */
async function persistCaptureSession(
  user: VerifiedUser | null,
  mode: string,
  candidates: Array<Pick<CaptureCandidate, "name" | "calories" | "proteinG" | "carbsG" | "fatG" | "confidence" | "serving" | "provenance" | "sourceLabel">>,
): Promise<string | null> {
  if (candidates.length === 0) return null;
  if (!user) return null;
  try {
    const userId = await ensureUserRow(user.id, user.email);
    const sessionId = randomUUID();
    await db.insert(aiCaptureSessionsTable).values({ id: sessionId, userId, mode, status: "review" });
    await db.insert(aiCaptureCandidatesTable).values(
      candidates.map((candidate) => ({
        sessionId,
        name: candidate.name,
        calories: String(candidate.calories),
        proteinG: String(candidate.proteinG),
        carbsG: String(candidate.carbsG),
        fatG: String(candidate.fatG),
        confidence: candidate.confidence,
        evidence: {
          serving: candidate.serving,
          provenance: candidate.provenance,
          sourceLabel: candidate.sourceLabel,
        },
      })),
    );
    return sessionId;
  } catch (err) {
    console.error("[capture] failed to persist capture session:", err);
    return null;
  }
}

const router: IRouter = Router();
const OPEN_FOOD_FACTS_ROOT = "https://world.openfoodfacts.org/api/v2";
const USDA_ROOT = "https://api.nal.usda.gov/fdc/v1";
const USDA_KEY = process.env.USDA_FOODDATA_API_KEY ?? "DEMO_KEY";
const VISION_MODEL = "gpt-5.6-terra";
const TEXT_MODEL = "gpt-5.4-mini";
const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const MAX_AUDIO_BYTES = 6 * 1024 * 1024;

type Nutrition = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type CaptureCandidate = Nutrition & {
  id: string;
  name: string;
  brand: string | null;
  serving: string;
  confidence: number;
  provenance: string;
  sourceLabel: string;
  editable: boolean;
};

type ConfidenceDimensions = {
  identity: number;
  portion: number;
  nutritionSource: number;
  preparation: number;
};

type CaptureComponent = CaptureCandidate & {
  componentId: string;
  preparation: string | null;
  included: boolean;
  eatenFraction: number;
  confidenceDimensions: ConfidenceDimensions;
  assumptions: string[];
  nutritionRange: { caloriesLow: number; caloriesHigh: number };
  reviewQuestions: string[];
};

function numberOrZero(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function normalizeBarcode(value: string) {
  return value.replace(/\D/g, "").slice(0, 32);
}

function ensureCandidate(candidate: Partial<CaptureCandidate>, index: number): CaptureCandidate {
  return {
    id: candidate.id || `capture-candidate-${index + 1}`,
    name: candidate.name?.trim() || "Unidentified food",
    brand: candidate.brand?.trim() || null,
    serving: candidate.serving?.trim() || "1 serving",
    calories: numberOrZero(candidate.calories),
    proteinG: numberOrZero(candidate.proteinG),
    carbsG: numberOrZero(candidate.carbsG),
    fatG: numberOrZero(candidate.fatG),
    confidence: Math.min(Math.max(Math.round(numberOrZero(candidate.confidence)), 0), 100),
    provenance: candidate.provenance || "Photo estimate",
    sourceLabel: candidate.sourceLabel || "Managed vision estimate",
    editable: true,
  };
}

function confidence(value: unknown, fallback: number) {
  return Math.min(Math.max(Math.round(numberOrZero(value) || fallback), 0), 100);
}

function ensureComponent(candidate: Partial<CaptureComponent>, index: number, provenance = "Photo estimate"): CaptureComponent {
  const base = ensureCandidate({ ...candidate, provenance: candidate.provenance || provenance }, index);
  const identity = confidence(candidate.confidenceDimensions?.identity, base.confidence);
  const portion = confidence(candidate.confidenceDimensions?.portion, base.provenance === "Photo estimate" ? Math.max(base.confidence - 8, 0) : base.confidence);
  const nutritionSource = confidence(candidate.confidenceDimensions?.nutritionSource, base.provenance.includes("verified") ? base.confidence : Math.max(base.confidence - 12, 0));
  const preparation = confidence(candidate.confidenceDimensions?.preparation, base.provenance === "Photo estimate" ? Math.max(base.confidence - 15, 0) : base.confidence);
  const low = numberOrZero(candidate.nutritionRange?.caloriesLow) || Math.max(0, Math.round(base.calories * (portion < 70 ? 0.75 : 0.9)));
  const high = numberOrZero(candidate.nutritionRange?.caloriesHigh) || Math.round(base.calories * (portion < 70 ? 1.3 : 1.1));
  return {
    ...base,
    componentId: candidate.componentId || base.id || `component-${index + 1}`,
    preparation: candidate.preparation?.trim() || null,
    included: candidate.included !== false,
    eatenFraction: Math.min(Math.max(Number(candidate.eatenFraction ?? 1), 0), 1),
    confidenceDimensions: { identity, portion, nutritionSource, preparation },
    assumptions: Array.isArray(candidate.assumptions) ? candidate.assumptions.filter((item): item is string => typeof item === "string").slice(0, 6) : [],
    nutritionRange: { caloriesLow: Math.min(low, high), caloriesHigh: Math.max(low, high) },
    reviewQuestions: Array.isArray(candidate.reviewQuestions) ? candidate.reviewQuestions.filter((item): item is string => typeof item === "string").slice(0, 4) : [],
  };
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response.json() as Promise<Record<string, any>>;
}

function offCandidate(product: Record<string, any>, barcode: string): CaptureCandidate | null {
  const nutriments = product.nutriments ?? {};
  const calories = numberOrZero(nutriments["energy-kcal_serving"] ?? nutriments["energy-kcal_100g"]);
  const proteinG = numberOrZero(nutriments["proteins_serving"] ?? nutriments["proteins_100g"]);
  const carbsG = numberOrZero(nutriments["carbohydrates_serving"] ?? nutriments["carbohydrates_100g"]);
  const fatG = numberOrZero(nutriments["fat_serving"] ?? nutriments["fat_100g"]);
  const name = String(product.product_name ?? product.product_name_en ?? "").trim();
  if (!name) return null;
  const hasMacros = calories > 0 && (proteinG > 0 || carbsG > 0 || fatG > 0);
  return ensureCandidate({
    id: `off-${barcode}`,
    name,
    brand: product.brands || null,
    serving: product.serving_size || "100 g",
    calories,
    proteinG,
    carbsG,
    fatG,
    confidence: hasMacros ? 94 : 78,
    provenance: hasMacros ? "Barcode verified" : "Barcode product match",
    sourceLabel: "Open Food Facts",
  }, 0);
}

async function lookupBarcode(barcode: string) {
  try {
    const data = await fetchJson(`${OPEN_FOOD_FACTS_ROOT}/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,product_name_en,brands,serving_size,nutriments`);
    if (data.status === 1 && data.product) {
      const candidate = offCandidate(data.product, barcode);
      if (candidate) return { candidate, provider: "Open Food Facts" };
    }
  } catch {
    // Continue to USDA when the public product service is unavailable.
  }

  try {
    const search = await fetchJson(`${USDA_ROOT}/foods/search?api_key=${encodeURIComponent(USDA_KEY)}&query=${encodeURIComponent(barcode)}&pageSize=5&dataType=Branded,SR%20Legacy,Foundation`);
    const food = search.foods?.[0];
    if (food && String(food.gtinUpc ?? "").replace(/\D/g, "") === barcode) {
      const nutrients = new Map((food.foodNutrients ?? []).map((item: any) => [item.nutrientName, item.value]));
      const candidate = ensureCandidate({
        id: `usda-${food.fdcId ?? barcode}`,
        name: food.description,
        brand: food.brandOwner ?? null,
        serving: food.servingSize ? `${food.servingSize} ${food.servingSizeUnit ?? "g"}` : "100 g",
        calories: numberOrZero(nutrients.get("Energy")),
        proteinG: numberOrZero(nutrients.get("Protein")),
        carbsG: numberOrZero(nutrients.get("Carbohydrate, by difference")),
        fatG: numberOrZero(nutrients.get("Total lipid (fat)")),
        confidence: 88,
        provenance: "USDA verified",
        sourceLabel: "USDA FoodData Central",
      }, 0);
      return { candidate, provider: "USDA FoodData Central" };
    }
  } catch {
    // Fall through to a clear unavailable response.
  }

  return null;
}

function parseVisionResponse(content: string) {
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as {
    title?: string;
    candidates?: Partial<CaptureCandidate>[];
    components?: Partial<CaptureComponent>[];
    assumptions?: string[];
    reviewQuestions?: string[];
  };
  const rawComponents = parsed.components ?? parsed.candidates ?? [];
  const components = rawComponents.slice(0, 8).map((candidate, index) => ensureComponent(candidate, index)).filter((candidate) => candidate.name !== "Unidentified food");
  const candidates = components.map(({ componentId: _componentId, preparation: _preparation, included: _included, eatenFraction: _eatenFraction, confidenceDimensions: _confidenceDimensions, assumptions: _assumptions, nutritionRange: _nutritionRange, reviewQuestions: _reviewQuestions, ...candidate }) => candidate);
  return {
    title: parsed.title?.trim() || (components[0]?.name ?? "Food photo review"),
    candidates,
    components,
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.filter((item): item is string => typeof item === "string").slice(0, 8) : [],
    reviewQuestions: Array.isArray(parsed.reviewQuestions) ? parsed.reviewQuestions.filter((item): item is string => typeof item === "string").slice(0, 6) : components.flatMap((component) => component.reviewQuestions).slice(0, 6),
  };
}

async function analyzeTextInput(textInput: string) {
  const completion = await openai.chat.completions.create({
    model: TEXT_MODEL,
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          `You are ${BRAND_NAME}'s food recognition engine.`,
          "Parse natural-language food descriptions into structured nutrition estimates.",
          "Return JSON only with this shape: { title: string, components: [{ name, brand, serving, calories, proteinG, carbsG, fatG, confidence, preparation, assumptions, confidenceDimensions: { identity, portion, nutritionSource, preparation }, reviewQuestions }], assumptions: string[], reviewQuestions: string[] }.",
          "Use USDA average values for the described food if no brand is specified. Split mixed meals into one component per distinct item.",
          "Confidence guidance for text input: identity 70-88, portion 55-75 (serving size is uncertain), nutritionSource 60-78, preparation 65-82.",
          "Never describe nutrition as verified. Always ask at least one review question about portion size.",
          "Keep calories and macros non-negative. Use edible portion estimates.",
        ].join(" "),
      },
      {
        role: "user",
        content: `Parse this food description and estimate nutrition per item: "${textInput}"`,
      },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Text provider returned no analysis");
  return parseVisionResponse(content);
}

async function analyzeNutritionLabel(imageBase64: string) {
  const completion = await openai.chat.completions.create({
    model: VISION_MODEL,
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          `You are ${BRAND_NAME}'s nutrition label reader.`,
          "Extract the exact nutrition facts from the visible nutrition label in the image.",
          "Return JSON only with this shape: { title: string, components: [{ name, brand, serving, calories, proteinG, carbsG, fatG, confidence, provenance, sourceLabel, preparation, assumptions, confidenceDimensions: { identity, portion, nutritionSource, preparation }, reviewQuestions }], assumptions: string[], reviewQuestions: string[] }.",
          "Set provenance to 'Nutrition label' and sourceLabel to 'Label extract' for each component.",
          "When the label is clearly legible: identity 92, nutritionSource 95, portion 70 (user may eat a different amount), preparation 85.",
          "If the label is partially obscured or unclear, reduce confidence and add a review question to verify values.",
          "Always ask one review question about whether the portion eaten matches the label serving size.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Read the nutrition label and extract the product name, brand, serving size, and macronutrients (calories, protein, carbohydrates, fat).",
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" },
          },
        ],
      },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Label reader returned no analysis");
  return parseVisionResponse(content);
}

async function analyzeFoodPhoto(imageBase64: string) {
  const completion = await openai.chat.completions.create({
    model: VISION_MODEL,
    max_completion_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          `You are ${BRAND_NAME}'s food recognition engine.`,
          "Analyze any food, drink, packaged item, or mixed meal visible in the image.",
          "Do not refuse because the food is unfamiliar. Make the best reasonable estimate.",
          "Return JSON only with this shape: { title: string, components: [{ name, brand, serving, calories, proteinG, carbsG, fatG, confidence, preparation, assumptions, confidenceDimensions: { identity, portion, nutritionSource, preparation }, reviewQuestions }], assumptions: string[], reviewQuestions: string[] }.",
          "For mixed meals, return one component per visually distinct food. Use separate 0-100 confidence values for identity, portion, nutritionSource, and preparation.",
          "Nutrition from an image is an estimate. Never describe it as verified.",
          "Use edible portion estimates and keep calories/macros non-negative.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Identify every food or drink you can see and estimate one serving for each. Ask only high-impact review questions such as uncertain sauce, serving size, or whether the whole meal was eaten.",
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" },
          },
        ],
      },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Vision provider returned no analysis");
  return parseVisionResponse(content);
}

async function analyzeReceipt(imageBase64: string) {
  const completion = await openai.chat.completions.create({
    model: VISION_MODEL,
    max_completion_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          `You are ${BRAND_NAME}'s receipt-to-food review engine.`,
          "Read a grocery or restaurant receipt and return only plausible food or drink line items as components.",
          "Never include prices, taxes, tips, payment, loyalty data, merchant details, bag fees, or purchase history.",
          "Return JSON only with this shape: { title: string, components: [{ name, brand, serving, calories, proteinG, carbsG, fatG, confidence, preparation, assumptions, confidenceDimensions: { identity, portion, nutritionSource, preparation }, reviewQuestions }], assumptions: string[], reviewQuestions: string[] }.",
          "Receipt line names and quantities are often abbreviated. Treat every nutrition value as an estimate, use low confidence for uncertain abbreviations, and add a concise review question for ambiguous items.",
          "If no plausible food or drink line item is readable, return an empty components array and explain why in assumptions.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract food and drink items from this receipt into editable nutrition candidates. Exclude non-food lines rather than guessing." },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" } },
        ],
      },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Receipt reader returned no analysis");
  return parseVisionResponse(content);
}

async function transcribeVoice(audioBase64: string, audioFormat: "mp4" | "m4a" | "wav" | "webm" = "mp4") {
  const audio = Buffer.from(audioBase64, "base64");
  if (audio.length === 0 || audio.length > MAX_AUDIO_BYTES) {
    throw new Error("That recording is too large. Please keep your meal description under 15 seconds.");
  }
  const file = new File([audio], `calora-voice.${audioFormat}`, { type: `audio/${audioFormat}` });
  const result = await openai.audio.transcriptions.create({
    file,
    model: TRANSCRIPTION_MODEL,
    prompt: "This is a short meal description. Preserve food names, portions, brands, and preparation details.",
  });
  return result.text.trim();
}

router.post("/v1/capture/analyze", async (req, res) => {
  // Verify the Bearer token once and share the result across rate limiting and
  // session persistence — avoids a second Supabase round-trip.  A missing,
  // malformed, or cryptographically invalid token resolves to null here, which
  // directs rate limiting to the trusted req.ip bucket instead.
  let verifiedUser: VerifiedUser | null = null;
  try {
    verifiedUser = await verifyBearerToken(req);
  } catch {
    // Supabase not configured or unreachable — treat as anonymous.
  }

  const rate = await checkRateLimit(
    rateLimitKey(verifiedUser, req),
    CAPTURE_RATE_LIMIT,
    CAPTURE_RATE_WINDOW_SECS,
    { failClosed: !verifiedUser },
  );
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSecs));
    if (rate.degraded) {
      res.status(503).json({
        message: "Capture is temporarily unavailable. Please try again shortly.",
        retryAfterSecs: rate.retryAfterSecs,
      });
    } else {
      res.status(429).json({
        message: "Too many capture requests. Please wait before trying again.",
        retryAfterSecs: rate.retryAfterSecs,
      });
    }
    return;
  }

  const parsed = AnalyzeCaptureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid capture input" });
    return;
  }

  const body = parsed.data;
  const barcode = body.barcode ? normalizeBarcode(body.barcode) : "";
  const hasBarcode = barcode.length >= 8;
  const hasImage = Boolean(body.imageBase64);
  const hasText = Boolean(body.textInput?.trim());

  if (body.mode === "voice") {
    if (!body.audioBase64) {
      res.json({
        sessionId: body.clientSessionId || randomUUID(),
        mode: "voice",
        status: "unavailable",
        title: "Record a meal description",
        reviewMessage: "No recording was received. Try recording again, or type your meal description instead.",
        provider: "OpenAI transcription",
        candidates: [],
        imageRetention: "not_collected",
      });
      return;
    }
  }

  if (body.mode === "text" && !hasText) {
    res.status(400).json({ message: "A food description is required for text mode" });
    return;
  }
  if (body.mode === "nutrition_label" && !hasImage) {
    res.status(400).json({ message: "A label image is required for nutrition_label mode" });
    return;
  }
  if (body.mode === "barcode" && !hasBarcode) {
    res.status(400).json({ message: "A valid barcode is required for barcode mode" });
    return;
  }
  if (body.mode === "food" && !hasImage) {
    res.status(400).json({ message: "A camera image is required for food mode" });
    return;
  }
  if (body.mode === "receipt" && !hasImage) {
    res.status(400).json({ message: "A receipt image is required for receipt mode" });
    return;
  }
  if (body.mode === "auto" && !hasBarcode && !hasImage) {
    res.status(400).json({ message: "Provide a barcode or camera image" });
    return;
  }

  try {
    // Text mode — parse natural-language description with AI.
    if (body.mode === "text" && hasText) {
      const result = await analyzeTextInput(body.textInput!.trim());
      const serverSessionId = await persistCaptureSession(verifiedUser, "text", result.candidates);
      res.json({
        sessionId: serverSessionId || body.clientSessionId || randomUUID(),
        mode: "text",
        status: result.candidates.length ? "review" : "unavailable",
        title: result.title,
        reviewMessage: "Nutrition is estimated from your description. Review the foods and portions before adding them.",
        provider: "Managed language model",
        candidates: result.candidates.map((candidate, index) => ensureCandidate({
          ...candidate,
          id: `text-${index + 1}`,
          provenance: "Text estimate",
          sourceLabel: "Managed language model",
          editable: true,
        }, index)),
        components: result.components.map((component, index) => ensureComponent({
          ...component,
          provenance: "Text estimate",
          sourceLabel: "Managed language model",
        }, index, "Text estimate")),
        assumptions: result.assumptions,
        reviewQuestions: result.reviewQuestions,
        imageRetention: "not_collected",
      });
      return;
    }

    // Voice is deliberately a two-step path: raw audio becomes an editable
    // transcript, then the user explicitly requests the normal text estimate.
    if (body.mode === "voice" && body.audioBase64) {
      const transcript = await transcribeVoice(body.audioBase64, body.audioFormat);
      if (!transcript) {
        res.json({
          sessionId: body.clientSessionId || randomUUID(),
          mode: "voice",
          status: "unavailable",
          title: "We could not hear a meal description",
          reviewMessage: "Try recording again in a quieter place, or type what you ate instead.",
          provider: "OpenAI transcription",
          candidates: [],
          imageRetention: "not_collected",
        });
        return;
      }
      res.json({
        sessionId: body.clientSessionId || randomUUID(),
        mode: "voice",
        status: "transcript",
        title: "Check what we heard",
        reviewMessage: "Edit this transcript if needed, then estimate nutrition. Your recording is discarded after transcription.",
        provider: "OpenAI transcription",
        transcript,
        candidates: [],
        imageRetention: "not_collected",
      });
      return;
    }

    if (body.mode === "receipt" && body.imageBase64) {
      const result = await analyzeReceipt(body.imageBase64);
      const serverSessionId = await persistCaptureSession(verifiedUser, "receipt", result.candidates);
      res.json({
        sessionId: serverSessionId || body.clientSessionId || randomUUID(),
        mode: "receipt",
        status: result.candidates.length ? "review" : "unavailable",
        title: result.title || "Receipt food review",
        reviewMessage: result.candidates.length
          ? "These are receipt-based estimates. Check each item and remove anything you did not eat before adding it."
          : "No clear food or drink items were found. Try a brighter, flatter photo or type your meal instead.",
        provider: "Managed vision (receipt reader)",
        candidates: result.candidates.map((candidate, index) => ensureCandidate({
          ...candidate,
          id: `receipt-${index + 1}`,
          provenance: "Receipt estimate",
          sourceLabel: "Receipt line-item estimate",
          editable: true,
        }, index)),
        components: result.components.map((component, index) => ensureComponent({
          ...component,
          provenance: "Receipt estimate",
          sourceLabel: "Receipt line-item estimate",
          included: component.confidence >= 55,
        }, index, "Receipt estimate")),
        assumptions: result.assumptions,
        reviewQuestions: result.reviewQuestions,
        imageRetention: "delete_after_analysis",
      });
      return;
    }

    // Nutrition label mode — extract structured values from a label image.
    if (body.mode === "nutrition_label" && body.imageBase64) {
      const result = await analyzeNutritionLabel(body.imageBase64);
      const serverSessionId = await persistCaptureSession(verifiedUser, "nutrition_label", result.candidates);
      res.json({
        sessionId: serverSessionId || body.clientSessionId || randomUUID(),
        mode: "nutrition_label",
        status: result.candidates.length ? "review" : "unavailable",
        title: result.title,
        reviewMessage: "Nutrition extracted from the label. Confirm the serving size matches what you actually ate.",
        provider: "Managed vision (label reader)",
        candidates: result.candidates.map((candidate, index) => ensureCandidate({
          ...candidate,
          id: `label-${index + 1}`,
          provenance: candidate.provenance || "Nutrition label",
          sourceLabel: candidate.sourceLabel || "Label extract",
          editable: true,
        }, index)),
        components: result.components.map((component, index) => ensureComponent({
          ...component,
          provenance: component.provenance || "Nutrition label",
          sourceLabel: component.sourceLabel || "Label extract",
        }, index, "Nutrition label")),
        assumptions: result.assumptions,
        reviewQuestions: result.reviewQuestions,
        imageRetention: "delete_after_analysis",
      });
      return;
    }

    if (hasBarcode && (body.mode === "auto" || body.mode === "barcode")) {
      const result = await lookupBarcode(barcode);
      if (result) {
        const serverSessionId = await persistCaptureSession(verifiedUser, "barcode", [result.candidate]);
        res.json({
          sessionId: serverSessionId || body.clientSessionId || randomUUID(),
          mode: "barcode",
          status: "review",
          title: result.candidate.name,
          reviewMessage: "Product nutrition matched from a barcode. Confirm the serving before adding it.",
          provider: result.provider,
          candidates: [result.candidate],
           components: [ensureComponent(result.candidate, 0, result.candidate.provenance)],
           assumptions: [],
           reviewQuestions: ["Is this the serving size you ate?"],
           imageRetention: "delete_after_analysis",
        });
        return;
      }
      if (body.mode === "barcode") {
        res.json({
          sessionId: body.clientSessionId || randomUUID(),
          mode: "barcode",
          status: "unavailable",
          title: "Barcode not found",
          reviewMessage: "We could not match this barcode yet. Search for the product or enter its nutrition manually.",
          provider: "Open Food Facts + USDA FoodData Central",
          candidates: [],
        });
        return;
      }
    }

    if (!body.imageBase64) {
      res.status(502).json({ message: "No usable capture input remained" });
      return;
    }
    const result = await analyzeFoodPhoto(body.imageBase64);
    const serverSessionId = await persistCaptureSession(verifiedUser, "food", result.candidates);
    res.json({
      sessionId: serverSessionId || body.clientSessionId || randomUUID(),
      mode: "food",
      status: result.candidates.length ? "review" : "unavailable",
      title: result.title,
      reviewMessage: "Photo nutrition is an estimate. Review the foods and portions before adding them.",
      provider: "Managed vision",
      candidates: result.candidates.map((candidate, index) => ensureCandidate({
        ...candidate,
        id: `vision-${index + 1}`,
        provenance: "Photo estimate",
        sourceLabel: "Managed vision estimate",
        editable: true,
      }, index)),
       components: result.components,
       assumptions: result.assumptions,
       reviewQuestions: result.reviewQuestions,
       imageRetention: "delete_after_analysis",
    });
  } catch (error) {
    res.status(502).json({ message: error instanceof Error ? error.message : "Capture provider unavailable" });
  }
});

export default router;