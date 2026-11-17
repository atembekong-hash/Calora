import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const audit = spawnSync(process.platform === "win32" ? "corepack.cmd" : "pnpm", process.platform === "win32" ? ["pnpm", "audit", "--json"] : ["audit", "--json"], {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
  shell: process.platform === "win32",
});

let report;
try {
  const output = `${audit.stdout ?? ""}\n${audit.stderr ?? ""}`;
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  report = JSON.parse(output.slice(start, end + 1));
} catch {
  console.error("Release dependency audit did not return valid JSON.");
  process.exit(audit.status ?? 1);
}

const findings = Object.values(report.advisories ?? {});
const blocking = findings.filter((finding) => ["high", "critical"].includes(finding.severity));
const picomatch = blocking.filter((finding) => finding.github_advisory_id === "GHSA-fc5q-39xc-vjpf");
const otherBlocking = blocking.filter((finding) => finding.github_advisory_id !== "GHSA-fc5q-39xc-vjpf");

if (otherBlocking.length > 0 || picomatch.length !== blocking.length || picomatch.length === 0) {
  console.error(`Release dependency audit failed: ${blocking.length} high/critical finding(s) require remediation.`);
  for (const finding of blocking) console.error(`${finding.module_name}: ${finding.github_advisory_id ?? finding.id}`);
  process.exit(1);
}

const patchVersions = ["2.3.2", "3.0.2", "4.0.5"];
const patterns = ["+(*)", "+(*a)", "+(a*)", "*(*a)", "+(a|*a)"];
const packageRoot = join(root, "node_modules", ".pnpm");
for (const version of patchVersions) {
  const directory = readdirSync(packageRoot).find((name) => name.startsWith(`picomatch@${version}_patch_hash`));
  if (!directory) throw new Error(`Missing applied picomatch patch for ${version}.`);
  const parser = await import(pathToFileURL(join(packageRoot, directory, "node_modules", "picomatch", "index.js")));
  for (const pattern of patterns) {
    const started = Date.now();
    parser.default.isMatch(`${"a".repeat(28)}/`, pattern);
    if (Date.now() - started > 1000) throw new Error(`ReDoS guard failed for ${version} / ${pattern}.`);
  }
}

console.log("PASS: the only high-severity finding is GHSA-fc5q-39xc-vjpf, and all locked picomatch majors pass the reviewed bounded ReDoS regression.");
