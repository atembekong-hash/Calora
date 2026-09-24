import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  AUTH_CALLBACK_PATH,
  BUNDLE_ID,
  DEFAULT_ASSOCIATION_MAX_AGE_SECONDS,
  MAX_ASSOCIATION_MAX_AGE_SECONDS,
  MIN_ASSOCIATION_MAX_AGE_SECONDS,
  PACKAGE_NAME,
  checkAppleAndGoogleAssociationEvidence,
  checkNativeAssociations,
  diagnoseNativeAssociationInputs,
  formatNativeAssociationInputDiagnostics,
  formatAssociationFreshnessPolicy,
  resolveAssociationFreshnessPolicy,
} from "./monitor-native-associations.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
const monitorPath = fileURLToPath(
  new URL("./monitor-native-associations.mjs", import.meta.url),
);
const publicVerifierPath = fileURLToPath(
  new URL(
    "../artifacts/api-server/scripts/verify-public-release.mjs",
    import.meta.url,
  ),
);
const publicReleaseAttestationPath = fileURLToPath(
  new URL("./lib/public-release-attestation.mjs", import.meta.url),
);
const teamId = "B5344GJRMT";
const fingerprint =
  "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99";

function response(
  body,
  { status = 200, contentType = "application/json", headers = {} } = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => {
        const normalizedName = name.toLowerCase();
        if (normalizedName === "content-type") {
          return contentType;
        }
        return headers[normalizedName] ?? null;
      },
    },
    json: async () => body,
  };
}

function fetchFor({
  apple = {},
  android = {},
  appleStatus,
  androidStatus,
} = {}) {
  return async (url) => {
    if (url.endsWith("apple-app-site-association")) {
      return response(
        {
          applinks: {
            details: [
              {
                appIDs: [`${teamId}.${BUNDLE_ID}`],
                components: [{ "/": "/invite/*" }, { "/": AUTH_CALLBACK_PATH }],
              },
            ],
          },
        },
        { ...apple, status: appleStatus ?? apple.status },
      );
    }

    return response(
      [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: PACKAGE_NAME,
            sha256_cert_fingerprints: [fingerprint],
          },
        },
      ],
      { ...android, status: androidStatus ?? android.status },
    );
  };
}

async function runNode(source, { cwd = workspaceRoot, env = {} } = {}) {
  return execFileAsync(
    process.execPath,
    ["--input-type=module", "--eval", source],
    {
      cwd,
      env: { ...process.env, ...env },
      maxBuffer: 1024 * 1024,
    },
  );
}

function providerFixtureSource({
  monitorModuleUrl,
  freshnessAgeSeconds,
  configuredMaxAgeSeconds,
}) {
  return `
const teamId = ${JSON.stringify(teamId)};
const fingerprint = ${JSON.stringify(fingerprint)};
const freshnessAgeSeconds = ${JSON.stringify(freshnessAgeSeconds)};
const configuredMaxAgeSeconds = ${JSON.stringify(configuredMaxAgeSeconds)};

function jsonResponse(body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
}

globalThis.fetch = async (url) => {
  const value = String(url);
  const appleDocument = {
    applinks: {
      details: [
        {
          appIDs: [${JSON.stringify(`${teamId}.${BUNDLE_ID}`)}],
          components: [{ "/": "${AUTH_CALLBACK_PATH}" }],
        },
      ],
    },
  };
  const googleDocument = {
    statements: [
      {
        relation: "delegate_permission/common.handle_all_urls",
        target: {
          androidApp: {
            packageName: "${PACKAGE_NAME}",
            certificate: { sha256Fingerprint: fingerprint },
          },
        },
      },
    ],
    maxAge: \`\${freshnessAgeSeconds}s\`,
  };

  if (value.endsWith("/.well-known/apple-app-site-association")) {
    return jsonResponse(appleDocument);
  }
  if (value.endsWith("/.well-known/assetlinks.json")) {
    return jsonResponse([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "${PACKAGE_NAME}",
          sha256_cert_fingerprints: [fingerprint],
        },
      },
    ]);
  }
  if (value.startsWith("https://app-site-association.cdn-apple.com/")) {
    return jsonResponse(appleDocument, {
      age: String(freshnessAgeSeconds),
      "cache-control": \`public, max-age=\${freshnessAgeSeconds}\`,
    });
  }
  if (value.startsWith("https://digitalassetlinks.googleapis.com/")) {
    return jsonResponse(googleDocument);
  }
  throw new Error(\`Unexpected fixture request: \${value}\`);
};

const { runNativeAssociationMonitor } = await import(${JSON.stringify(
    monitorModuleUrl,
  )});
await runNativeAssociationMonitor();
if (configuredMaxAgeSeconds !== undefined) {
  process.stdout.write(\`fixture configured max age: \${configuredMaxAgeSeconds}\\n\`);
}
`;
}

async function createPublicVerifierFixture() {
  const root = await mkdtemp(join(tmpdir(), "calora-public-release-"));
  const scriptsDirectory = join(root, "scripts");
  const scriptsLibDirectory = join(scriptsDirectory, "lib");
  const verifierDirectory = join(root, "artifacts/api-server/scripts");
  await mkdir(scriptsLibDirectory, { recursive: true });
  await mkdir(verifierDirectory, { recursive: true });
  await cp(
    monitorPath,
    join(scriptsDirectory, "monitor-native-associations.mjs"),
  );
  await cp(
    publicReleaseAttestationPath,
    join(scriptsLibDirectory, "public-release-attestation.mjs"),
  );
  const verifierPath = join(verifierDirectory, "verify-public-release.mjs");
  await cp(publicVerifierPath, verifierPath);

  const gitOptions = { cwd: root };
  await execFileAsync("git", ["init", "-q"], gitOptions);
  await execFileAsync(
    "git",
    ["config", "user.email", "fixture@example.test"],
    gitOptions,
  );
  await execFileAsync("git", ["config", "user.name", "Fixture"], gitOptions);
  await execFileAsync("git", ["add", "."], gitOptions);
  await execFileAsync("git", ["commit", "-qm", "fixture"], gitOptions);

  return { root, verifierPath };
}

function publicVerifierSource(verifierPath) {
  return `
const teamId = ${JSON.stringify(teamId)};
const fingerprint = ${JSON.stringify(fingerprint)};

function jsonResponse(body, headers = {}, responseUrl = "") {
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
  if (responseUrl) {
    Object.defineProperty(response, "url", { value: responseUrl });
  }
  return response;
}

globalThis.fetch = async (url) => {
  const value = String(url);
  const appleDocument = {
    applinks: {
      details: [
        {
          appIDs: [${JSON.stringify(`${teamId}.${BUNDLE_ID}`)}],
          components: [{ "/": "${AUTH_CALLBACK_PATH}" }],
        },
      ],
    },
  };
  const googleDocument = {
    statements: [
      {
        relation: "delegate_permission/common.handle_all_urls",
        target: {
          androidApp: {
            packageName: "${PACKAGE_NAME}",
            certificate: { sha256Fingerprint: fingerprint },
          },
        },
      },
    ],
    maxAge: "86401s",
  };
  const releasePage = (canonicalUrl) => \`<h1>Calora</h1><h1>Contact Calora</h1>
<h1>Privacy Policy</h1><h1>Terms of Use</h1><h1>Calora Help</h1><h1>Delete your account</h1><h1>Delete Your Account</h1>
<h1>Subscription Information</h1>Help & Support support@mycaloraapp.com
<link rel="canonical" href="\${canonicalUrl}">\`;

  if (value === "https://example.test/api/version") {
    return jsonResponse(
      {
        schemaVersion: "calora.release-attestation.v1",
        gitCommit: "a".repeat(40),
        sourceTree: "b".repeat(40),
        sourceDigest: "c".repeat(64),
        buildTimestamp: "2026-09-05T10:14:25.616Z",
        releaseId: "calora-api-aaaaaaaaaaaa-20260905101425616",
      },
      {},
      value,
    );
  }
  if (value === "https://example.test/api") {
    return jsonResponse({ status: "ok" });
  }
  if (value === "https://example.test/") {
    return new Response(releasePage(value.endsWith("/help") ? "https://example.test/support" : value), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (
    value.startsWith("https://example.test/api/legal/") ||
    value === "https://example.test/privacy" ||
    value === "https://example.test/terms" ||
    value === "https://example.test/help" ||
    value === "https://example.test/support" ||
    value === "https://example.test/delete-account" ||
    value === "https://example.test/subscription" ||
    value.startsWith("https://example.test/")
  ) {
    return new Response(releasePage(value.endsWith("/help") ? "https://example.test/support" : value), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (value.startsWith("https://app-site-association.cdn-apple.com/")) {
    return jsonResponse(appleDocument, {
      age: "86401",
      "cache-control": "public, max-age=86401",
    });
  }
  if (value.startsWith("https://digitalassetlinks.googleapis.com/")) {
    return jsonResponse(googleDocument);
  }
  throw new Error(\`Unexpected fixture request: \${value}\`);
};

process.argv[1] = ${JSON.stringify(verifierPath)};
await import(${JSON.stringify(pathToFileURL(verifierPath).href)});
`;
}

test("resolves the bounded freshness configuration and fails closed", () => {
  assert.deepEqual(resolveAssociationFreshnessPolicy(undefined), {
    maxAgeSeconds: DEFAULT_ASSOCIATION_MAX_AGE_SECONDS,
    mode: "warn",
    source: "default",
  });
  assert.deepEqual(resolveAssociationFreshnessPolicy("3600"), {
    maxAgeSeconds: MIN_ASSOCIATION_MAX_AGE_SECONDS,
    mode: "warn",
    source: "configured",
  });
  assert.deepEqual(
    resolveAssociationFreshnessPolicy(String(MAX_ASSOCIATION_MAX_AGE_SECONDS)),
    {
      maxAgeSeconds: MAX_ASSOCIATION_MAX_AGE_SECONDS,
      mode: "warn",
      source: "configured",
    },
  );

  for (const value of ["not-a-number", "3599", "604801", "1.5", "1e4"]) {
    const policy = resolveAssociationFreshnessPolicy(value);
    assert.equal(policy.maxAgeSeconds, DEFAULT_ASSOCIATION_MAX_AGE_SECONDS);
    assert.equal(policy.source, "default-invalid-configuration", value);
  }
});

test("formats only the effective freshness policy", () => {
  const output = formatAssociationFreshnessPolicy(
    resolveAssociationFreshnessPolicy("172800"),
  );
  assert.equal(
    output,
    "Association freshness policy: warn when provider metadata exceeds 172800s (source: configured).",
  );
  assert.ok(!output.includes("AA:BB"));
});

test("classifies all monitor inputs without exposing their values", () => {
  const diagnostics = diagnoseNativeAssociationInputs({
    origin: "not-an-origin",
    appleTeamId: "",
    androidFingerprint: "not-a-fingerprint",
    freshnessValue: "1",
  });
  assert.deepEqual(diagnostics, {
    origin: "invalid",
    appleTeamId: "missing",
    androidFingerprint: "invalid",
    freshnessPolicy: "fallback",
  });
  const output = formatNativeAssociationInputDiagnostics(diagnostics);
  assert.match(output, /APPLE_TEAM_ID missing/);
  assert.match(output, /ANDROID_SHA256_FINGERPRINT invalid/);
  assert.equal(output.includes("not-an-origin"), false);
  assert.equal(output.includes("not-a-fingerprint"), false);
});

test("fails before network access when multiple monitor prerequisites are unavailable", async () => {
  let fetchCalls = 0;
  await assert.rejects(
    checkNativeAssociations({
      origin: "https://example.com",
      appleTeamId: "",
      androidFingerprint: "invalid",
      fetchImpl: async () => {
        fetchCalls += 1;
        return response({});
      },
    }),
    /APPLE_TEAM_ID missing; ANDROID_SHA256_FINGERPRINT invalid/,
  );
  assert.equal(fetchCalls, 0);
});

test("scheduled monitor CLI uses the freshness threshold from its process environment", async () => {
  const output = await runNode(
    providerFixtureSource({
      monitorModuleUrl: pathToFileURL(monitorPath).href,
      freshnessAgeSeconds: 7201,
      configuredMaxAgeSeconds: 7200,
    }),
    {
      env: {
        NATIVE_ASSOCIATION_ORIGIN: "https://example.test",
        NATIVE_ASSOCIATION_FRESHNESS_MAX_AGE_SECONDS: "7200",
        APPLE_TEAM_ID: teamId,
        ANDROID_SHA256_FINGERPRINT: fingerprint,
      },
    },
  );
  const combinedOutput = `${output.stdout}\n${output.stderr}`;

  assert.match(
    combinedOutput,
    /Association freshness policy: warn when provider metadata exceeds 7200s \(source: configured\)\./,
  );
  assert.match(
    combinedOutput,
    /Apple association CDN cache age \(7201s\) exceeds the 7200s freshness policy\./,
  );
  assert.match(
    combinedOutput,
    /Google Digital Asset Links statements maxAge \(7201s\) exceeds the 7200s freshness policy\./,
  );
  assert.doesNotMatch(combinedOutput, new RegExp(fingerprint));
});

test("production release verification writes its report outside the checkout", async () => {
  const workflow = await readFile(
    join(workspaceRoot, ".github/workflows/monitor-native-associations.yml"),
    "utf8",
  );
  const reportName = "production-release-verification.txt";

  assert.ok(workflow.includes(`tee \"\${RUNNER_TEMP}/${reportName}\"`));
  assert.ok(workflow.includes(`path: \${{ runner.temp }}/${reportName}`));
  assert.equal(workflow.includes(`tee ${reportName}`), false);
});

test("public release verifier prints safe default fallback for invalid and out-of-range environment values", async () => {
  for (const freshnessValue of [
    "not-a-number",
    String(MIN_ASSOCIATION_MAX_AGE_SECONDS - 1),
  ]) {
    const fixture = await createPublicVerifierFixture();
    try {
      const output = await runNode(publicVerifierSource(fixture.verifierPath), {
        cwd: fixture.root,
        env: {
          PUBLIC_VERIFY_ORIGIN: "https://example.test",
          PUBLIC_CANONICAL_ORIGIN: "https://example.test",
          PUBLIC_VERIFY_EXPECTED_SOURCE_TREE: "b".repeat(40),
          NATIVE_ASSOCIATION_FRESHNESS_MAX_AGE_SECONDS: freshnessValue,
          APPLE_TEAM_ID: teamId,
          ANDROID_SHA256_FINGERPRINT: fingerprint,
        },
      });
      const combinedOutput = `${output.stdout}\n${output.stderr}`;

      assert.match(
        combinedOutput,
        /Association freshness policy: warn when provider metadata exceeds 86400s \(source: default-invalid-configuration\)\./,
      );
      assert.doesNotMatch(combinedOutput, new RegExp(fingerprint));
      assert.doesNotMatch(
        combinedOutput,
        /delegate_permission|sha256Fingerprint/,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("rejects off-origin and opaque redirect release attestations before reading payloads", async () => {
  const output = await runNode(`
import assert from "node:assert/strict";
import { fetchPublishedReleaseAttestation } from ${JSON.stringify(
    pathToFileURL(publicReleaseAttestationPath).href,
  )};

for (const { name, type, responseUrl } of [
  {
    name: "off-origin final URL",
    type: "basic",
    responseUrl: "https://attacker.example/api/version",
  },
  {
    name: "opaque redirect",
    type: "opaqueredirect",
    responseUrl: "https://example.test/api/version",
  },
]) {
  let payloadRead = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://example.test/api/version");
    assert.equal(options.redirect, "manual");
    return {
      type,
      url: responseUrl,
      ok: true,
      status: 200,
      json: async () => {
        payloadRead = true;
        return {};
      },
    };
  };

  await assert.rejects(
    fetchPublishedReleaseAttestation("https://example.test"),
    /Published release attestation redirected off the canonical origin/,
  );
  assert.equal(payloadRead, false, name);
}

process.stdout.write("off-origin checks passed\\n");
`);
  assert.match(output.stdout, /off-origin/);
});

test("passes when production files claim the callback and signed app", async () => {
  const result = await checkNativeAssociations({
    origin: "https://example.com",
    appleTeamId: teamId,
    androidFingerprint: fingerprint.toLowerCase(),
    fetchImpl: fetchFor(),
  });

  assert.equal(result.origin, "https://example.com");
});

test("fails when the Apple callback is removed", async () => {
  await assert.rejects(
    checkNativeAssociations({
      origin: "https://example.com",
      appleTeamId: teamId,
      androidFingerprint: fingerprint,
      fetchImpl: async (url) => {
        if (url.endsWith("apple-app-site-association")) {
          return response({
            applinks: {
              details: [
                {
                  appIDs: [`${teamId}.${BUNDLE_ID}`],
                  components: [{ "/": "/invite/*" }],
                },
              ],
            },
          });
        }
        return fetchFor()(url);
      },
    }),
    /Apple association is missing.*callback/,
  );
});

test("fails when the Android signing fingerprint changes", async () => {
  await assert.rejects(
    checkNativeAssociations({
      origin: "https://example.com",
      appleTeamId: teamId,
      androidFingerprint: fingerprint.replace("AA:BB", "11:22"),
      fetchImpl: fetchFor(),
    }),
    /Android asset links are missing.*signing fingerprint/,
  );
});

test("fails closed on a non-success or non-JSON response", async () => {
  await assert.rejects(
    checkNativeAssociations({
      origin: "https://example.com",
      appleTeamId: teamId,
      androidFingerprint: fingerprint,
      fetchImpl: fetchFor({ appleStatus: 503 }),
    }),
    /apple-app-site-association.*HTTP 503/,
  );

  await assert.rejects(
    checkNativeAssociations({
      origin: "https://example.com",
      appleTeamId: teamId,
      androidFingerprint: fingerprint,
      fetchImpl: fetchFor({
        apple: { contentType: "text/html" },
      }),
    }),
    /apple-app-site-association.*not JSON/,
  );
});

test("passes when Apple CDN and Google statements contain the signed app", async () => {
  const urls = [];
  const result = await checkAppleAndGoogleAssociationEvidence({
    origin: "https://example.com",
    appleTeamId: teamId,
    androidFingerprint: fingerprint.toLowerCase(),
    fetchImpl: async (url) => {
      urls.push(url);
      if (url.startsWith("https://app-site-association.cdn-apple.com/")) {
        return response(
          {
            applinks: {
              details: [
                {
                  appIDs: [`${teamId}.${BUNDLE_ID}`],
                  components: [{ "/": AUTH_CALLBACK_PATH }],
                },
              ],
            },
          },
          {
            headers: {
              age: "60",
              "cache-control": "public, max-age=3600",
            },
          },
        );
      }
      return response({
        statements: [
          {
            relation: "delegate_permission/common.handle_all_urls",
            target: {
              androidApp: {
                packageName: PACKAGE_NAME,
                certificate: { sha256Fingerprint: fingerprint },
              },
            },
          },
        ],
        maxAge: "3600s",
      });
    },
  });

  assert.equal(result.origin, "https://example.com");
  assert.deepEqual(result.warnings, []);
  assert.equal(urls.length, 2);
  assert.ok(
    urls.some((url) =>
      url.startsWith("https://app-site-association.cdn-apple.com/"),
    ),
  );
  assert.ok(
    urls.some((url) =>
      url.startsWith("https://digitalassetlinks.googleapis.com/"),
    ),
  );
});

test("warns when provider freshness metadata is missing", async () => {
  const result = await checkAppleAndGoogleAssociationEvidence({
    origin: "https://example.com",
    appleTeamId: teamId,
    androidFingerprint: fingerprint,
    fetchImpl: async (url) => {
      if (url.startsWith("https://app-site-association.cdn-apple.com/")) {
        return response({
          applinks: {
            details: [
              {
                appIDs: [`${teamId}.${BUNDLE_ID}`],
                components: [{ "/": AUTH_CALLBACK_PATH }],
              },
            ],
          },
        });
      }
      return response({
        statements: [
          {
            relation: "delegate_permission/common.handle_all_urls",
            target: {
              androidApp: {
                packageName: PACKAGE_NAME,
                certificate: { sha256Fingerprint: fingerprint },
              },
            },
          },
        ],
      });
    },
  });

  assert.equal(result.warnings.length, 2);
  assert.ok(result.warnings.every((warning) => warning.includes("freshness")));
  assert.ok(result.warnings.every((warning) => !warning.includes(fingerprint)));
});

test("warns when provider freshness metadata is malformed", async () => {
  const result = await checkAppleAndGoogleAssociationEvidence({
    origin: "https://example.com",
    appleTeamId: teamId,
    androidFingerprint: fingerprint,
    fetchImpl: async (url) => {
      if (url.startsWith("https://app-site-association.cdn-apple.com/")) {
        return response(
          {
            applinks: {
              details: [
                {
                  appIDs: [`${teamId}.${BUNDLE_ID}`],
                  components: [{ "/": AUTH_CALLBACK_PATH }],
                },
              ],
            },
          },
          {
            headers: {
              age: "not-a-number",
              "cache-control": "public, max-age=unknown",
            },
          },
        );
      }
      return response(
        {
          statements: [
            {
              relation: "delegate_permission/common.handle_all_urls",
              target: {
                androidApp: {
                  packageName: PACKAGE_NAME,
                  certificate: { sha256Fingerprint: fingerprint },
                },
              },
            },
          ],
          maxAge: "not-a-duration",
        },
        { headers: {} },
      );
    },
  });

  assert.ok(
    result.warnings.some((warning) => warning.includes("malformed Age")),
  );
  assert.ok(
    result.warnings.some((warning) =>
      warning.includes("malformed Cache-Control"),
    ),
  );
  assert.ok(
    result.warnings.some((warning) => warning.includes("malformed maxAge")),
  );
  assert.ok(result.warnings.every((warning) => !warning.includes(fingerprint)));
});

test("warns when provider freshness metadata exceeds the policy", async () => {
  const result = await checkAppleAndGoogleAssociationEvidence({
    origin: "https://example.com",
    appleTeamId: teamId,
    androidFingerprint: fingerprint,
    fetchImpl: async (url) => {
      if (url.startsWith("https://app-site-association.cdn-apple.com/")) {
        return response(
          {
            applinks: {
              details: [
                {
                  appIDs: [`${teamId}.${BUNDLE_ID}`],
                  components: [{ "/": AUTH_CALLBACK_PATH }],
                },
              ],
            },
          },
          {
            headers: {
              age: "90002",
              "cache-control": "public, max-age=90001",
            },
          },
        );
      }
      return response({
        statements: [
          {
            relation: "delegate_permission/common.handle_all_urls",
            target: {
              androidApp: {
                packageName: PACKAGE_NAME,
                certificate: { sha256Fingerprint: fingerprint },
              },
            },
          },
        ],
        maxAge: "90001s",
      });
    },
  });

  assert.ok(
    result.warnings.some((warning) =>
      warning.includes("Apple association CDN cache age (90002s) exceeds"),
    ),
  );
  assert.ok(
    result.warnings.some((warning) =>
      warning.includes(
        "Apple association CDN advertised max-age (90001s) exceeds",
      ),
    ),
  );
  assert.ok(
    result.warnings.some((warning) =>
      warning.includes(
        "Google Digital Asset Links statements maxAge (90001s) exceeds",
      ),
    ),
  );
  assert.ok(result.warnings.every((warning) => !warning.includes(fingerprint)));
});

test("fails when Google statements omit the expected package or certificate", async () => {
  await assert.rejects(
    checkAppleAndGoogleAssociationEvidence({
      origin: "https://example.com",
      appleTeamId: teamId,
      androidFingerprint: fingerprint,
      fetchImpl: async (url) => {
        if (url.startsWith("https://app-site-association.cdn-apple.com/")) {
          return response({
            applinks: {
              details: [
                {
                  appIDs: [`${teamId}.${BUNDLE_ID}`],
                  components: [{ "/": AUTH_CALLBACK_PATH }],
                },
              ],
            },
          });
        }
        return response({
          statements: [
            {
              relation: "delegate_permission/common.handle_all_urls",
              target: {
                androidApp: {
                  packageName: "com.example.other",
                  certificate: { sha256Fingerprint: fingerprint },
                },
              },
            },
          ],
        });
      },
    }),
    /Google Digital Asset Links statements are missing/,
  );
});
