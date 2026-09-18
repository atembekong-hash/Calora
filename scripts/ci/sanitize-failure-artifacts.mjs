import fs from "node:fs";
import path from "node:path";

const inputDir = process.env.CI_LOG_DIR;
const outputDir = process.env.CI_ARTIFACT_DIR;

if (!inputDir || !outputDir) {
  throw new Error("CI_LOG_DIR and CI_ARTIFACT_DIR are required");
}

if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const redactions = [
  [/postgres(?:ql)?:\/\/[^\s"'`]+/giu, "[redacted connection string]"],
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/giu, "Bearer [redacted]"],
  [
    /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|secret|private[_-]?key)\s*[:=]\s*[^\s"',;}]+/giu,
    "$1=[redacted]",
  ],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gu, "[redacted identity]"],
  [/\beyJ[A-Za-z0-9._-]{20,}\b/gu, "[redacted token]"],
  [/(?:\/home\/runner\/work\/)[^\s:]+/gu, "[redacted workspace path]"],
];

function redact(value) {
  return redactions.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    value,
  );
}

const files = fs
  .readdirSync(inputDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .sort();

for (const file of files) {
  const source = path.join(inputDir, file);
  const destination = path.join(
    outputDir,
    file.replace(/[^A-Za-z0-9._-]/g, "_"),
  );
  const contents = fs.readFileSync(source, "utf8");
  fs.writeFileSync(destination, redact(contents), "utf8");
}

fs.writeFileSync(
  path.join(outputDir, "manifest.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      status: "sanitized",
      files: files.map((file) => file.replace(/[^A-Za-z0-9._-]/g, "_")),
      note: "CI evidence was redacted for credentials, connection strings, identities, tokens, and workspace paths.",
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
