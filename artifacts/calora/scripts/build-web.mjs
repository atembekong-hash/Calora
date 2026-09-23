import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_OUTPUT_DIR = path.join(PROJECT_ROOT, "dist");
const REQUIRED_PUBLIC_VARIABLES = [
  "EXPO_PUBLIC_DOMAIN",
  "EXPO_PUBLIC_API_URL",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_REVENUECAT_TEST_API_KEY",
];

function requireNonEmpty(env, key) {
  const value = env[key]?.trim();
  if (!value)
    throw new Error(`Missing required public web build variable: ${key}`);
  return value;
}

function requireHttpsOrigin(value, key) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be an absolute HTTPS origin.`);
  }

  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(
      `${key} must be an absolute HTTPS origin without a path, query, fragment, or credentials.`,
    );
  }

  return url.origin;
}

function requireHostname(value, key) {
  if (
    !/^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(
      value,
    )
  ) {
    throw new Error(
      `${key} must be a bare public DNS hostname without a scheme, port, path, query, or fragment.`,
    );
  }
  return value.toLowerCase();
}

export function validateWebBuildEnvironment(env = process.env) {
  const values = Object.fromEntries(
    REQUIRED_PUBLIC_VARIABLES.map((key) => [key, requireNonEmpty(env, key)]),
  );

  const webHostname = requireHostname(
    values.EXPO_PUBLIC_DOMAIN,
    "EXPO_PUBLIC_DOMAIN",
  );
  const apiOrigin = requireHttpsOrigin(
    values.EXPO_PUBLIC_API_URL,
    "EXPO_PUBLIC_API_URL",
  );
  const supabaseOrigin = requireHttpsOrigin(
    values.EXPO_PUBLIC_SUPABASE_URL,
    "EXPO_PUBLIC_SUPABASE_URL",
  );

  if (apiOrigin !== `https://${webHostname}`) {
    throw new Error(
      "EXPO_PUBLIC_API_URL must use the web deployment origin so browser API requests remain same-origin.",
    );
  }

  return {
    webHostname,
    apiOrigin,
    supabaseOrigin,
    anonKey: values.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    revenueCatTestKey: values.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  };
}

function walkFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.isFile()) files.push(entryPath);
    }
  };
  visit(root);
  return files;
}

export function validateWebOutput(outputDir, config) {
  const indexPath = path.join(outputDir, "index.html");
  const faviconPath = path.join(outputDir, "favicon.ico");
  if (!fs.existsSync(indexPath))
    throw new Error("Web export is missing dist/index.html.");
  if (!fs.existsSync(faviconPath))
    throw new Error("Web export is missing dist/favicon.ico.");

  const files = walkFiles(outputDir);
  const javascriptFiles = files.filter((filePath) =>
    /\.(?:js|mjs)$/i.test(filePath),
  );
  if (javascriptFiles.length === 0)
    throw new Error("Web export contains no JavaScript bundle.");

  const bundleText = javascriptFiles
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n");
  const requiredEmbeddedValues = [
    config.apiOrigin,
    config.supabaseOrigin,
    config.anonKey,
    config.revenueCatTestKey,
  ];
  for (const value of requiredEmbeddedValues) {
    if (!bundleText.includes(value)) {
      throw new Error(
        "Web export did not embed one of the required public runtime values.",
      );
    }
  }

  const forbiddenMarkers = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "REVENUECAT_SECRET_API_KEY",
    "AI_INTEGRATIONS_OPENAI_API_KEY",
    "DATABASE_URL=",
  ];
  for (const marker of forbiddenMarkers) {
    if (bundleText.includes(marker)) {
      throw new Error(
        `Web export contains forbidden server-only marker: ${marker}`,
      );
    }
  }

  return {
    fileCount: files.length,
    javascriptFileCount: javascriptFiles.length,
    totalBytes: files.reduce(
      (sum, filePath) => sum + fs.statSync(filePath).size,
      0,
    ),
  };
}

export function buildWeb({
  env = process.env,
  outputDir = DEFAULT_OUTPUT_DIR,
} = {}) {
  const config = validateWebBuildEnvironment(env);
  fs.rmSync(outputDir, { recursive: true, force: true });

  const command = spawnSync(
    "pnpm",
    [
      "exec",
      "expo",
      "export",
      "--platform",
      "web",
      "--output-dir",
      outputDir,
      "--clear",
    ],
    {
      cwd: PROJECT_ROOT,
      env: { ...env, CI: "1", NODE_ENV: "production" },
      stdio: "inherit",
    },
  );
  if (command.error) throw command.error;
  if (command.status !== 0)
    throw new Error(`Expo web export failed with exit code ${command.status}.`);

  const summary = validateWebOutput(outputDir, config);
  const metadata = {
    schemaVersion: 1,
    webHostname: config.webHostname,
    apiOrigin: config.apiOrigin,
    sourceCommit: env.RAILWAY_GIT_COMMIT_SHA || env.GITHUB_SHA || null,
    ...summary,
  };
  fs.writeFileSync(
    path.join(outputDir, "build-metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
  console.log(
    `Calora web export verified: ${summary.fileCount} files, ${summary.totalBytes} bytes.`,
  );
  return metadata;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    buildWeb();
  } catch (error) {
    console.error(
      `[build:web] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
