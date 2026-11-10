import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  extractRecipeMediaContract,
  verifyRecipeMediaArtifactParity,
} from "./verify-recipe-media-artifact-parity.mjs";

test("extracts matching source and bundled recipe-media contracts", () => {
  const source = `export const RECIPE_MEDIA_MODEL = "gpt-image-2.5-flare";\nexport const RECIPE_MEDIA_MODEL_VERSION = \`${"${RECIPE_MEDIA_MODEL}"}:low:1024:v1\`;\nexport const RECIPE_MEDIA_PROMPT_VERSION = "recipe-photo-semantic-v5-identity-stable-ingredient-fidelity";`;
  const artifact = `const RECIPE_MEDIA_MODEL = "gpt-image-2.5-flare";\nconst RECIPE_MEDIA_MODEL_VERSION = "gpt-image-2.5-flare:low:1024:v1";\nconst RECIPE_MEDIA_PROMPT_VERSION = "recipe-photo-semantic-v5-identity-stable-ingredient-fidelity";\nfunction recipePhotoContentHash() { return RECIPE_MEDIA_PROMPT_VERSION; }`;
  assert.deepEqual(
    extractRecipeMediaContract(source),
    extractRecipeMediaContract(artifact),
  );
});

test("fails closed when the built artifact carries an older prompt version", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "calora-recipe-media-parity-"),
  );
  const sourcePath = path.join(directory, "source.ts");
  const artifactPath = path.join(directory, "artifact.mjs");
  await writeFile(
    sourcePath,
    `const RECIPE_MEDIA_MODEL = "gpt-image-2.5-flare";\nconst RECIPE_MEDIA_MODEL_VERSION = "gpt-image-2.5-flare:low:1024:v1";\nconst RECIPE_MEDIA_PROMPT_VERSION = "recipe-photo-semantic-v5-identity-stable-ingredient-fidelity";`,
  );
  await writeFile(
    artifactPath,
    `const RECIPE_MEDIA_MODEL = "gpt-image-2.5-flare";\nconst RECIPE_MEDIA_MODEL_VERSION = "gpt-image-2.5-flare:low:1024:v1";\nconst RECIPE_MEDIA_PROMPT_VERSION = "recipe-photo-semantic-v4";\nfunction recipePhotoContentHash() { return RECIPE_MEDIA_PROMPT_VERSION; }`,
  );
  await assert.rejects(
    () => verifyRecipeMediaArtifactParity(sourcePath, artifactPath),
    /promptVersion/,
  );
});
