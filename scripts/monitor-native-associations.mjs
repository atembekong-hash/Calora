#!/usr/bin/env node

/**
 * Verify the production files consumed by iOS Universal Links and Android App
 * Links. This intentionally uses only Node's built-in fetch so it can run in
 * CI without installing project dependencies.
 */

export const DEFAULT_ORIGIN = "https://calorie-coach-pie35449.replit.app";
export const BUNDLE_ID = "com.etiendem.caloraapp";
export const PACKAGE_NAME = "com.etiendem.caloraapp";
export const AUTH_CALLBACK_PATH = "/auth/callback";

const USER_AGENT = "calora-native-association-monitor/1.0";
const REQUEST_TIMEOUT_MS = 10_000;
const ANDROID_RELATION = "delegate_permission/common.handle_all_urls";
const APPLE_ASSOCIATION_CDN = "https://app-site-association.cdn-apple.com/a/v1";
const GOOGLE_STATEMENTS_ENDPOINT =
  "https://digitalassetlinks.googleapis.com/v1/statements:list";

// Freshness is advisory: a stale provider cache should be visible in a release
// report, but it must not hide a content or identity validation failure.
export const ASSOCIATION_FRESHNESS_POLICY = Object.freeze({
  maxAgeSeconds: 24 * 60 * 60,
  mode: "warn",
});

function requiredValue(value, name) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(
      `Missing ${name}. Configure the CI secret/environment variable before running the monitor.`,
    );
  }
  return normalized;
}

function normalizeOrigin(value) {
  let parsed;
  try {
    parsed = new URL(requiredValue(value, "NATIVE_ASSOCIATION_ORIGIN"));
  } catch {
    throw new Error(
      "NATIVE_ASSOCIATION_ORIGIN must be an HTTPS origin such as https://example.com.",
    );
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(
      "NATIVE_ASSOCIATION_ORIGIN must be an HTTPS origin without credentials.",
    );
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(
      "NATIVE_ASSOCIATION_ORIGIN must contain only the scheme, host, and optional port.",
    );
  }

  return parsed.origin;
}

function normalizeFingerprint(value) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function expectedFingerprints(value) {
  const values = requiredValue(value, "ANDROID_SHA256_FINGERPRINT")
    .split(",")
    .map(normalizeFingerprint)
    .filter(Boolean);

  if (
    values.length === 0 ||
    values.some(
      (fingerprint) => !/^([A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(fingerprint),
    )
  ) {
    throw new Error(
      "ANDROID_SHA256_FINGERPRINT must contain one or more colon-separated SHA-256 certificate fingerprints.",
    );
  }

  return values;
}

async function fetchJson(path, origin, fetchImpl) {
  return fetchJsonUrl(`${origin}${path}`, path, fetchImpl);
}

async function fetchJsonUrl(
  url,
  label,
  fetchImpl,
  { includeMetadata = false } = {},
) {
  let response;
  try {
    response = await fetchImpl(url, {
      redirect: "error",
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(
      `${label} could not be fetched. Check production reachability and TLS. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `${label} returned HTTP ${response.status}. Verify the production deployment and its native association configuration.`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("json")) {
    throw new Error(
      `${label} returned content type ${contentType || "(missing)"}, not JSON. Verify the association endpoint and deployment.`,
    );
  }

  try {
    const body = await response.json();
    return includeMetadata ? { body, headers: response.headers } : body;
  } catch {
    throw new Error(
      `${label} returned invalid JSON. Verify the published association response.`,
    );
  }
}

function headerValue(headers, name) {
  return headers?.get?.(name) ?? null;
}

function parseSeconds(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  // Google returns protobuf Duration values such as "86400s"; accepting a
  // plain number also makes the parser tolerant of test fixtures and proxies.
  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)s?$/);
  if (!match) {
    return null;
  }

  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function parseHeaderSeconds(value) {
  const normalized = String(value ?? "").trim();
  return /^\d+$/.test(normalized) ? Number(normalized) : null;
}

function parseCacheControlMaxAge(value) {
  const normalized = String(value ?? "");
  const directive = normalized
    .split(",")
    .map((part) => part.trim())
    .find((part) => /^max-age\s*=/i.test(part));

  if (!directive) {
    return { present: false, seconds: null };
  }

  const rawValue = directive.replace(/^max-age\s*=\s*/i, "").trim();
  const unquotedValue = rawValue.replace(/^"(.*)"$/, "$1");
  return {
    present: true,
    seconds: parseHeaderSeconds(unquotedValue),
  };
}

function addFreshnessWarning(warnings, message) {
  warnings.push(message);
}

function inspectAppleFreshness(headers, warnings) {
  const ageHeader = headerValue(headers, "age");
  const cacheControl = headerValue(headers, "cache-control");
  const agePresent = ageHeader !== null && ageHeader.trim() !== "";
  const ageSeconds = agePresent ? parseHeaderSeconds(ageHeader) : null;
  const cacheMaxAge = parseCacheControlMaxAge(cacheControl);

  if (agePresent && ageSeconds === null) {
    addFreshnessWarning(
      warnings,
      "Apple association CDN returned malformed Age metadata; freshness could not be verified.",
    );
  }
  if (cacheMaxAge.present && cacheMaxAge.seconds === null) {
    addFreshnessWarning(
      warnings,
      "Apple association CDN returned malformed Cache-Control max-age metadata; freshness could not be verified.",
    );
  }
  if (
    cacheMaxAge.seconds !== null &&
    cacheMaxAge.seconds > ASSOCIATION_FRESHNESS_POLICY.maxAgeSeconds
  ) {
    addFreshnessWarning(
      warnings,
      `Apple association CDN advertised max-age (${cacheMaxAge.seconds}s) exceeds the ${ASSOCIATION_FRESHNESS_POLICY.maxAgeSeconds}s freshness policy.`,
    );
  }
  if (!agePresent && !cacheMaxAge.present) {
    addFreshnessWarning(
      warnings,
      "Apple association CDN did not return Age or Cache-Control max-age metadata; freshness could not be verified.",
    );
    return;
  }
  if (ageSeconds === null) {
    addFreshnessWarning(
      warnings,
      "Apple association CDN freshness is unknown because its current cache age was not provided.",
    );
    return;
  }

  if (cacheMaxAge.seconds !== null && ageSeconds > cacheMaxAge.seconds) {
    addFreshnessWarning(
      warnings,
      `Apple association CDN cache age (${ageSeconds}s) exceeds its advertised max-age (${cacheMaxAge.seconds}s).`,
    );
  }
  if (ageSeconds > ASSOCIATION_FRESHNESS_POLICY.maxAgeSeconds) {
    addFreshnessWarning(
      warnings,
      `Apple association CDN cache age (${ageSeconds}s) exceeds the ${ASSOCIATION_FRESHNESS_POLICY.maxAgeSeconds}s freshness policy.`,
    );
  }
}

function inspectGoogleFreshness(document, warnings) {
  const hasMaxAge = Object.prototype.hasOwnProperty.call(
    document ?? {},
    "maxAge",
  );
  if (!hasMaxAge || document.maxAge === null || document.maxAge === "") {
    addFreshnessWarning(
      warnings,
      "Google Digital Asset Links statements did not return maxAge metadata; freshness could not be verified.",
    );
    return;
  }

  const maxAgeSeconds = parseSeconds(document.maxAge, "Google maxAge");
  if (maxAgeSeconds === null) {
    addFreshnessWarning(
      warnings,
      "Google Digital Asset Links statements returned malformed maxAge metadata; freshness could not be verified.",
    );
    return;
  }
  if (maxAgeSeconds > ASSOCIATION_FRESHNESS_POLICY.maxAgeSeconds) {
    addFreshnessWarning(
      warnings,
      `Google Digital Asset Links statements maxAge (${maxAgeSeconds}s) exceeds the ${ASSOCIATION_FRESHNESS_POLICY.maxAgeSeconds}s freshness policy.`,
    );
  }
}

function assertAppleAssociation(document, expectedAppId) {
  const hasCallback = document?.applinks?.details?.some(
    (detail) =>
      Array.isArray(detail?.appIDs) &&
      detail.appIDs.includes(expectedAppId) &&
      Array.isArray(detail?.components) &&
      detail.components.some(
        (component) => component?.["/"] === AUTH_CALLBACK_PATH,
      ),
  );

  if (!hasCallback) {
    throw new Error(
      `Apple association is missing the Calora app identity or exact ${AUTH_CALLBACK_PATH} callback. Check APPLE_TEAM_ID, bundle ID, and the production AASA response.`,
    );
  }
}

function assertAndroidAssociation(document, fingerprints) {
  const hasAppLink = Array.isArray(document)
    ? document.some(
        (statement) =>
          Array.isArray(statement?.relation) &&
          statement.relation.includes(ANDROID_RELATION) &&
          statement.target?.namespace === "android_app" &&
          statement.target?.package_name === PACKAGE_NAME &&
          Array.isArray(statement.target?.sha256_cert_fingerprints) &&
          statement.target.sha256_cert_fingerprints
            .map(normalizeFingerprint)
            .some((fingerprint) => fingerprints.includes(fingerprint)),
      )
    : false;

  if (!hasAppLink) {
    throw new Error(
      `Android asset links are missing the Calora package, expected signing fingerprint, or ${ANDROID_RELATION} relation. Check ANDROID_SHA256_FINGERPRINT and the production assetlinks response.`,
    );
  }
}

function assertGoogleStatements(document, fingerprints) {
  const hasAppLink = Array.isArray(document?.statements)
    ? document.statements.some((statement) => {
        const relationMatches =
          statement?.relation === ANDROID_RELATION ||
          (Array.isArray(statement?.relation) &&
            statement.relation.includes(ANDROID_RELATION));
        const target = statement?.target?.androidApp ?? statement?.target;
        const packageName = target?.packageName ?? target?.package_name;
        const certificate = target?.certificate?.sha256Fingerprint;
        const certificates = Array.isArray(target?.sha256_cert_fingerprints)
          ? target.sha256_cert_fingerprints
          : certificate
            ? [certificate]
            : [];

        return (
          relationMatches &&
          packageName === PACKAGE_NAME &&
          certificates
            .map(normalizeFingerprint)
            .some((fingerprint) => fingerprints.includes(fingerprint))
        );
      })
    : false;

  if (!hasAppLink) {
    throw new Error(
      `Google Digital Asset Links statements are missing the Calora package, expected signing fingerprint, or ${ANDROID_RELATION} relation. Check the published assetlinks response and signing configuration.`,
    );
  }
}

export async function checkAppleAndGoogleAssociationEvidence({
  origin = process.env.NATIVE_ASSOCIATION_ORIGIN ?? DEFAULT_ORIGIN,
  appleTeamId = process.env.APPLE_TEAM_ID,
  androidFingerprint = process.env.ANDROID_SHA256_FINGERPRINT,
  fetchImpl = fetch,
} = {}) {
  const normalizedOrigin = normalizeOrigin(origin);
  const expectedAppId = `${requiredValue(appleTeamId, "APPLE_TEAM_ID")}.${BUNDLE_ID}`;
  const fingerprints = expectedFingerprints(androidFingerprint);
  const hostname = new URL(normalizedOrigin).hostname;
  const appleUrl = `${APPLE_ASSOCIATION_CDN}/${hostname}`;
  const googleUrl = new URL(GOOGLE_STATEMENTS_ENDPOINT);
  googleUrl.searchParams.set("source.web.site", normalizedOrigin);
  googleUrl.searchParams.set("relation", ANDROID_RELATION);

  const [appleAssociation, googleStatements] = await Promise.all([
    fetchJsonUrl(appleUrl, "Apple association CDN", fetchImpl, {
      includeMetadata: true,
    }),
    fetchJsonUrl(
      googleUrl.toString(),
      "Google Digital Asset Links statements",
      fetchImpl,
      { includeMetadata: true },
    ),
  ]);

  const warnings = [];
  assertAppleAssociation(appleAssociation.body, expectedAppId);
  assertGoogleStatements(googleStatements.body, fingerprints);
  inspectAppleFreshness(appleAssociation.headers, warnings);
  inspectGoogleFreshness(googleStatements.body, warnings);

  return {
    origin: normalizedOrigin,
    checked: ["Apple association CDN", "Google Digital Asset Links statements"],
    warnings,
  };
}

export async function checkNativeAssociations({
  origin = process.env.NATIVE_ASSOCIATION_ORIGIN ?? DEFAULT_ORIGIN,
  appleTeamId = process.env.APPLE_TEAM_ID,
  androidFingerprint = process.env.ANDROID_SHA256_FINGERPRINT,
  fetchImpl = fetch,
} = {}) {
  const normalizedOrigin = normalizeOrigin(origin);
  const expectedAppId = `${requiredValue(appleTeamId, "APPLE_TEAM_ID")}.${BUNDLE_ID}`;
  const fingerprints = expectedFingerprints(androidFingerprint);

  const [appleAssociation, androidAssociation] = await Promise.all([
    fetchJson(
      "/.well-known/apple-app-site-association",
      normalizedOrigin,
      fetchImpl,
    ),
    fetchJson("/.well-known/assetlinks.json", normalizedOrigin, fetchImpl),
  ]);

  assertAppleAssociation(appleAssociation, expectedAppId);
  assertAndroidAssociation(androidAssociation, fingerprints);

  return {
    origin: normalizedOrigin,
    checked: [
      "Apple Universal Links exact auth callback",
      "Android App Links package identity and signing fingerprint",
    ],
  };
}

async function main() {
  const result = await checkNativeAssociations();
  console.info(
    `Native association monitor passed for ${result.origin}: ${result.checked.join("; ")}.`,
  );
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(
      `Native association monitor failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exitCode = 1;
  });
}
