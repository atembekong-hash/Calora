import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { AnalyzeCaptureBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, referralQualificationsTable } from "@workspace/db";
import { BRAND_NAME } from "../lib/brand.js";
import { verifyBearerToken } from "../lib/supabase-auth.js";

const router: IRouter = Router();
const OPEN_FOOD_FACTS_ROOT = "https://world.openfoodfacts.org/api/v2";
const USDA_ROOT = "https://api.nal.usda.gov/fdc/v1";
const USDA_KEY = process.env.USDA_FOODDATA_API_KEY ?? "DEMO_KEY";
const VISION_MODEL = "gpt-5.6-terra";
const TEXT_MODEL = "gpt-5.4-mini";
const QUALIFICATION_TTL_MS = 30 * 60 * 1000;

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

router.post("/v1/capture/analyze", async (req, res) => {
  const auth = await verifyBearerToken(req);
  if (!auth) {
    res.status(401).json({ message: "Please sign in to analyze a food capture." });
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

  // Graceful degradation for voice — no audio transcription provider is connected.
  if (body.mode === "voice") {
    res.json({
      sessionId: body.clientSessionId || randomUUID(),
      mode: "voice",
      status: "unavailable",
      title: "Voice capture unavailable",
      reviewMessage: `Voice capture requires a speech-to-text provider that is not yet connected. Type your meal description instead and ${BRAND_NAME} will estimate the nutrition.`,
      provider: "None",
      candidates: [],
      imageRetention: "not_collected",
    });
    return;
  }

  // Graceful degradation for receipt — no receipt parsing provider is connected.
  if (body.mode === "receipt") {
    res.json({
      sessionId: body.clientSessionId || randomUUID(),
      mode: "receipt",
      status: "unavailable",
      title: "Receipt scan unavailable",
      reviewMessage: "Receipt scanning is not yet available. Take a food photo or type what you ate instead.",
      provider: "None",
      candidates: [],
      imageRetention: "not_collected",
    });
    return;
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
  if (body.mode === "auto" && !hasBarcode && !hasImage) {
    res.status(400).json({ message: "Provide a barcode or camera image" });
    return;
  }

  try {
    // Text mode — parse natural-language description with AI.
    if (body.mode === "text" && body.textInput?.trim()) {
      const result = await analyzeTextInput(body.textInput!.trim());
      res.json({
        sessionId: body.clientSessionId || randomUUID(),
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

    // Nutrition label mode — extract structured values from a label image.
    if (body.mode === "nutrition_label" && body.imageBase64) {
      const result = await analyzeNutritionLabel(body.imageBase64);
      res.json({
        sessionId: body.clientSessionId || randomUUID(),
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
        const sessionId = randomUUID();
        await db.insert(referralQualificationsTable).values({
          externalUserId: auth.id,
          captureSessionId: sessionId,
          expiresAt: new Date(Date.now() + QUALIFICATION_TTL_MS),
        }).onConflictDoNothing();
        res.json({
          sessionId,
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
    const sessionId = randomUUID();
    await db.insert(referralQualificationsTable).values({
      externalUserId: auth.id,
      captureSessionId: sessionId,
      expiresAt: new Date(Date.now() + QUALIFICATION_TTL_MS),
    }).onConflictDoNothing();
    res.json({
      sessionId,
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

/**
 * Commits a previously-issued capture proof after the user accepts its review.
 * The proof is bound to the JWT identity, expires quickly, and is one-time.
 */
router.post("/v1/capture/:sessionId/approve", async (req, res) => {
  const auth = await verifyBearerToken(req);
  if (!auth) {
    res.status(401).json({ message: "Please sign in to confirm a food capture." });
    return;
  }
  const approved = await db
    .update(referralQualificationsTable)
    .set({ approvedAt: new Date() })
    .where(
      sql`${referralQualificationsTable.captureSessionId} = ${req.params.sessionId}
        AND ${referralQualificationsTable.externalUserId} = ${auth.id}
        AND ${referralQualificationsTable.approvedAt} IS NULL
        AND ${referralQualificationsTable.expiresAt} > now()`,
    )
    .returning({ id: referralQualificationsTable.id });
  if (!approved[0]) {
    res.status(409).json({ message: "This capture can no longer be confirmed. Capture your food again." });
    return;
  }
  res.status(204).send();
});

export default router;