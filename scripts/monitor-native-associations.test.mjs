import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_CALLBACK_PATH,
  BUNDLE_ID,
  PACKAGE_NAME,
  checkNativeAssociations,
} from "./monitor-native-associations.mjs";

const teamId = "B5344GJRMT";
const fingerprint = "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99";

function response(body, { status = 200, contentType = "application/json" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name === "content-type" ? contentType : null) },
    json: async () => body,
  };
}

function fetchFor({ apple = {}, android = {}, appleStatus, androidStatus } = {}) {
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