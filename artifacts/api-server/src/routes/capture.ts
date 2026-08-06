import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { AnalyzeCaptureBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();
const OPEN_FOOD_FACTS_ROOT = "https://world.openfoodfacts.org/api/v2";
const USDA_ROOT = "https://api.nal.usda.gov/fdc/v1";
const USDA_KEY = process.env.USDA_FOODDATA_API_KEY ?? "DEMO_KEY";
const VISION_MODEL = "gpt-5.6-terra";

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
    if (food && (String(food.gtinUpc ?? "").replace(/\D/g, "") === barcode || String(food.description ?? "").toLowerCase().includes(barcode))) {
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
  const parsed = JSON.parse(cleaned) as { title?: string; candidates?: Partial<CaptureCandidate>[] };
  const candidates = (parsed.candidates ?? []).slice(0, 8).map(ensureCandidate).filter((candidate) => candidate.name !== "Unidentified food");
  return {
    title: parsed.title?.trim() || (candidates[0]?.name ?? "Food photo review"),
    candidates,
  };
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
          "You are Calora's food recognition engine.",
          "Analyze any food, drink, packaged item, or mixed meal visible in the image.",
          "Do not refuse because the food is unfamiliar. Make the best reasonable estimate.",
          "Return JSON only with this shape: { title: string, candidates: [{ name, brand, serving, calories, proteinG, carbsG, fatG, confidence }] }.",
          "For mixed meals, return one candidate per visually distinct food. Use confidence 0-100.",
          "Nutrition from an image is an estimate. Never describe it as verified.",
          "Use edible portion estimates and keep calories/macros non-negative.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Identify every food or drink you can see and estimate one serving for each.",
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
  const parsed = AnalyzeCaptureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid capture input" });
    return;
  }

  const body = parsed.data;
  const barcode = body.barcode ? normalizeBarcode(body.barcode) : "";
  const hasBarcode = barcode.length >= 8;
  const hasImage = Boolean(body.imageBase64);
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
    if (hasBarcode && (body.mode === "auto" || body.mode === "barcode")) {
      const result = await lookupBarcode(barcode);
      if (result) {
        res.json({
          sessionId: body.clientSessionId || randomUUID(),
          mode: "barcode",
          status: "review",
          title: result.candidate.name,
          reviewMessage: "Product nutrition matched from a barcode. Confirm the serving before adding it.",
          provider: result.provider,
          candidates: [result.candidate],
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
    res.json({
      sessionId: body.clientSessionId || randomUUID(),
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
    });
  } catch (error) {
    res.status(502).json({ message: error instanceof Error ? error.message : "Capture provider unavailable" });
  }
});

export default router;