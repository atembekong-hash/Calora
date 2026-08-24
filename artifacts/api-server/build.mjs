import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(artifactDir, "../..");
const execFileAsync = promisify(execFile);

function isFullGitSha(value) {
  return /^[0-9a-f]{40}$/i.test(value);
}

async function git(...args) {
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceDir });
  return stdout.trim();
}

async function getReleaseAttestation() {
  let gitCommit;
  let sourceTree;
  let dirty;
  try {
    [gitCommit, sourceTree, dirty] = await Promise.all([
      git("rev-parse", "HEAD"),
      git("rev-parse", "HEAD^{tree}"),
      // Production provenance must cover every source input. Ignoring
      // untracked files would allow a bundled route/module outside HEAD's tree
      // to be attested as though it belonged to the claimed revision.
      git("status", "--porcelain", "--untracked-files=all"),
    ]);
  } catch (error) {
    throw new Error("Release attestation requires a readable Git checkout.", { cause: error });
  }

  if (!isFullGitSha(gitCommit) || !isFullGitSha(sourceTree)) {
    throw new Error("Release attestation rejected malformed Git provenance.");
  }
  if (process.env.NODE_ENV === "production" && dirty) {
    throw new Error("Release attestation requires a clean production Git checkout.");
  }

  const buildTimestamp = new Date().toISOString();
  const sourceDigest = createHash("sha256")
    .update(`${gitCommit}\n${sourceTree}\n`, "utf8")
    .digest("hex");
  const releaseId = `calora-api-${gitCommit.slice(0, 12)}-${buildTimestamp.replace(/[-:.TZ]/g, "")}`;

  return { gitCommit, sourceTree, sourceDigest, buildTimestamp, releaseId };
}

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  const release = await getReleaseAttestation();
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    define: {
      __RELEASE_GIT_COMMIT__: JSON.stringify(release.gitCommit),
      __RELEASE_SOURCE_TREE__: JSON.stringify(release.sourceTree),
      __RELEASE_SOURCE_DIGEST__: JSON.stringify(release.sourceDigest),
      __RELEASE_BUILD_TIMESTAMP__: JSON.stringify(release.buildTimestamp),
      __RELEASE_ID__: JSON.stringify(release.releaseId),
    },
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "@resvg/resvg-js",
      "@resvg/resvg-js-linux-x64-gnu",
      "@resvg/resvg-js-linux-arm64-gnu",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
