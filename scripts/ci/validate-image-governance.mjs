import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const DEFAULT_MANIFEST_PATH = "artifacts/calora/assets/image-surface-manifest.json";
export const REVIEWED_LAUNCH_BACKGROUND = "#f7f8f3";
const IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|gif|svg)$/i;
const SOURCE_DIRECTORIES = [
  "artifacts/calora/app",
  "artifacts/calora/components",
  "artifacts/calora/constants",
  "artifacts/calora/context",
  "artifacts/calora/data",
  "artifacts/calora/hooks",
  "artifacts/calora/lib",
];
const SKIPPED_SOURCE_PATH = /(?:^|\/)(?:__tests__|node_modules)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/;
export const IMAGE_PERFORMANCE_BUDGET = Object.freeze({
  maximumAssetCount: 64,
  maximumCompressedBytesPerAsset: 900_000,
  maximumCompressedBytesTotal: 14 * 1024 * 1024,
  maximumPixelsPerAsset: 1_600_000,
  maximumDecodedRgbaBytesTotal: 256 * 1024 * 1024,
});

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function sortedFiles(root, directory, predicate) {
  const absoluteDirectory = path.resolve(root, directory);
  if (!existsSync(absoluteDirectory)) return [];
  const files = [];
  const visit = (absolutePath) => {
    for (const entry of readdirSync(absolutePath, { withFileTypes: true })) {
      const child = path.join(absolutePath, entry.name);
      if (entry.isDirectory()) {
        visit(child);
      } else if (entry.isFile() && predicate(child)) {
        files.push(normalizePath(path.relative(root, child)));
      }
    }
  };
  visit(absoluteDirectory);
  return files.sort((left, right) => left.localeCompare(right));
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

export function collectDirectImageRenderers(root) {
  const renderers = [];
  const sourceFiles = SOURCE_DIRECTORIES.flatMap((directory) =>
    sortedFiles(root, directory, (absolutePath) => {
      const relativePath = normalizePath(path.relative(root, absolutePath));
      return /\.[jt]sx?$/.test(absolutePath) && !SKIPPED_SOURCE_PATH.test(relativePath);
    }),
  );

  for (const relativePath of sourceFiles) {
    const source = readFileSync(path.resolve(root, relativePath), "utf8");
    const openingTag = /<Image(?:Background)?\b/g;
    for (let match = openingTag.exec(source); match; match = openingTag.exec(source)) {
      const end = source.indexOf("/>", match.index);
      if (end === -1) {
        renderers.push({
          path: relativePath,
          line: lineNumber(source, match.index),
          tag: source.slice(match.index),
        });
        continue;
      }
      renderers.push({
        path: relativePath,
        line: lineNumber(source, match.index),
        tag: source.slice(match.index, end + 2),
      });
      openingTag.lastIndex = end + 2;
    }
  }
  return renderers;
}

export function collectBundledAssets(root) {
  return sortedFiles(root, "artifacts/calora/assets/images", (absolutePath) =>
    IMAGE_EXTENSION.test(absolutePath),
  );
}

function collectRuntimeSourceFiles(root) {
  return SOURCE_DIRECTORIES.flatMap((directory) =>
    sortedFiles(root, directory, (absolutePath) => {
      const relativePath = normalizePath(path.relative(root, absolutePath));
      return /\.[cm]?[jt]sx?$/.test(absolutePath) && !SKIPPED_SOURCE_PATH.test(relativePath);
    }),
  );
}

function propertyNameText(name) {
  if (!name) return "";
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return "";
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    current
    && (ts.isParenthesizedExpression(current)
      || ts.isAsExpression(current)
      || ts.isTypeAssertionExpression(current)
      || ts.isSatisfiesExpression(current))
  ) current = current.expression;
  return current;
}

function evaluateStaticString(expression, variables) {
  const current = unwrapExpression(expression);
  if (!current) return undefined;
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return current.text;
  if (ts.isIdentifier(current)) return variables.get(current.text);
  if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = evaluateStaticString(current.left, variables);
    const right = evaluateStaticString(current.right, variables);
    return left === undefined || right === undefined ? undefined : `${left}${right}`;
  }
  if (ts.isTemplateExpression(current)) {
    let value = current.head.text;
    for (const span of current.templateSpans) {
      const evaluated = evaluateStaticString(span.expression, variables);
      if (evaluated === undefined) return undefined;
      value += `${evaluated}${span.literal.text}`;
    }
    return value;
  }
  return undefined;
}

function imageContextName(node) {
  if (ts.isPropertyAssignment(node)) return propertyNameText(node.name);
  if (ts.isJsxAttribute(node)) return node.name.text;
  return "";
}

function hasImageContext(node) {
  let current = node;
  for (let depth = 0; current && depth < 4; depth += 1, current = current.parent) {
    if (/(?:image|photo|picture|thumbnail|avatar|artwork|poster|icon|splash|background|\buri\b|\bsource\b)/i.test(imageContextName(current))) {
      return true;
    }
    if ((ts.isJsxSelfClosingElement(current) || ts.isJsxElement(current)) && /^Image(?:Background)?$/.test(current.tagName?.getText?.() ?? current.openingElement?.tagName?.getText?.() ?? "")) {
      return true;
    }
  }
  return false;
}

export function collectStaticExternalImageUrls(root) {
  const urls = new Set();
  for (const relativePath of collectRuntimeSourceFiles(root)) {
    const source = readFileSync(path.resolve(root, relativePath), "utf8");
    const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true);
    const variables = new Map();
    const declarations = [];
    const collectDeclarations = (node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        declarations.push(node);
      }
      ts.forEachChild(node, collectDeclarations);
    };
    collectDeclarations(sourceFile);
    for (let pass = 0; pass < declarations.length; pass += 1) {
      let changed = false;
      for (const declaration of declarations) {
        const value = evaluateStaticString(declaration.initializer, variables);
        if (typeof value === "string" && variables.get(declaration.name.text) !== value) {
          variables.set(declaration.name.text, value);
          changed = true;
        }
      }
      if (!changed) break;
    }

    const visit = (node) => {
      let expression;
      if (ts.isVariableDeclaration(node)) expression = node.initializer;
      else if (ts.isPropertyAssignment(node)) expression = node.initializer;
      else if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) expression = node.initializer;
      else if (ts.isJsxExpression(node)) expression = node.expression;
      else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node) || ts.isBinaryExpression(node)) expression = node;
      const value = expression ? evaluateStaticString(expression, variables) : undefined;
      if (
        typeof value === "string"
        && /^https?:\/\//i.test(value)
        && hasImageContext(node)
      ) urls.add(value);
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return [...urls].sort((left, right) => left.localeCompare(right));
}

function errorFor(failures, message) {
  failures.push(`[image-governance] ${message}`);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function validateLaunchBackground(root, failures) {
  const configPath = path.resolve(root, "artifacts/calora/app.json");
  const layoutPath = path.resolve(root, "artifacts/calora/app/_layout.tsx");
  if (!existsSync(configPath) || !existsSync(layoutPath)) {
    errorFor(failures, "authoritative Expo configuration or root layout is missing");
    return;
  }
  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    errorFor(failures, `authoritative Expo configuration is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`);
    return;
  }
  const nativeSplashBackground = config?.expo?.splash?.backgroundColor;
  const layoutSource = readFileSync(layoutPath, "utf8");
  const bootstrapBackground = layoutSource.match(/bootstrapPage:\s*\{[\s\S]*?backgroundColor:\s*['"]([^'"]+)['"]/)?.[1];
  if (nativeSplashBackground !== REVIEWED_LAUNCH_BACKGROUND) {
    errorFor(failures, `native splash background must be ${REVIEWED_LAUNCH_BACKGROUND}`);
  }
  if (bootstrapBackground !== REVIEWED_LAUNCH_BACKGROUND) {
    errorFor(failures, `earliest JavaScript bootstrap background must be ${REVIEWED_LAUNCH_BACKGROUND}`);
  }
}

function requireSourceContract(root, failures, relativePath, snippets) {
  const absolutePath = path.resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    errorFor(failures, `required image-integrity source is missing: ${relativePath}`);
    return;
  }
  const source = readFileSync(absolutePath, "utf8");
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      errorFor(failures, `required image-integrity contract is missing from ${relativePath}: ${snippet}`);
    }
  }
}

function validateEvidenceArchitecture(root, failures) {
  requireSourceContract(root, failures, ".github/workflows/release-validation.yml", [
    "Validate image governance",
    "node scripts/ci/validate-image-governance.mjs",
  ]);
  requireSourceContract(root, failures, "lib/api-spec/openapi.yaml", [
    "ImageEvidence:",
    "ImageEvidenceInput:",
    "accountScope:",
    "imageEvidence:",
  ]);
  requireSourceContract(root, failures, "artifacts/api-server/src/routes/capture.ts", [
    "normalizeImageEvidence(",
    "{ allowExact: true }",
    "candidate.imageEvidence = imageEvidence",
  ]);
  requireSourceContract(root, failures, "artifacts/api-server/src/routes/sync.ts", [
    "matchesCaptureImageEvidence(",
    "aiCaptureCandidatesTable.evidence",
    "semanticRole === \"exact\"",
  ]);
  requireSourceContract(root, failures, "artifacts/api-server/src/routes/diary.ts", [
    "matchesCaptureImageEvidence(",
    "evidence: aiCaptureCandidatesTable.evidence",
    "{ allowExact: true }",
  ]);
  requireSourceContract(root, failures, "lib/api-zod/src/image-source-policy.ts", [
    "normalizeSignedRecipePhotoUrl",
    "private",
    "recipe-photos",
    "accountScope",
  ]);
  requireSourceContract(root, failures, "artifacts/calora/lib/foodImageMetadata.ts", [
    "FoodImageSemanticRole",
    "requestedRole === 'exact'",
    "normalizeGeneratedRecipeImageUrl",
    "Open Food Facts · CC BY-SA",
  ]);
  requireSourceContract(root, failures, "artifacts/calora/components/FoodLogThumbnail.tsx", [
    "imageEvidence,",
    "resolution.visibleDisclosure",
    "recyclingKey={`${resolution.recyclingKey}",
  ]);
  requireSourceContract(root, failures, "artifacts/calora/lib/generatedRecipeImageLifecycle.ts", [
    "accountId",
    "isAccountActive",
    "account-changed",
    "imageId",
    "imageUrlExpiresAt",
  ]);
  requireSourceContract(root, failures, "artifacts/calora/lib/plannerImageRendering.ts", [
    "Canonical assets always win",
    "normalizeTrustedFoodImageUrl",
    "plannerStoredImageKeyMismatch",
  ]);
  requireSourceContract(root, failures, "artifacts/calora/lib/foodMemory.ts", [
    "plannerImageRenderDecision",
    "normalizeGeneratedRecipeImageUrl(recipe.image, recipe.imageId, accountScope)",
    "accountScope",
  ]);
}

function sha256File(absolutePath) {
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function decodeImageMetadata(absolutePath) {
  const bytes = readFileSync(absolutePath);
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { format: "PNG", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 10 && /^(?:GIF87a|GIF89a)$/.test(bytes.subarray(0, 6).toString("ascii"))) {
    return { format: "GIF", width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  }
  if (bytes.length >= 30 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    const kind = bytes.subarray(12, 16).toString("ascii");
    if (kind === "VP8X") return { format: "WEBP", width: readUInt24LE(bytes, 24) + 1, height: readUInt24LE(bytes, 27) + 1 };
    if (kind === "VP8 " && bytes.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
      return { format: "WEBP", width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    }
    if (kind === "VP8L" && bytes[20] === 0x2f) {
      const packed = bytes.readUInt32LE(21);
      return { format: "WEBP", width: (packed & 0x3fff) + 1, height: ((packed >>> 14) & 0x3fff) + 1 };
    }
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 1 >= bytes.length) break;
      const segmentLength = bytes.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
      if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
        return { format: "JPEG", width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
      }
      offset += segmentLength;
    }
  }
  const text = bytes.subarray(0, Math.min(bytes.length, 8192)).toString("utf8");
  if (/^\s*(?:<\?xml[^>]*>\s*)?<svg\b/i.test(text)) {
    const width = Number(text.match(/\bwidth=["']([0-9.]+)/i)?.[1]);
    const height = Number(text.match(/\bheight=["']([0-9.]+)/i)?.[1]);
    const viewBox = text.match(/\bviewBox=["']\s*[+-]?[\d.]+[\s,]+[+-]?[\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    return {
      format: "SVG",
      width: Number.isFinite(width) && width > 0 ? width : Number(viewBox?.[1]),
      height: Number.isFinite(height) && height > 0 ? height : Number(viewBox?.[2]),
    };
  }
  return null;
}

function validateProvenanceLedger(root, assets, failures) {
  const ledgerPath = path.resolve(root, "docs/image-assets/GENERATED_ASSET_PROVENANCE.md");
  if (!existsSync(ledgerPath)) {
    errorFor(failures, "generated asset provenance ledger is missing");
    return;
  }
  const ledger = readFileSync(ledgerPath, "utf8");
  const rows = new Map();
  const rowPattern = /^\|\s*`([^`]+)`\s*\|\s*(\d+)×(\d+)\s*\|\s*`([a-f0-9]{64})`\s*\|\s*([^|]+?)\s*\|$/gim;
  for (let match = rowPattern.exec(ledger); match; match = rowPattern.exec(ledger)) {
    if (rows.has(match[1])) errorFor(failures, `generated asset provenance ledger contains duplicate path: ${match[1]}`);
    rows.set(match[1], {
      width: Number(match[2]),
      height: Number(match[3]),
      sha256: match[4].toLowerCase(),
      role: match[5].trim(),
    });
  }
  if (rows.size !== assets.length) {
    errorFor(failures, `generated asset provenance ledger must contain exactly ${assets.length} asset rows (found ${rows.size})`);
  }
  const assetPaths = new Set(assets.map((asset) => asset.path));
  for (const asset of assets) {
    const row = rows.get(asset.path);
    if (!row) {
      errorFor(failures, `generated asset provenance ledger is missing: ${asset.path}`);
      continue;
    }
    if (row.width !== asset.width || row.height !== asset.height) errorFor(failures, `generated asset provenance ledger dimensions do not match manifest: ${asset.path}`);
    if (row.sha256 !== String(asset.sha256).toLowerCase()) errorFor(failures, `generated asset provenance ledger hash does not match manifest: ${asset.path}`);
    if (row.role !== asset.role) errorFor(failures, `generated asset provenance ledger role does not match manifest: ${asset.path}`);
  }
  for (const ledgerPathEntry of rows.keys()) {
    if (!assetPaths.has(ledgerPathEntry)) errorFor(failures, `generated asset provenance ledger has an unmanifested row: ${ledgerPathEntry}`);
  }
}

export function validateImageGovernance({
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  manifestPath = DEFAULT_MANIFEST_PATH,
} = {}) {
  const failures = [];
  const normalizedManifestPath = normalizePath(manifestPath);
  const absoluteManifestPath = path.resolve(root, normalizedManifestPath);
  if (!existsSync(absoluteManifestPath)) {
    return { ok: false, failures: [`[image-governance] manifest is missing: ${normalizedManifestPath}`] };
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(absoluteManifestPath, "utf8"));
  } catch (error) {
    return {
      ok: false,
      failures: [`[image-governance] manifest is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}`],
    };
  }

  if (manifest.schemaVersion !== "calora.image-surface-manifest.v1") {
    errorFor(failures, "schemaVersion must be calora.image-surface-manifest.v1");
  }
  if (!Array.isArray(manifest.bundledAssets)) {
    errorFor(failures, "bundledAssets must be an array");
  }
  if (!Array.isArray(manifest.staticExternalImageUrls)) {
    errorFor(failures, "staticExternalImageUrls must be an array");
  }
  if (!Array.isArray(manifest.directImageRenderers)) {
    errorFor(failures, "directImageRenderers must be an array");
  }
  if (failures.length > 0) return { ok: false, failures };

  validateLaunchBackground(root, failures);
  validateEvidenceArchitecture(root, failures);

  const assetPaths = manifest.bundledAssets.map((asset) => asset?.path);
  if (uniqueStrings(assetPaths).length !== assetPaths.length) {
    errorFor(failures, "bundledAssets contains duplicate paths");
  }
  if (manifest.bundledAssets.length > IMAGE_PERFORMANCE_BUDGET.maximumAssetCount) {
    errorFor(failures, `bundled asset count exceeds ${IMAGE_PERFORMANCE_BUDGET.maximumAssetCount}`);
  }
  let compressedBytesTotal = 0;
  let decodedRgbaBytesTotal = 0;
  for (const asset of manifest.bundledAssets) {
    if (!nonEmptyString(asset?.path) || !asset.path.startsWith("artifacts/calora/assets/images/") || !IMAGE_EXTENSION.test(asset.path)) {
      errorFor(failures, `bundled asset has an invalid image path: ${String(asset?.path)}`);
      continue;
    }
    for (const field of [
      "role",
      "owner",
      "source",
      "creator",
      "provenanceLicenseStatus",
      "permittedUse",
      "attribution",
      "reviewStatus",
      "reviewer",
      "reviewDate",
      "sha256",
    ]) {
      if (!nonEmptyString(asset[field])) {
        errorFor(failures, `bundled asset ${asset.path} is missing ${field}`);
      }
    }
    if (asset.reviewStatus !== "approved") {
      errorFor(failures, `bundled asset ${asset.path} is not approved for release`);
    }
    if (!String(asset.provenanceLicenseStatus ?? "").startsWith("approved")) {
      errorFor(failures, `bundled asset ${asset.path} lacks approved provenance and usage rights`);
    }
    if (!Number.isInteger(asset.width) || asset.width <= 0) {
      errorFor(failures, `bundled asset ${asset.path} has an invalid width`);
    }
    if (!Number.isInteger(asset.height) || asset.height <= 0) {
      errorFor(failures, `bundled asset ${asset.path} has an invalid height`);
    }
    if (!new Set(["JPEG", "PNG", "WEBP", "GIF", "SVG"]).has(asset.format)) {
      errorFor(failures, `bundled asset ${asset.path} has an invalid format`);
    }
    if (!/^[a-f0-9]{64}$/i.test(String(asset.sha256 ?? ""))) {
      errorFor(failures, `bundled asset ${asset.path} has an invalid sha256 digest`);
    }
    if (!Array.isArray(asset.renderConsumers) || asset.renderConsumers.length === 0) {
      errorFor(failures, `bundled asset ${asset.path} must declare renderConsumers`);
    }
    const absoluteAssetPath = path.resolve(root, asset.path);
    if (!existsSync(absoluteAssetPath)) {
      errorFor(failures, `manifest asset is missing from disk: ${asset.path}`);
    } else {
      const compressedBytes = statSync(absoluteAssetPath).size;
      compressedBytesTotal += compressedBytes;
      if (compressedBytes > IMAGE_PERFORMANCE_BUDGET.maximumCompressedBytesPerAsset) {
        errorFor(failures, `bundled asset exceeds the ${IMAGE_PERFORMANCE_BUDGET.maximumCompressedBytesPerAsset}-byte compressed budget: ${asset.path}`);
      }
      const decoded = decodeImageMetadata(absoluteAssetPath);
      if (!decoded) {
        errorFor(failures, `bundled asset format could not be decoded: ${asset.path}`);
      } else {
        decodedRgbaBytesTotal += decoded.width * decoded.height * 4;
        if (decoded.width !== asset.width || decoded.height !== asset.height) {
          errorFor(failures, `bundled asset dimensions do not match the manifest: ${asset.path}`);
        }
        if (decoded.format !== asset.format) {
          errorFor(failures, `bundled asset format does not match the manifest: ${asset.path}`);
        }
        if (decoded.width * decoded.height > IMAGE_PERFORMANCE_BUDGET.maximumPixelsPerAsset) {
          errorFor(failures, `bundled asset exceeds the ${IMAGE_PERFORMANCE_BUDGET.maximumPixelsPerAsset}-pixel decode budget: ${asset.path}`);
        }
      }
      if (/^[a-f0-9]{64}$/i.test(String(asset.sha256 ?? "")) && sha256File(absoluteAssetPath) !== asset.sha256) {
        errorFor(failures, `bundled asset hash does not match the manifest: ${asset.path}`);
      }
    }
  }
  if (compressedBytesTotal > IMAGE_PERFORMANCE_BUDGET.maximumCompressedBytesTotal) {
    errorFor(failures, `bundled assets exceed the ${IMAGE_PERFORMANCE_BUDGET.maximumCompressedBytesTotal}-byte aggregate compressed budget`);
  }
  if (decodedRgbaBytesTotal > IMAGE_PERFORMANCE_BUDGET.maximumDecodedRgbaBytesTotal) {
    errorFor(failures, `bundled assets exceed the ${IMAGE_PERFORMANCE_BUDGET.maximumDecodedRgbaBytesTotal}-byte aggregate decoded RGBA budget`);
  }
  validateProvenanceLedger(root, manifest.bundledAssets, failures);

  const bundledAssets = collectBundledAssets(root);
  const manifestAssetSet = new Set(assetPaths);
  for (const assetPath of bundledAssets) {
    if (!manifestAssetSet.has(assetPath)) {
      errorFor(failures, `bundled asset is missing from manifest: ${assetPath}`);
    }
  }

  const staticUrls = manifest.staticExternalImageUrls.map((entry) => entry?.url);
  if (uniqueStrings(staticUrls).length !== staticUrls.length) {
    errorFor(failures, "staticExternalImageUrls contains duplicate URLs");
  }
  for (const entry of manifest.staticExternalImageUrls) {
    if (!nonEmptyString(entry?.url) || !/^https:\/\//.test(entry.url)) {
      errorFor(failures, `static external image has an invalid URL: ${String(entry?.url)}`);
      continue;
    }
    for (const field of [
      "role",
      "owner",
      "source",
      "provenanceLicenseStatus",
      "permittedUse",
      "attribution",
      "reviewStatus",
      "reviewer",
      "reviewDate",
      "evidence",
    ]) {
      if (!nonEmptyString(entry[field])) {
        errorFor(failures, `static external image ${entry.url} is missing ${field}`);
      }
    }
    if (entry.reviewStatus !== "approved") {
      errorFor(failures, `static external image ${entry.url} is not approved for release`);
    }
    if (!String(entry.provenanceLicenseStatus ?? "").startsWith("approved")) {
      errorFor(failures, `static external image ${entry.url} lacks approved provenance and usage rights`);
    }
    if (!Array.isArray(entry.renderConsumers) || entry.renderConsumers.length === 0) {
      errorFor(failures, `static external image ${entry.url} must declare renderConsumers`);
    }
  }
  const staticUrlSet = new Set(staticUrls);
  const detectedStaticUrls = collectStaticExternalImageUrls(root);
  for (const url of detectedStaticUrls) {
    if (!staticUrlSet.has(url)) {
      errorFor(failures, `static external image URL is missing from manifest: ${url}`);
    }
  }
  for (const url of staticUrlSet) {
    if (!detectedStaticUrls.includes(url)) {
      errorFor(failures, `manifest static external image URL is not rendered: ${url}`);
    }
  }

  const rendererIds = manifest.directImageRenderers.map((renderer) => renderer?.id);
  if (uniqueStrings(rendererIds).length !== rendererIds.length) {
    errorFor(failures, "directImageRenderers contains duplicate ids");
  }
  for (const renderer of manifest.directImageRenderers) {
    if (!nonEmptyString(renderer?.id) || !nonEmptyString(renderer?.path) || !nonEmptyString(renderer?.anchor)) {
      errorFor(failures, `direct image renderer has an incomplete registration: ${JSON.stringify(renderer)}`);
      continue;
    }
    if (!['content', 'decorative'].includes(renderer.classification)) {
      errorFor(failures, `direct image renderer ${renderer.id} must be content or decorative`);
    }
    for (const field of ["role", "owner", "reviewStatus"]) {
      if (!nonEmptyString(renderer[field])) {
        errorFor(failures, `direct image renderer ${renderer.id} is missing ${field}`);
      }
    }
  }

  const directRenderers = collectDirectImageRenderers(root);
  const matchedRendererIds = new Set();
  for (const directRenderer of directRenderers) {
    const matches = manifest.directImageRenderers.filter((registered) =>
      registered?.path === directRenderer.path
      && !matchedRendererIds.has(registered?.id)
      && directRenderer.tag.includes(registered?.anchor),
    );
    if (matches.length !== 1) {
      errorFor(
        failures,
        `unregistered direct Image renderer at ${directRenderer.path}:${directRenderer.line}`,
      );
      continue;
    }
    matchedRendererIds.add(matches[0].id);
  }
  for (const renderer of manifest.directImageRenderers) {
    if (!matchedRendererIds.has(renderer.id)) {
      errorFor(failures, `registered direct Image renderer is not present: ${renderer.id}`);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    summary: {
      bundledAssetCount: bundledAssets.length,
      staticExternalImageUrlCount: detectedStaticUrls.length,
      directImageRendererCount: directRenderers.length,
      compressedAssetBytes: compressedBytesTotal,
      decodedRgbaBytes: decodedRgbaBytesTotal,
    },
  };
}

export function formatValidationResult(result) {
  if (result.ok) {
    return JSON.stringify({ status: "ok", ...result.summary }, null, 2);
  }
  return `Image governance validation failed:\n- ${result.failures.join("\n- ")}`;
}

function main() {
  const manifestPath = process.argv[2] ?? DEFAULT_MANIFEST_PATH;
  const result = validateImageGovernance({ manifestPath });
  if (!result.ok) throw new Error(formatValidationResult(result));
  console.log(formatValidationResult(result));
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "[image-governance] unknown failure");
    process.exitCode = 1;
  }
}
