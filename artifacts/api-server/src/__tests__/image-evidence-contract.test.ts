import { describe, expect, it } from 'vitest';
import { ListDiaryEntriesResponse, SyncOutboxResponse } from '@workspace/api-zod';
import { readFileSync } from 'node:fs';

const generatedClientTypes = readFileSync(
  new URL('../../../../lib/api-client-react/src/generated/api.schemas.ts', import.meta.url),
  'utf8',
);

const ACCOUNT_ID = 'supabase-user-a';
const ENTRY_ID = '4f8a2c9e-1b3d-4e5f-8a7b-9c0d1e2f3a4b';
const MUTATION_ID = '5f8a2c9e-1b3d-4e5f-8a7b-9c0d1e2f3a4c';

const imageEvidence = {
  version: 1 as const,
  semanticRole: 'exact' as const,
  accountScope: ACCOUNT_ID,
  contentId: 'food-product:open-food-facts:12345678',
  source: 'barcode-provider',
  provider: 'Open Food Facts',
  providerItemId: '12345678',
  imageId: 'front',
  locator: 'https://images.openfoodfacts.org/products/12345678/front.jpg',
  retrievedAt: '2026-09-23T12:00:00.000Z',
  attribution: 'Open Food Facts · CC BY-SA',
  rightsReviewState: 'approved' as const,
};

const diaryEntry = {
  id: ENTRY_ID,
  entryDate: '2026-09-23',
  meal: 'Lunch' as const,
  name: 'Verified product',
  serving: '1 package',
  calories: 320,
  proteinG: 12,
  carbsG: 42,
  fatG: 10,
  provenance: 'Barcode verified' as const,
  confidence: 98,
  clientUpdatedAt: '2026-09-23T12:01:00.000Z',
  updatedAt: '2026-09-23T12:01:00.000Z',
  notes: null,
  imageUrl: imageEvidence.locator,
  imageSource: 'Open Food Facts',
};

const syncRecord = {
  clientId: 'log-verified-product',
  captureSessionId: ENTRY_ID,
  entryDate: '2026-09-23',
  meal: 'Lunch' as const,
  name: 'Verified product',
  serving: '1 package',
  calories: 320,
  proteinG: 12,
  carbsG: 42,
  fatG: 10,
  provenance: 'Barcode verified' as const,
  confidence: 98,
  notes: null,
  imageUrl: imageEvidence.locator,
  imageSource: 'Open Food Facts',
  clientUpdatedAt: '2026-09-23T12:01:00.000Z',
};

describe('generated image evidence response contracts', () => {
  it('retains server-derived accountScope through the diary response validator and client type', () => {
    const parsed = ListDiaryEntriesResponse.parse({
      date: '2026-09-23',
      entries: [{ ...diaryEntry, imageEvidence }],
    });
    expect(parsed.entries[0].imageEvidence).toMatchObject({
      semanticRole: 'exact',
      accountScope: ACCOUNT_ID,
      providerItemId: '12345678',
    });

    expect(generatedClientTypes).toContain('export type DiaryEntry = DiaryEntryInput & {');
    expect(generatedClientTypes).toContain('imageEvidence?: ImageEvidence;');
  });

  it('accepts legacy diary response rows without additive image evidence', () => {
    const parsed = ListDiaryEntriesResponse.safeParse({
      date: '2026-09-23',
      entries: [diaryEntry],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.entries[0].imageEvidence).toBeUndefined();
  });

  it('retains server-derived accountScope through the sync response validator and client type', () => {
    const parsed = SyncOutboxResponse.parse({
      accepted: [MUTATION_ID],
      conflicts: [],
      records: [{ ...syncRecord, imageEvidence }],
      nextCursor: '2026-09-23T12:01:00.000Z',
    });
    expect(parsed.records[0].imageEvidence).toMatchObject({
      semanticRole: 'exact',
      accountScope: ACCOUNT_ID,
      imageId: 'front',
    });

    expect(generatedClientTypes).toContain('export interface SyncDiaryRecord');
    expect(generatedClientTypes).toContain('imageEvidence?: ImageEvidence;');
  });

  it('accepts legacy sync response rows without additive image evidence', () => {
    const parsed = SyncOutboxResponse.safeParse({
      accepted: [],
      conflicts: [],
      records: [syncRecord],
      nextCursor: '2026-09-23T12:01:00.000Z',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.records[0].imageEvidence).toBeUndefined();
  });
});
