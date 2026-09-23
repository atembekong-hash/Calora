import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateImageGovernance } from "./validate-image-governance.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = "artifacts/calora/assets/image-surface-manifest.json";

function fixtureRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), "calora-image-governance-"));
  for (const directory of [
    "artifacts/calora/app",
    "artifacts/calora/components",
    "artifacts/calora/constants",
    "artifacts/calora/context",
    "artifacts/calora/data",
    "artifacts/calora/hooks",
    "artifacts/calora/lib",
    "artifacts/calora/assets/images",
  ]) {
    cpSync(path.join(repositoryRoot, directory), path.join(root, directory), { recursive: true });
  }
  for (const relativePath of [
    manifestPath,
    "artifacts/calora/app.json",
    "artifacts/api-server/src/routes/capture.ts",
    "artifacts/api-server/src/routes/diary.ts",
    "artifacts/api-server/src/routes/sync.ts",
    "docs/image-assets/GENERATED_ASSET_PROVENANCE.md",
    ".github/workflows/release-validation.yml",
    "lib/api-spec/openapi.yaml",
    "lib/api-zod/src/image-source-policy.ts",
  ]) {
    const destination = path.join(root, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(repositoryRoot, relativePath), destination);
  }
  return root;
}

function mutateJson(root, mutate) {
  const target = path.join(root, manifestPath);
  const manifest = JSON.parse(readFileSync(target, "utf8"));
  mutate(manifest);
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
}

test("accepts the reviewed Calora runtime image inventory", () => {
  const result = validateImageGovernance({ root: repositoryRoot, manifestPath });
  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(result.summary.bundledAssetCount, 58);
  assert.equal(result.summary.staticExternalImageUrlCount, 0);
  assert.equal(result.summary.directImageRendererCount, 13);
});

test("requires the native splash and earliest JavaScript bootstrap to use the reviewed launch background", () => {
  const root = fixtureRoot();
  try {
    const configPath = path.join(root, "artifacts/calora/app.json");
    writeFileSync(configPath, readFileSync(configPath, "utf8").replace("#f7f8f3", "#ffffff"));
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /native splash background must be #f7f8f3/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when a bundled asset is not registered", () => {
  const root = fixtureRoot();
  try {
    mutateJson(root, (manifest) => manifest.bundledAssets.pop());
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /bundled asset is missing from manifest/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when a manifest asset is missing from disk", () => {
  const root = fixtureRoot();
  try {
    const target = path.join(root, "artifacts/calora/assets/images/calora-home-header.jpg");
    rmSync(target);
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /manifest asset is missing from disk/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails an unregistered direct Image renderer while registered decorative primitives remain allowed", () => {
  const root = fixtureRoot();
  try {
    const target = path.join(root, "artifacts/calora/app/(tabs)/index.tsx");
    writeFileSync(target, `${readFileSync(target, "utf8")}\nconst GovernanceProbe = () => <Image source={require('../../assets/images/calora-home-header.jpg')} />;\n`);
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /unregistered direct Image renderer/);
    assert.doesNotMatch(result.failures.join("\n"), /home-hourly-header/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("requires provenance and license status without treating source control as approval", () => {
  const root = fixtureRoot();
  try {
    mutateJson(root, (manifest) => {
      delete manifest.bundledAssets[0].provenanceLicenseStatus;
    });
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /is missing provenanceLicenseStatus/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("blocks a bundled asset whose provenance review is not approved", () => {
  const root = fixtureRoot();
  try {
    mutateJson(root, (manifest) => {
      manifest.bundledAssets[0].reviewStatus = "unreviewed";
      manifest.bundledAssets[0].provenanceLicenseStatus = "unverified";
    });
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /is not approved for release/);
    assert.match(result.failures.join("\n"), /lacks approved provenance and usage rights/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("blocks a bundled asset whose bytes no longer match its reviewed digest", () => {
  const root = fixtureRoot();
  try {
    const target = path.join(root, "artifacts/calora/assets/images/calora-home-header.jpg");
    writeFileSync(target, Buffer.concat([readFileSync(target), Buffer.from("tampered")]));
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /bundled asset hash does not match the manifest/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("requires and decodes manifest width, height, and format metadata", () => {
  const root = fixtureRoot();
  try {
    mutateJson(root, (manifest) => {
      delete manifest.bundledAssets[0].width;
      manifest.bundledAssets[0].height = 1;
      manifest.bundledAssets[0].format = "GIF";
    });
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    const failures = result.failures.join("\n");
    assert.match(failures, /has an invalid width/);
    assert.match(failures, /dimensions do not match the manifest/);
    assert.match(failures, /format does not match the manifest/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("blocks provenance ledger drift from the manifest authority", () => {
  const root = fixtureRoot();
  try {
    const ledgerPath = path.join(root, "docs/image-assets/GENERATED_ASSET_PROVENANCE.md");
    writeFileSync(ledgerPath, readFileSync(ledgerPath, "utf8").replace(
      "decorative editorial header or empty-state surface",
      "unreviewed drifted role",
    ));
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /provenance ledger role does not match manifest/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("detects a constructed static external image URL used by an Image renderer", () => {
  const root = fixtureRoot();
  try {
    const target = path.join(root, "artifacts/calora/components/FoodLogThumbnail.tsx");
    writeFileSync(target, `${readFileSync(target, "utf8")}\nconst CDN_BASE = 'https://cdn.example/';\nconst STATIC_FOOD_PHOTO = CDN_BASE + 'meal.jpg';\nconst GovernancePhoto = () => <Image source={{ uri: STATIC_FOOD_PHOTO }} />;\n`);
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /static external image URL is missing from manifest: https:\/\/cdn\.example\/meal\.jpg/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("blocks static external imagery without approved review and provenance rights", () => {
  const root = fixtureRoot();
  try {
    const target = path.join(root, "artifacts/calora/components/FoodLogThumbnail.tsx");
    const url = "https://cdn.example/reviewed-meal.jpg";
    writeFileSync(target, `${readFileSync(target, "utf8")}\nconst STATIC_FOOD_PHOTO = '${url}';\nconst GovernancePhoto = () => <Image source={{ uri: STATIC_FOOD_PHOTO }} />;\n`);
    mutateJson(root, (manifest) => {
      manifest.staticExternalImageUrls.push({
        url,
        role: "food image",
        owner: "Calora product team",
        source: "https://cdn.example/source-record",
        provenanceLicenseStatus: "unapproved",
        permittedUse: "none",
        attribution: "required",
        reviewStatus: "unreviewed",
        reviewer: "pending",
        reviewDate: "2026-09-23",
        evidence: "docs/evidence/pending.md",
        renderConsumers: ["artifacts/calora/components/FoodLogThumbnail.tsx"],
      });
      manifest.directImageRenderers.push({
        id: "governance-static-photo",
        path: "artifacts/calora/components/FoodLogThumbnail.tsx",
        anchor: "STATIC_FOOD_PHOTO",
        classification: "content",
        role: "governance probe",
        owner: "Calora product team",
        reviewStatus: "reviewed renderer registration",
      });
    });
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    const failures = result.failures.join("\n");
    assert.match(failures, /static external image .* is not approved for release/);
    assert.match(failures, /static external image .* lacks approved provenance and usage rights/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("enforces the per-asset compressed mobile delivery budget", () => {
  const root = fixtureRoot();
  try {
    const target = path.join(root, "artifacts/calora/assets/images/icon.png");
    writeFileSync(target, Buffer.concat([readFileSync(target), Buffer.alloc(100_000)]));
    const result = validateImageGovernance({ root, manifestPath });
    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /compressed budget: artifacts\/calora\/assets\/images\/icon\.png/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
