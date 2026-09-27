import fs from "node:fs";

const configPath = process.argv[2];
if (!configPath) {
  throw new Error(
    "Usage: node scripts/ci/validate-eas-native-profiles.mjs <eas-json>",
  );
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const profiles = config?.build;
const failures = [];
const production = profiles?.production;

if (!production || typeof production !== "object") {
  failures.push("production EAS build profile is required");
}
if (production?.environment !== "production") {
  failures.push(
    "production EAS build profile must select the production environment",
  );
}
if (production?.env?.EXPO_PUBLIC_API_URL !== "https://mycaloraapp.com") {
  failures.push(
    "production EAS build profile must use the canonical Calora API origin",
  );
}

for (const profileName of ["development-device", "preview", "production-apk"]) {
  const profile = profiles?.[profileName];
  if (!profile || typeof profile !== "object") {
    failures.push(`${profileName} EAS build profile is required`);
    continue;
  }

  if (profile.extends !== "production") {
    failures.push(
      `${profileName} must inherit the production API configuration`,
    );
  }
  if (profileName !== "production-apk" && profile.distribution !== "internal") {
    failures.push(
      `${profileName} must remain an internal distribution profile`,
    );
  }
  if (
    profileName !== "production-apk" &&
    profile.android?.buildType !== "apk"
  ) {
    failures.push(`${profileName} must produce an installable Android APK`);
  }
}

if (profiles?.["production-apk"]?.distribution !== "internal") {
  failures.push("production-apk must remain an internal distribution profile");
}
if (profiles?.["production-apk"]?.android?.buildType !== "apk") {
  failures.push("production-apk must produce an installable Android APK");
}

if (failures.length > 0) {
  throw new Error(
    `Native EAS profile validation failed:\n- ${failures.join("\n- ")}`,
  );
}

console.log(
  JSON.stringify(
    {
      status: "ok",
      canonicalApiOrigin: production.env.EXPO_PUBLIC_API_URL,
      signedDeviceProfiles: ["development-device", "preview", "production-apk"],
    },
    null,
    2,
  ),
);
