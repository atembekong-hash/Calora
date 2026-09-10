import fs from "node:fs";

const configPath = process.argv[2];
if (!configPath) {
  throw new Error(
    "Usage: node scripts/ci/validate-expo-config.mjs <expo-config-json>",
  );
}

const payload = JSON.parse(fs.readFileSync(configPath, "utf8"));
const expo = payload.expo ?? payload;
const failures = [];

if (expo?.name !== "Calora") failures.push("expo.name must be Calora");
if (expo?.scheme !== "caloraapp")
  failures.push("expo.scheme must be caloraapp");
if (expo?.ios?.bundleIdentifier !== "com.etiendem.caloraapp") {
  failures.push("expo.ios.bundleIdentifier is incorrect");
}
if (expo?.android?.package !== "com.etiendem.caloraapp") {
  failures.push("expo.android.package is incorrect");
}
if (!expo?.ios?.associatedDomains?.includes("applinks:mycaloraapp.com")) {
  failures.push("iOS branded associated domain is missing");
}

const androidFilters = expo?.android?.intentFilters ?? [];
const hasCallbackFilter = androidFilters.some((filter) =>
  filter.data?.some(
    (entry) =>
      entry.scheme === "https" &&
      entry.host === "mycaloraapp.com" &&
      entry.path === "/auth/callback",
  ),
);
if (!hasCallbackFilter)
  failures.push("Android auth callback App Link filter is missing");

const routerOrigin = expo?.plugins?.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === "expo-router",
)?.[1]?.origin;
if (routerOrigin !== "https://mycaloraapp.com/") {
  failures.push("Expo Router origin must be https://mycaloraapp.com/");
}

if (failures.length > 0) {
  throw new Error(
    `Expo configuration validation failed:\n- ${failures.join("\n- ")}`,
  );
}

console.log(
  JSON.stringify(
    {
      status: "ok",
      name: expo.name,
      scheme: expo.scheme,
      iosBundleIdentifier: expo.ios.bundleIdentifier,
      androidPackage: expo.android.package,
      associatedDomain: "mycaloraapp.com",
      authCallbackPath: "/auth/callback",
    },
    null,
    2,
  ),
);
