import path from "node:path";
import { fileURLToPath } from "node:url";
import { rm } from "node:fs/promises";
import { build } from "esbuild";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(artifactDir, "dist");

await rm(distDir, { recursive: true, force: true });
await build({
  entryPoints: [path.join(artifactDir, "src/index.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  // Node must load runtime dependencies from node_modules. Bundling CommonJS
  // packages such as Express into an ESM entrypoint breaks their dynamic
  // require() calls (for example debug's require("tty")) at runtime.
  packages: "external",
  outdir: distDir,
  outExtension: { ".js": ".mjs" },
  sourcemap: "linked",
  logLevel: "info",
});