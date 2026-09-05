import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_CALLBACK_PATH,
  BUNDLE_ID,
  PACKAGE_NAME,
  checkAppleAndGoogleAssociationEvidence,
  checkNativeAssociations,
} from "./monitor-native-associations.mjs";

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
