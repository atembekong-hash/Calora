import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
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
    join(workspaceRoot, "scripts/lib/public-release-attestation.mjs"),
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
const expectedSourceTree = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function jsonResponse(body, headers = {}, url = "https://example.test/api/version") {
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
  Object.defineProperty(response, "url", { value: url });
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
  const releasePage = (canonicalPath) => \`<h1>Calora</h1>
Privacy Policy Terms of Use Help & Support Contact Calora Delete your account
Subscription Information Calora Help support@mycaloraapp.com
<link rel="canonical" href="https://example.test\${canonicalPath}">\`;

    if (value === "https://example.test/api/version") {
      return jsonResponse(
        {
          schemaVersion: "calora.release-attestation.v1",
          gitCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          sourceTree: expectedSourceTree,
          sourceDigest: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          buildTimestamp: "2026-09-09T00:00:00.000Z",
          releaseId: "calora-api-aaaaaaaaaaaa-20260909000000",
        },
        {},
        value,
      );
  }
  if (value === "https://example.test/api") {
      return jsonResponse({ status: "ok" }, {}, value);
  }
  if (value.startsWith("https://example.test/api/legal/")) {
    return new Response(releasePage("/"), {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (value.startsWith("https://example.test/")) {
    const requestedPath = new URL(value).pathname;
    const canonicalPath = requestedPath === "/help" ? "/support" : requestedPath;
    return new Response(releasePage(canonicalPath), {
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
          PUBLIC_VERIFY_EXPECTED_SOURCE_TREE:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
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
