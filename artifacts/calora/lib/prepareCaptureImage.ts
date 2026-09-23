import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/** Kept below the 12,000,000-character server schema limit with JSON headroom. */
export const MAX_CAPTURE_BASE64_CHARS = 11_000_000;
export const MAX_CAPTURE_EDGE_PX = 1_920;
export const MAX_CAPTURE_SOURCE_BYTES = 25 * 1024 * 1024;

export type CaptureImageAsset = {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  fileName?: string | null;
};

export type PreparedCaptureImage = {
  uri: string;
  base64: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  byteLength: number;
};

export class CaptureImagePreparationError extends Error {
  readonly name = 'CaptureImagePreparationError';
}

export function isSupportedImageMimeType(mimeType?: string | null, fileName?: string | null): boolean {
  const normalizedMime = mimeType?.toLowerCase();
  if (normalizedMime) return normalizedMime === 'image/jpeg' || normalizedMime === 'image/png' || normalizedMime === 'image/heic' || normalizedMime === 'image/heif';
  return /\.(jpe?g|png|heic|heif)$/i.test(fileName ?? '');
}

/** Returns a non-upscaling resize plan that preserves the original aspect ratio. */
export function captureResizePlan(width: number, height: number, maxEdge = MAX_CAPTURE_EDGE_PX): { width?: number; height?: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return {};
  }
  if (Math.max(width, height) <= maxEdge) return {};
  return width >= height ? { width: maxEdge } : { height: maxEdge };
}

export function base64ByteLength(base64: string): number {
  const normalized = base64.replace(/\s/g, '');
  if (!normalized) return 0;
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
}

function imageExtensionFromAsset(asset: CaptureImageAsset): string | null {
  const mime = asset.mimeType?.toLowerCase();
  if (mime === 'image/jpeg') return 'jpeg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic';
  const match = asset.fileName?.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function assertLocalCaptureUri(uri: string): void {
  if (!uri || uri.length > 2_048 || !/^(file|content):/i.test(uri)) {
    throw new CaptureImagePreparationError('This photo is unavailable on this device. Retake it or choose another image.');
  }
}

/**
 * Decodes the local image once, applies an EXIF-aware native decode/re-encode,
 * caps the long edge, and intentionally emits JPEG. The original URI/base64 is
 * not stored in Calora state, logs, analytics, or the diary.
 */
export async function prepareCaptureImage(asset: CaptureImageAsset): Promise<PreparedCaptureImage> {
  assertLocalCaptureUri(asset.uri);
  if (!isSupportedImageMimeType(asset.mimeType, asset.fileName)) {
    const extension = imageExtensionFromAsset(asset) ?? 'unknown format';
    throw new CaptureImagePreparationError(`Unsupported image format (${extension}). Choose a JPEG, PNG, or HEIC photo.`);
  }

  const source = await FileSystem.getInfoAsync(asset.uri);
  if (!source.exists) {
    throw new CaptureImagePreparationError('This photo is no longer available. Retake it or choose it again.');
  }
  if (typeof source.size === 'number' && source.size > MAX_CAPTURE_SOURCE_BYTES) {
    throw new CaptureImagePreparationError('This photo is too large to prepare safely. Retake it at a lower resolution or choose another image.');
  }

  const resize = captureResizePlan(asset.width ?? 0, asset.height ?? 0);
  let result: Awaited<ReturnType<typeof manipulateAsync>>;
  try {
    result = await manipulateAsync(
      asset.uri,
      Object.keys(resize).length ? [{ resize }] : [],
      { base64: true, compress: 0.82, format: SaveFormat.JPEG },
    );
  } catch {
    throw new CaptureImagePreparationError('This image could not be decoded. Choose a different JPEG, PNG, or HEIC photo.');
  }

  const base64 = result.base64?.replace(/\s/g, '') ?? '';
  if (!base64 || base64ByteLength(base64) === 0) {
    throw new CaptureImagePreparationError('This image could not be encoded for analysis. Retake it or choose another photo.');
  }
  if (base64.length > MAX_CAPTURE_BASE64_CHARS) {
    throw new CaptureImagePreparationError('This photo remains too large after resizing. Retake it closer or choose another image.');
  }

  return {
    uri: result.uri,
    base64,
    mimeType: 'image/jpeg',
    width: result.width,
    height: result.height,
    byteLength: base64ByteLength(base64),
  };
}
