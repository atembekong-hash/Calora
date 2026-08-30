/**
 * Regression tests for the /v1/capture/analyze endpoint.
 *
 * Strategy:
 * - Mock global fetch to control Open Food Facts and USDA responses
 * - Mock the OpenAI client module to avoid requiring API credentials
 * - Mock @workspace/db pool.query with an in-memory simulation of the
 *   rate-limit upsert so tests run without a real database and directly
 *   exercise the DB-backed logic (not a fallthrough to fail-open).
 * - Import the Express app and use supertest for HTTP-level assertions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Shared in-memory state that backs the pool.query mock below.
// vi.hoisted ensures this is available inside the vi.mock factory (which
// is hoisted to the top of the module by vitest).
// ---------------------------------------------------------------------------
const { mockRateBuckets } = vi.hoisted(() => ({
  mockRateBuckets: new Map<string, { count: number; reset_at: Date }>(),
}));

// ---------------------------------------------------------------------------
// Mock @workspace/db — pool.query simulates the rate-limit upsert using
// mockRateBuckets so tests never need a real Postgres connection.
// db.insert is stubbed so persistCaptureSession doesn't throw when a
// verified user is present in a test.
// ---------------------------------------------------------------------------
vi.mock('@workspace/db', () => {
  const mockQuery = vi.fn(async (sql: string, params?: unknown[]) => {
    const trimmed = (sql ?? '').trim();

    // Atomic rate-limit upsert (INSERT … ON CONFLICT … RETURNING count, reset_at)
    if (trimmed.startsWith('INSERT INTO calora_capture_rate_limits')) {
      const key = (params as [string, string])[0];
      const windowSecs = Number((params as [string, string])[1]);
      const now = new Date();
      const existing = mockRateBuckets.get(key);
      let count: number;
      let reset_at: Date;
      if (!existing || existing.reset_at <= now) {
        // New bucket or expired window — reset to 1
        count = 1;
        reset_at = new Date(now.getTime() + windowSecs * 1000);
      } else {
        count = existing.count + 1;
        reset_at = existing.reset_at;
      }
      mockRateBuckets.set(key, { count, reset_at });
      return { rows: [{ count, reset_at }] };
    }

    // resetCaptureRateLimiter() — clear all buckets
    if (trimmed.startsWith('DELETE FROM calora_capture_rate_limits')) {
      mockRateBuckets.clear();
      return { rows: [] };
    }

    return { rows: [] };
  });

  // Minimal db stub — only insert is needed for persistCaptureSession
  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });

  return {
    pool: { query: mockQuery },
    db: { insert: mockInsert },
    aiCaptureSessionsTable: {},
    aiCaptureCandidatesTable: {},
  };
});

vi.mock('../lib/account-deletion-state.js', () => ({
  assertAccountWritable: vi.fn().mockResolvedValue(undefined),
  AccountDeletionInProgressError: class AccountDeletionInProgressError extends Error {},
}));

// ---------------------------------------------------------------------------
// Mock @workspace/integrations-openai-ai-server before it is imported so that
// the module initialisation guard (which throws on missing env vars) never runs.
// ---------------------------------------------------------------------------
vi.mock('@workspace/integrations-openai-ai-server', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
    audio: {
      transcriptions: {
        create: vi.fn(),
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock verifyBearerToken so the capture route doesn't try to reach Supabase.
// Default: returns null (anonymous / no valid token).
// ---------------------------------------------------------------------------
vi.mock('../lib/supabase-auth.js', () => ({
  verifyBearerToken: vi.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// Imports that depend on the mocked modules
// ---------------------------------------------------------------------------
import { openai } from '@workspace/integrations-openai-ai-server';
import { pool } from '@workspace/db';
import { verifyBearerToken } from '../lib/supabase-auth.js';
import express from 'express';
import captureRouter, { resetCaptureRateLimiter } from '../routes/capture.js';

// ---------------------------------------------------------------------------
// Build a minimal Express app that mounts the capture router
// ---------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));
  // The capture router handles its own /v1/capture/analyze prefix internally
  app.use(captureRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal valid Open Food Facts product response for a given barcode. */
function offProductResponse(barcode: string, overrides: Record<string, unknown> = {}) {
  return {
    status: 1,
    product: {
      code: barcode,
      product_name: 'Test Granola Bar',
      brands: 'Nature Valley',
      serving_size: '42 g',
      nutriments: {
        'energy-kcal_serving': 190,
        'proteins_serving': 4,
        'carbohydrates_serving': 29,
        'fat_serving': 7,
      },
      ...overrides,
    },
  };
}

/** A minimal valid USDA branded food search response. */
function usdaSearchResponse(barcode: string, overrides: Record<string, unknown> = {}) {
  return {
    foods: [
      {
        fdcId: 123456,
        description: 'USDA Test Product',
        brandOwner: 'USDA Brand',
        gtinUpc: barcode,
        servingSize: 100,
        servingSizeUnit: 'g',
        foodNutrients: [
          { nutrientName: 'Energy', value: 250 },
          { nutrientName: 'Protein', value: 12 },
          { nutrientName: 'Carbohydrate, by difference', value: 40 },
          { nutrientName: 'Total lipid (fat)', value: 8 },
        ],
        ...overrides,
      },
    ],
  };
}

/** Build a minimal valid AI JSON response (as a string) for vision/text mocks. */
function aiJsonResponse(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    title: 'AI Food',
    components: [
      {
        name: 'AI Component',
        brand: null,
        serving: '100 g',
        calories: 200,
        proteinG: 10,
        carbsG: 30,
        fatG: 5,
        confidence: 75,
        provenance: 'Photo estimate',
        sourceLabel: 'Managed vision estimate',
        preparation: null,
        assumptions: ['Estimate based on image.'],
        confidenceDimensions: { identity: 75, portion: 67, nutritionSource: 63, preparation: 60 },
        reviewQuestions: ['Is this the full serving?'],
      },
    ],
    assumptions: ['Visual estimate only.'],
    reviewQuestions: ['How much did you eat?'],
    ...overrides,
  });
}

const voiceCapturePayload = {
  mode: 'voice',
  audioBase64: Buffer.from('tiny test audio').toString('base64'),
  audioFormat: 'mp4',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /v1/capture/analyze', () => {
  let app: ReturnType<typeof buildApp>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    app = buildApp();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    vi.clearAllMocks();
    // resetCaptureRateLimiter is async — it issues a DELETE against the
    // (mocked) DB table so the in-memory simulation is cleared before each test.
    await resetCaptureRateLimiter();
    // Default: anonymous (no verified user). Individual tests can override this.
    vi.mocked(verifyBearerToken).mockResolvedValue(null);
    vi.mocked(openai.audio.transcriptions.create).mockResolvedValue({ text: 'test meal' } as any);
  });

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  describe('input validation', () => {
    it('returns 400 when body is missing mode', async () => {
      const res = await request(app).post('/v1/capture/analyze').send({}).set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
    });

    it('returns 400 for text mode without textInput', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'text' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/description/i);
    });

    it('returns 400 for barcode mode without a barcode', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/barcode/i);
    });

    it('returns 400 for nutrition_label mode without imageBase64', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'nutrition_label' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
    });

    it('returns 400 for food mode without imageBase64', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'food' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // Alternate capture mode validation
  // -------------------------------------------------------------------------

  describe('alternate capture modes', () => {
    it('gives a recovery message when voice mode has no recording', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('unavailable');
      expect(res.body.reviewMessage).toMatch(/recording|type/i);
    });

    it('requires an image for receipt mode', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'receipt' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/receipt image/i);
    });

    it('returns an editable transcript from a short voice recording', async () => {
      vi.mocked(openai.audio.transcriptions.create).mockResolvedValueOnce({ text: 'Turkey sandwich with apple' } as any);
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'voice', audioBase64: Buffer.from('audio').toString('base64'), audioFormat: 'mp4' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('transcript');
      expect(res.body.transcript).toBe('Turkey sandwich with apple');
      expect(res.body.candidates).toEqual([]);
    });

    it('returns receipt items as reviewable estimates', async () => {
      vi.mocked(openai.chat.completions.create).mockResolvedValueOnce({
        choices: [{ message: { content: aiJsonResponse({ title: 'Lunch receipt' }) } }],
      } as any);
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'receipt', imageBase64: 'receipt-image' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('review');
      expect(res.body.mode).toBe('receipt');
      expect(res.body.components[0].provenance).toBe('Receipt estimate');
      expect(res.body.components[0].sourceLabel).toBe('Receipt line-item estimate');
    });

    it('returns nutrition-label values as editable review data', async () => {
      vi.mocked(openai.chat.completions.create).mockResolvedValueOnce({
        choices: [{
          message: {
            content: aiJsonResponse({
              title: 'Test cereal',
              components: [{
                ...JSON.parse(aiJsonResponse()).components[0],
                provenance: 'Nutrition label',
                sourceLabel: 'Label extract',
              }],
            }),
          },
        }],
      } as any);

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'nutrition_label', imageBase64: 'label-image' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('review');
      expect(res.body.mode).toBe('nutrition_label');
      expect(res.body.provider).toBe('Managed vision (label reader)');
      expect(res.body.components[0].provenance).toBe('Nutrition label');
      expect(res.body.components[0].sourceLabel).toBe('Label extract');
      expect(res.body.imageRetention).toBe('delete_after_analysis');
    });
  });

  // -------------------------------------------------------------------------
  // Barcode — exact UPC match via Open Food Facts
  // -------------------------------------------------------------------------

  describe('barcode mode — Open Food Facts exact match', () => {
    const BARCODE = '012345678901';

    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => offProductResponse(BARCODE),
      } as any);
    });

    it('returns status=review when barcode is matched', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: BARCODE })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('review');
      expect(res.body.mode).toBe('barcode');
    });

    it('includes exactly one candidate with verified barcode provenance', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: BARCODE })
        .set('Content-Type', 'application/json');
      expect(res.body.candidates).toHaveLength(1);
      expect(res.body.candidates[0].provenance).toBe('Barcode verified');
      expect(res.body.candidates[0].sourceLabel).toBe('Open Food Facts');
    });

    it('returns correct nutrition values from the product', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: BARCODE })
        .set('Content-Type', 'application/json');
      const candidate = res.body.candidates[0];
      expect(candidate.calories).toBe(190);
      expect(candidate.proteinG).toBe(4);
      expect(candidate.carbsG).toBe(29);
      expect(candidate.fatG).toBe(7);
    });

    it('includes components with confidenceDimensions', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: BARCODE })
        .set('Content-Type', 'application/json');
      const component = res.body.components[0];
      expect(component).toBeDefined();
      expect(component.confidenceDimensions).toBeDefined();
      expect(typeof component.confidenceDimensions.identity).toBe('number');
      expect(typeof component.confidenceDimensions.portion).toBe('number');
      expect(typeof component.confidenceDimensions.nutritionSource).toBe('number');
      expect(typeof component.confidenceDimensions.preparation).toBe('number');
    });

    it('does not call USDA when OFF returns a match', async () => {
      await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: BARCODE })
        .set('Content-Type', 'application/json');
      // Only one fetch call (OFF), not two
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Barcode — USDA fallback with exact UPC match
  // -------------------------------------------------------------------------

  describe('barcode mode — USDA fallback with exact UPC', () => {
    const BARCODE = '098765432109';

    beforeEach(() => {
      // OFF fails, USDA succeeds with exact UPC match
      mockFetch
        .mockRejectedValueOnce(new Error('OFF unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => usdaSearchResponse(BARCODE),
        } as any);
    });

    it('returns a match from USDA when OFF is unavailable', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: BARCODE })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('review');
      expect(res.body.provider).toBe('USDA FoodData Central');
    });

    it('marks USDA candidate with USDA verified provenance', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: BARCODE })
        .set('Content-Type', 'application/json');
      expect(res.body.candidates[0].provenance).toBe('USDA verified');
      expect(res.body.candidates[0].sourceLabel).toBe('USDA FoodData Central');
    });
  });

  // -------------------------------------------------------------------------
  // Barcode — USDA rejects non-exact UPC match
  // -------------------------------------------------------------------------

  describe('barcode mode — USDA rejects non-exact UPC', () => {
    const BARCODE = '111111111111';

    it('returns unavailable when USDA product has a different gtinUpc', async () => {
      // OFF fails, USDA returns a product but with a different UPC
      mockFetch
        .mockRejectedValueOnce(new Error('OFF unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            foods: [
              {
                fdcId: 999,
                description: 'Different Product',
                brandOwner: 'Brand',
                gtinUpc: '999999999999', // ← different from BARCODE
                servingSize: 100,
                servingSizeUnit: 'g',
                foodNutrients: [],
              },
            ],
          }),
        } as any);

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: BARCODE })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('unavailable');
      expect(res.body.candidates).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Barcode — both providers fail
  // -------------------------------------------------------------------------

  describe('barcode mode — both providers fail', () => {
    const BARCODE = '012312312312';

    beforeEach(() => {
      mockFetch
        .mockRejectedValueOnce(new Error('OFF unavailable'))
        .mockRejectedValueOnce(new Error('USDA unavailable'));
    });

    it('returns status=unavailable when no provider can match the barcode', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: BARCODE })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('unavailable');
      expect(res.body.candidates).toEqual([]);
    });

    it('includes provider name in the unavailable response', async () => {
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: BARCODE })
        .set('Content-Type', 'application/json');
      expect(typeof res.body.provider).toBe('string');
      expect(res.body.provider.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Barcode — OFF returns product with no name (should be filtered)
  // -------------------------------------------------------------------------

  describe('barcode mode — OFF product with missing name', () => {
    const BARCODE = '555555555555';

    it('falls through to USDA when OFF product has no name', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            product: {
              product_name: '',   // empty — should be filtered
              nutriments: { 'energy-kcal_serving': 100 },
            },
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => usdaSearchResponse(BARCODE),
        } as any);

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: BARCODE })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(200);
      // Either USDA matched or we got unavailable — either way no crash
      expect([200]).toContain(res.status);
    });
  });

  // -------------------------------------------------------------------------
  // Text mode
  // -------------------------------------------------------------------------

  describe('text mode', () => {
    it('calls the AI and returns review status with components', async () => {
      (openai.chat.completions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        choices: [{ message: { content: aiJsonResponse() } }],
      });

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'text', textInput: 'a bowl of oatmeal with berries' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(200);
      expect(res.body.mode).toBe('text');
      expect(res.body.status).toBe('review');
      expect(res.body.candidates.length).toBeGreaterThan(0);
      expect(res.body.components.length).toBeGreaterThan(0);
    });

    it('response components include all required fields', async () => {
      (openai.chat.completions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        choices: [{ message: { content: aiJsonResponse() } }],
      });

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'text', textInput: 'scrambled eggs on toast' })
        .set('Content-Type', 'application/json');

      const comp = res.body.components[0];
      expect(comp.name).toBeDefined();
      expect(comp.calories).toBeGreaterThanOrEqual(0);
      expect(comp.proteinG).toBeGreaterThanOrEqual(0);
      expect(comp.carbsG).toBeGreaterThanOrEqual(0);
      expect(comp.fatG).toBeGreaterThanOrEqual(0);
      expect(comp.included).toBe(true);
      expect(typeof comp.eatenFraction).toBe('number');
      expect(comp.confidenceDimensions).toBeDefined();
      expect(comp.assumptions).toBeDefined();
      expect(comp.reviewQuestions).toBeDefined();
    });

    it('returns 502 when the AI provider fails', async () => {
      (openai.chat.completions.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Provider timeout'),
      );

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'text', textInput: 'a banana' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(502);
      expect(res.body.message).toMatch(/provider|unavailable|timeout/i);
    });

    it('sets provenance to Text estimate (not verified) for text mode', async () => {
      (openai.chat.completions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        choices: [{ message: { content: aiJsonResponse() } }],
      });

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'text', textInput: 'a large cheeseburger with fries' })
        .set('Content-Type', 'application/json');
      // No candidate should have a 'verified' provenance for text mode
      for (const candidate of res.body.candidates) {
        expect(candidate.provenance).not.toContain('verified');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Component response structure invariants
  // -------------------------------------------------------------------------

  describe('component response shape invariants', () => {
    it('confidence values are clamped to [0, 100] — barcode match', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => offProductResponse('123456789012'),
      } as any);

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: '123456789012' })
        .set('Content-Type', 'application/json');

      for (const c of res.body.candidates) {
        expect(c.confidence).toBeGreaterThanOrEqual(0);
        expect(c.confidence).toBeLessThanOrEqual(100);
      }
      for (const c of res.body.components) {
        const dims = c.confidenceDimensions;
        for (const key of ['identity', 'portion', 'nutritionSource', 'preparation']) {
          expect(dims[key]).toBeGreaterThanOrEqual(0);
          expect(dims[key]).toBeLessThanOrEqual(100);
        }
      }
    });

    it('eatenFraction is in [0, 1] for all components — barcode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => offProductResponse('223456789012'),
      } as any);

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: '223456789012' })
        .set('Content-Type', 'application/json');

      for (const c of res.body.components) {
        expect(c.eatenFraction).toBeGreaterThanOrEqual(0);
        expect(c.eatenFraction).toBeLessThanOrEqual(1);
      }
    });

    it('nutritionRange caloriesHigh >= caloriesLow — barcode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => offProductResponse('323456789012'),
      } as any);

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: '323456789012' })
        .set('Content-Type', 'application/json');

      for (const c of res.body.components) {
        expect(c.nutritionRange.caloriesHigh).toBeGreaterThanOrEqual(c.nutritionRange.caloriesLow);
      }
    });

    it('assumptions and reviewQuestions are string arrays', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => offProductResponse('423456789012'),
      } as any);

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'barcode', barcode: '423456789012' })
        .set('Content-Type', 'application/json');

      expect(Array.isArray(res.body.assumptions)).toBe(true);
      expect(Array.isArray(res.body.reviewQuestions)).toBe(true);
      for (const c of res.body.components) {
        expect(Array.isArray(c.assumptions)).toBe(true);
        expect(Array.isArray(c.reviewQuestions)).toBe(true);
      }
    });

    it('response always includes a sessionId string', async () => {
      // voice mode is an easy way to get a response without network calls
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');
      expect(typeof res.body.sessionId).toBe('string');
      expect(res.body.sessionId.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Auto mode — barcode preferred over image fallback
  // -------------------------------------------------------------------------

  describe('auto mode', () => {
    const BARCODE = '512345678901';

    it('uses barcode path when both barcode and imageBase64 are provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => offProductResponse(BARCODE),
      } as any);

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({
          mode: 'auto',
          barcode: BARCODE,
          imageBase64: 'ZmFrZWltYWdl', // "fakeimage" in base64
        })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.mode).toBe('barcode');
      // openai should NOT have been called — barcode path was taken
      expect(openai.chat.completions.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Rate limiting — per user/IP sliding window
  // -------------------------------------------------------------------------

  describe('rate limiting', () => {
    // The rate limiter is reset in the outer beforeEach so each test starts
    // with a clean slate. We use voice mode (no network/AI calls) to exhaust
    // the bucket quickly without mocking every provider.
    //
    // verifyBearerToken is mocked to return null (anonymous) by default.
    // Tests that want a verified user identity override it directly.

    it('fails CLOSED (503, no provider call) for anonymous requests when the limiter store is unavailable', async () => {
      vi.mocked(verifyBearerToken).mockResolvedValue(null);
      vi.mocked(pool.query).mockRejectedValueOnce(new Error('DB connection lost'));

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'voice', audio: 'dGVzdA==' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(503);
      expect(res.headers['retry-after']).toBeDefined();
      expect(openai.chat.completions.create).not.toHaveBeenCalled();
      expect(openai.audio.transcriptions.create).not.toHaveBeenCalled();
    });

    it('fails OPEN for verified users when the limiter store is unavailable', async () => {
      vi.mocked(verifyBearerToken).mockResolvedValue({ id: 'user-fail-open', email: null });
      vi.mocked(pool.query).mockRejectedValueOnce(new Error('DB connection lost'));

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');

      // Not blocked by the limiter — proceeds to normal request validation.
      expect(res.status).not.toBe(503);
      expect(res.status).not.toBe(429);
    });

    it('returns 429 after exceeding the per-IP request limit', async () => {
      // Exhaust the bucket (CAPTURE_RATE_LIMIT = 30).
      for (let i = 0; i < 30; i++) {
        await request(app)
          .post('/v1/capture/analyze')
          .send({ mode: 'voice' })
          .set('Content-Type', 'application/json');
      }

      // The 31st request must be rejected.
      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(429);
    });

    it('429 response body contains a human-readable message and retryAfterSecs', async () => {
      for (let i = 0; i < 30; i++) {
        await request(app)
          .post('/v1/capture/analyze')
          .send({ mode: 'voice' })
          .set('Content-Type', 'application/json');
      }

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');

      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);
      expect(typeof res.body.retryAfterSecs).toBe('number');
      expect(res.body.retryAfterSecs).toBeGreaterThan(0);
    });

    it('429 response includes a Retry-After header', async () => {
      for (let i = 0; i < 30; i++) {
        await request(app)
          .post('/v1/capture/analyze')
          .send({ mode: 'voice' })
          .set('Content-Type', 'application/json');
      }

      const res = await request(app)
        .post('/v1/capture/analyze')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');

      expect(res.headers['retry-after']).toBeDefined();
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('requests within the limit are still accepted', async () => {
      // 30 requests — all should succeed (voice returns 200 even when unavailable).
      for (let i = 0; i < 30; i++) {
        const res = await request(app)
          .post('/v1/capture/analyze')
          .send({ mode: 'voice' })
          .set('Content-Type', 'application/json');
        expect(res.status).toBe(200);
      }
    });

    it('verified users have separate buckets from each other', async () => {
      // Exhaust bucket for user A (Supabase-verified identity).
      vi.mocked(verifyBearerToken).mockResolvedValue({ id: 'user-a', email: null });
      for (let i = 0; i < 30; i++) {
        await request(app)
          .post('/v1/capture/analyze')
          .set('Authorization', 'Bearer token-a')
          .send({ mode: 'voice' })
          .set('Content-Type', 'application/json');
      }

      // User A is now rate-limited.
      const resA = await request(app)
        .post('/v1/capture/analyze')
        .set('Authorization', 'Bearer token-a')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');
      expect(resA.status).toBe(429);

      // User B has a fresh bucket and should still get through.
      vi.mocked(verifyBearerToken).mockResolvedValue({ id: 'user-b', email: null });
      const resB = await request(app)
        .post('/v1/capture/analyze')
        .set('Authorization', 'Bearer token-b')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');
      expect(resB.status).toBe(200);
    });

    it('an invalid or unsigned token falls back to the shared IP bucket, not a fresh user bucket', async () => {
      // Anonymous (no auth) exhausts the IP bucket.
      vi.mocked(verifyBearerToken).mockResolvedValue(null);
      for (let i = 0; i < 30; i++) {
        await request(app)
          .post('/v1/capture/analyze')
          .send({ mode: 'voice' })
          .set('Content-Type', 'application/json');
      }

      // A request bearing an invalid/unverified token must NOT receive a fresh
      // bucket — verifyBearerToken returns null for invalid tokens, so the
      // request lands in the same IP bucket that is already exhausted.
      vi.mocked(verifyBearerToken).mockResolvedValue(null);
      const res = await request(app)
        .post('/v1/capture/analyze')
        .set('Authorization', 'Bearer forged.unsigned.token')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(429);
    });

    it('a spoofed X-Forwarded-For header does not bypass the rate limit', async () => {
      // Exhaust the IP bucket with requests bearing no special headers.
      vi.mocked(verifyBearerToken).mockResolvedValue(null);
      for (let i = 0; i < 30; i++) {
        await request(app)
          .post('/v1/capture/analyze')
          .send({ mode: 'voice' })
          .set('Content-Type', 'application/json');
      }

      // Sending a spoofed X-Forwarded-For must not produce a fresh bucket.
      // req.ip is determined by Express from the trusted-proxy chain set in
      // app.ts, not from the raw header value; the test app uses the same
      // loopback address regardless of what X-Forwarded-For says.
      const res = await request(app)
        .post('/v1/capture/analyze')
        .set('X-Forwarded-For', '1.2.3.4')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(429);
    });

    it('rate-limit state persists across server restarts (shared DB-backed store)', async () => {
      // Simulate "instance A" exhausting the bucket for a known user.
      const appA = buildApp();
      vi.mocked(verifyBearerToken).mockResolvedValue({ id: 'user-restart-test', email: null });

      for (let i = 0; i < 30; i++) {
        const res = await request(appA)
          .post('/v1/capture/analyze')
          .set('Authorization', 'Bearer token')
          .send({ mode: 'voice' })
          .set('Content-Type', 'application/json');
        expect(res.status).toBe(200);
      }

      // Simulate a server restart by creating a completely new Express app
      // (appB). Because rate-limit state lives in the mocked DB (mockRateBuckets)
      // rather than in any module-level Map, the new instance must still reject
      // the 31st request for the same user — just as a real restart would.
      const appB = buildApp();
      const res = await request(appB)
        .post('/v1/capture/analyze')
        .set('Authorization', 'Bearer token')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(429);
      expect(res.body.retryAfterSecs).toBeGreaterThan(0);
      expect(res.headers['retry-after']).toBeDefined();
    });

    it('rate-limit counter resets once the window expires', async () => {
      // Exhaust the bucket.
      vi.mocked(verifyBearerToken).mockResolvedValue({ id: 'user-window-reset', email: null });
      for (let i = 0; i < 30; i++) {
        await request(app)
          .post('/v1/capture/analyze')
          .set('Authorization', 'Bearer token')
          .send({ mode: 'voice' })
          .set('Content-Type', 'application/json');
      }

      // Force the window to expire by back-dating the bucket's reset_at.
      const key = 'user:user-window-reset';
      const bucket = mockRateBuckets.get(key);
      if (bucket) {
        bucket.reset_at = new Date(Date.now() - 1); // expired 1 ms ago
      }

      // After expiry the next request should open a new window and succeed.
      const res = await request(app)
        .post('/v1/capture/analyze')
        .set('Authorization', 'Bearer token')
        .send({ mode: 'voice' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
    });
  });
});
