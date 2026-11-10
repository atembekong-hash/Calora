#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourcePath = path.join(
  workspaceDir,
  "artifacts/api-server/src/lib/recipe-media.ts",
);
const artifactPath = path.join(
  workspaceDir,
  "artifacts/api-server/dist/index.mjs",
);

export function extractRecipeMediaContract(text) {
  const model = text.match(/RECIPE_MEDIA_MODEL\s*=\s*["']([^"']+)["']/)?.[1];
  const templateSuffix = text.match(
    /RECIPE_MEDIA_MODEL_VERSION\s*=\s*`\$\{RECIPE_MEDIA_MODEL\}([^`]+)`/,
  )?.[1];
  const literalModelVersion = text.match(
    /RECIPE_MEDIA_MODEL_VERSION\s*=\s*["']([^"']+)["']/,
  )?.[1];
  const modelVersion =
    literalModelVersion ??
    (model && templateSuffix ? `${model}${templateSuffix}` : undefined);
  const promptVersion = text.match(
    /RECIPE_MEDIA_PROMPT_VERSION\s*=\s*["']([^"']+)["']/,
  )?.[1];
  return { model, modelVersion, promptVersion };
}

export async function verifyRecipeMediaArtifactParity(
  source = sourcePath,
  artifact = artifactPath,
) {
  const [sourceText, artifactText] = await Promise.all([
    readFile(source, "utf8"),
    readFile(artifact, "utf8"),
  ]);
  const expected = extractRecipeMediaContract(sourceText);
  const actual = extractRecipeMediaContract(artifactText);
  for (const key of ["model", "modelVersion", "promptVersion"]) {
    if (!expected[key] || !actual[key] || expected[key] !== actual[key]) {
      throw new Error(
        `Recipe-media artifact drift for ${key}: source=${expected[key] ?? "missing"} artifact=${actual[key] ?? "missing"}`,
      );
    }
  }
  if (
    !artifactText.includes("recipePhotoContentHash") ||
    !artifactText.includes("RECIPE_MEDIA_PROMPT_VERSION")
  ) {
    throw new Error(
      "Built API artifact does not contain the recipe-media semantic identity implementation.",
    );
  }
  return { expected, actual, source, artifact };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyRecipeMediaArtifactParity()
    .then((result) =>
      console.log(JSON.stringify({ verified: true, ...result })),
    )
    .catch((error) => {
      console.error(`Recipe-media artifact parity failed: ${error.message}`);
      process.exit(1);
    });
}
