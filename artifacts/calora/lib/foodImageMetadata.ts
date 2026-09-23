import {
  normalizeSignedRecipePhotoUrl,
  normalizeTrustedFoodImageUrl,
} from '@workspace/api-zod/image-source-policy';
import { foodImageKeyForName, type FoodImageKey } from './mealImageIdentity';

export type FoodImageSource = 'provider' | 'recipe' | 'planner' | 'generated' | 'restaurant_representative';

export type FoodImageSemanticRole =
  | 'exact'
  | 'canonical'
  | 'generated'
  | 'user_local'
  | 'representative'
  | 'no_image'
  | 'fallback'
  | 'unverified';

export type FoodImageEvidence = {
  version: 1;
  semanticRole: FoodImageSemanticRole;
  /** Server-owned scope when evidence was returned by an authenticated API. */
  accountScope?: string;
  contentId?: string;
  source?: string;
  provider?: string;
  providerItemId?: string;
  imageId?: string;
  imageVersion?: string;
  assetKey?: string;
  locator?: string;
  verifiedAt?: string;
  retrievedAt?: string;
  expiresAt?: string;
  attribution?: string;
  rightsReviewState?: 'unreviewed' | 'reviewed' | 'approved' | 'restricted';
};

export type FoodImageCategory = 'breakfast' | 'main' | 'snack' | 'drink';
const DRINK_WORDS = /\b(water|coffee|tea|juice|smoothie|shake|milk|latte|soda|drink|beverage)\b/i;
const SNACK_WORDS = /\b(apple|banana|berry|berries|fruit|nuts?|yogurt|snack|bar|cookie|chips?|popcorn)\b/i;
const BREAKFAST_WORDS = /\b(oats?|cereal|egg|toast|pancake|waffle|breakfast|granola)\b/i;

/** A declaration of the truth Calora can present for a food image. */
export type FoodImageResolutionState =
  | 'exact'
  | 'canonical'
  | 'generated'
  | 'unverified'
  | 'representative'
  | 'no-image'
  | 'fallback';

export type FoodImageResolutionInput = {
  id: string;
  name: string;
  meal?: string;
  source?: string;
  imageUrl?: string | null;
  imageSource?: FoodImageSource;
  imageAssetKey?: string | null;
  imageEvidence?: FoodImageEvidence;
};

type FoodImageResolutionBase = {
  category: FoodImageCategory;
  /** Content identity + semantic role + durable image identity. */
  recyclingKey: string;
};

export type FoodImageResolution =
  | (FoodImageResolutionBase & {
    state: 'exact' | 'generated' | 'unverified';
    imageUrl: string;
    accessibilityLabel: string;
    visibleDisclosure?: string;
  })
  | (FoodImageResolutionBase & {
    state: 'canonical';
    imageAssetKey: FoodImageKey;
    accessibilityLabel: string;
  })
  | (FoodImageResolutionBase & {
    state: 'representative';
    imageAssetKey: string;
    accessibilityLabel: string;
    visibleDisclosure: 'Representative image';
  })
  | (FoodImageResolutionBase & {
    state: 'no-image';
    accessibilityLabel: string;
    visibleDisclosure: 'No photo';
  })
  | (FoodImageResolutionBase & {
    state: 'fallback';
    accessibilityLabel: string;
  });

/** Only trusted HTTPS image locations may leave capture review. */
export function normalizeFoodImageUrl(value: unknown): string | undefined {
  return normalizeTrustedFoodImageUrl(value);
}

/** Only an authenticated server-signed private recipe-photo capability is accepted. */
export function normalizeGeneratedRecipeImageUrl(value: unknown, imageId: unknown, accountScope: unknown): string | undefined {
  return normalizeSignedRecipePhotoUrl(value, imageId, accountScope);
}

const IMAGE_ROLES = new Set<FoodImageSemanticRole>([
  'exact',
  'canonical',
  'generated',
  'user_local',
  'representative',
  'no_image',
  'fallback',
  'unverified',
]);

const RIGHTS_STATES = new Set<NonNullable<FoodImageEvidence['rightsReviewState']>>([
  'unreviewed',
  'reviewed',
  'approved',
  'restricted',
]);

function evidenceText(value: unknown, maxLength = 160): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function evidenceTime(value: unknown): string | undefined {
  const candidate = value instanceof Date ? value.toISOString() : value;
  if (typeof candidate !== 'string' || Number.isNaN(Date.parse(candidate))) return undefined;
  return new Date(candidate).toISOString();
}

/**
 * Normalizes persisted/server evidence without promoting a URL, display name,
 * or provider label into an exact content assertion.
 */
export function normalizeFoodImageEvidence(value: unknown): FoodImageEvidence | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || typeof raw.semanticRole !== 'string' || !IMAGE_ROLES.has(raw.semanticRole as FoodImageSemanticRole)) {
    return undefined;
  }

  const requestedRole = raw.semanticRole as FoodImageSemanticRole;
  const contentId = evidenceText(raw.contentId);
  const source = evidenceText(raw.source, 80);
  const provider = evidenceText(raw.provider, 80);
  const providerItemId = evidenceText(raw.providerItemId);
  const imageId = evidenceText(raw.imageId);
  const imageVersion = evidenceText(raw.imageVersion);
  const assetKey = evidenceText(raw.assetKey);
  const accountScope = evidenceText(raw.accountScope, 200);
  const locator = requestedRole === 'generated'
    ? normalizeGeneratedRecipeImageUrl(raw.locator, imageId, accountScope)
    : normalizeFoodImageUrl(raw.locator);
  const verifiedAt = evidenceTime(raw.verifiedAt);
  const retrievedAt = evidenceTime(raw.retrievedAt);
  const expiresAt = evidenceTime(raw.expiresAt);
  const attribution = evidenceText(raw.attribution, 500);
  const rightsReviewState = typeof raw.rightsReviewState === 'string'
    && RIGHTS_STATES.has(raw.rightsReviewState as NonNullable<FoodImageEvidence['rightsReviewState']>)
    ? raw.rightsReviewState as NonNullable<FoodImageEvidence['rightsReviewState']>
    : undefined;

  const semanticRole = requestedRole === 'exact' && !(contentId && provider && (providerItemId || imageId) && (verifiedAt || retrievedAt) && rightsReviewState === 'approved')
    ? 'unverified'
    : requestedRole === 'canonical' && !(contentId && assetKey)
      ? 'unverified'
    : requestedRole === 'generated' && !(contentId && imageId && accountScope)
        ? 'unverified'
        : requestedRole === 'user_local' && !(contentId && imageId)
          ? 'unverified'
          : requestedRole === 'representative' && !(assetKey || imageId)
            ? 'unverified'
            : requestedRole;

  return {
    version: 1,
    semanticRole,
    ...(accountScope ? { accountScope } : {}),
    ...(contentId ? { contentId } : {}),
    ...(source ? { source } : {}),
    ...(provider ? { provider } : {}),
    ...(providerItemId ? { providerItemId } : {}),
    ...(imageId ? { imageId } : {}),
    ...(imageVersion ? { imageVersion } : {}),
    ...(assetKey ? { assetKey } : {}),
    ...(locator ? { locator } : {}),
    ...(verifiedAt ? { verifiedAt } : {}),
    ...(retrievedAt ? { retrievedAt } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    ...(attribution ? { attribution } : {}),
    ...(rightsReviewState ? { rightsReviewState } : {}),
  };
}

/** Converts serializable local timestamps to the generated API input shape. */
export function foodImageEvidenceForApi(value: FoodImageEvidence | undefined) {
  const evidence = normalizeFoodImageEvidence(value);
  if (!evidence) return undefined;
  const { accountScope: _serverOwnedScope, verifiedAt, retrievedAt, expiresAt, ...rest } = evidence;
  return {
    ...rest,
    ...(verifiedAt ? { verifiedAt: new Date(verifiedAt) } : {}),
    ...(retrievedAt ? { retrievedAt: new Date(retrievedAt) } : {}),
    ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
  };
}

export function normalizeFoodImageMetadata(
  imageUrl: unknown,
  imageSource: unknown,
  imageEvidence?: unknown,
): { imageUrl?: string; imageSource?: FoodImageSource; imageEvidence?: FoodImageEvidence } {
  const normalizedEvidence = normalizeFoodImageEvidence(imageEvidence);
  const normalizedSource = normalizedEvidence?.semanticRole === 'generated'
    ? 'generated'
    : imageSource === 'provider'
      || imageSource === 'recipe'
      || imageSource === 'planner'
      || imageSource === 'generated'
      || imageSource === 'restaurant_representative'
      ? imageSource
      : undefined;
  const normalizedUrl = normalizedSource === 'generated' && normalizedEvidence?.semanticRole === 'generated'
    ? normalizeGeneratedRecipeImageUrl(imageUrl, normalizedEvidence.imageId, normalizedEvidence.accountScope) ?? normalizedEvidence.locator
    : normalizeFoodImageUrl(imageUrl);
  return {
    imageUrl: normalizedUrl,
    // A representative bundled restaurant asset has no URL by design. Keep
    // that provenance label so local identity survives a diary restore.
    imageSource: normalizedSource === 'restaurant_representative'
      ? normalizedSource
      : normalizedUrl
        ? normalizedSource
        : undefined,
    ...(normalizedEvidence ? { imageEvidence: normalizedEvidence } : {}),
  };
}

export function foodImageCategory(food: { name: string; meal?: string }): FoodImageCategory {
  if (DRINK_WORDS.test(food.name)) return 'drink';
  if (food.meal === 'Breakfast' || BREAKFAST_WORDS.test(food.name)) return 'breakfast';
  if (food.meal === 'Snack' || SNACK_WORDS.test(food.name)) return 'snack';
  return 'main';
}

/** Resolves the only image role a thumbnail may honestly render. */
export function resolveFoodImage(input: FoodImageResolutionInput): FoodImageResolution {
  const category = foodImageCategory(input);
  const evidence = normalizeFoodImageEvidence(input.imageEvidence);
  const imageUrl = evidence?.semanticRole === 'generated'
    ? normalizeGeneratedRecipeImageUrl(input.imageUrl, evidence.imageId, evidence.accountScope) ?? evidence.locator
    : normalizeFoodImageUrl(input.imageUrl);
  const canonicalImageKey = foodImageKeyForName(input.name);
  const representativeAssetKey = input.imageSource === 'restaurant_representative'
    && input.imageAssetKey?.startsWith('restaurant:')
    ? input.imageAssetKey
    : undefined;
  const restaurantContent = input.source === 'Restaurant verified'
    || input.imageSource === 'restaurant_representative'
    || input.imageAssetKey?.startsWith('restaurant:');
  const hasTypedRemoteImage = Boolean(
    imageUrl
    && input.imageSource
    && input.imageSource !== 'restaurant_representative',
  );
  const evidenceLocatorMatches = Boolean(imageUrl && evidence?.locator === imageUrl);
  const remoteState: 'exact' | 'generated' | 'unverified' = evidenceLocatorMatches && evidence?.semanticRole === 'exact'
    ? 'exact'
    : evidenceLocatorMatches && evidence?.semanticRole === 'generated'
      ? 'generated'
      : 'unverified';
  const withKey = (state: FoodImageResolutionState, identity: string) =>
    `food-log:${input.id}:${state}:${identity}`;
  const remoteDisclosure = remoteState === 'generated'
    ? 'AI-generated image'
    : remoteState === 'exact' && evidence?.provider === 'Open Food Facts'
      ? 'Open Food Facts · CC BY-SA'
      : remoteState === 'unverified'
        ? 'Unverified provider image'
        : undefined;

  // A remote locator may render only with its actual evidence state. A URL or
  // source label alone is never promoted to exact. Planner's closed curated
  // catalog remains authoritative when its visible name resolves to one.
  if (hasTypedRemoteImage && imageUrl && !(input.imageSource === 'planner' && canonicalImageKey)) {
    return {
      state: remoteState,
      category,
      imageUrl,
      recyclingKey: withKey(remoteState, `remote:${imageUrl}`),
      accessibilityLabel: remoteState === 'generated'
        ? `${input.name} generated image`
        : remoteState === 'exact'
          ? `${input.name} exact provider image`
          : `${input.name} provider image; exact item binding is not verified`,
      ...(remoteDisclosure ? { visibleDisclosure: remoteDisclosure } : {}),
    };
  }

  if (representativeAssetKey) {
    return {
      state: 'representative',
      category,
      imageAssetKey: representativeAssetKey,
      recyclingKey: withKey('representative', representativeAssetKey),
      accessibilityLabel: `${input.name} representative category image, not the exact menu item`,
      visibleDisclosure: 'Representative image',
    };
  }

  if (restaurantContent) {
    return {
      state: 'no-image',
      category,
      recyclingKey: withKey('no-image', 'restaurant'),
      accessibilityLabel: `${input.name} restaurant item, no verified photo available`,
      visibleDisclosure: 'No photo',
    };
  }

  if (canonicalImageKey) {
    return {
      state: 'canonical',
      category,
      imageAssetKey: canonicalImageKey,
      recyclingKey: withKey('canonical', canonicalImageKey),
      accessibilityLabel: `${input.name} canonical Calora image`,
    };
  }

  // A planner item without a current canonical name can retain its remote
  // locator, but never a stale stored local key or a fabricated exact claim.
  if (hasTypedRemoteImage && imageUrl) {
    return {
      state: remoteState,
      category,
      imageUrl,
      recyclingKey: withKey(remoteState, `remote:${imageUrl}`),
      accessibilityLabel: remoteState === 'generated'
        ? `${input.name} generated image`
        : remoteState === 'exact'
          ? `${input.name} exact provider image`
          : `${input.name} provider image; exact item binding is not verified`,
      ...(remoteDisclosure ? { visibleDisclosure: remoteDisclosure } : {}),
    };
  }

  return {
    state: 'fallback',
    category,
    recyclingKey: withKey('fallback', category),
    accessibilityLabel: `${input.name}, representative Calora ${category} meal illustration`,
  };
}
