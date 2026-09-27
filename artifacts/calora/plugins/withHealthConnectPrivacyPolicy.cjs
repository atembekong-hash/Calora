const fs = require("node:fs");
const path = require("node:path");
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");

const RATIONALE_ACTION = "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE";
const VIEW_PERMISSION_USAGE_ACTION =
  "android.intent.action.VIEW_PERMISSION_USAGE";
const VIEW_PERMISSION_USAGE_ALIAS = "ViewPermissionUsageActivity";
const POLICY_ACTIVITY = "HealthConnectPrivacyPolicyActivity";
const POLICY_URL = "https://mycaloraapp.com/privacy";

function actionNames(intentFilter) {
  return (intentFilter.action ?? []).map(
    (action) => action.$?.["android:name"],
  );
}

function hasAction(intentFilter, name) {
  return actionNames(intentFilter).includes(name);
}

function removeAction(intentFilters, name) {
  return intentFilters.flatMap((intentFilter) => {
    if (!hasAction(intentFilter, name)) return [intentFilter];
    const remainingActions = (intentFilter.action ?? []).filter(
      (action) => action.$?.["android:name"] !== name,
    );
    if (remainingActions.length === 0) return [];
    return [{ ...intentFilter, action: remainingActions }];
  });
}

/**
 * Configure the dedicated Health Connect rationale route. This plugin is listed
 * immediately before react-native-health-connect: Expo applies manifest mods in
 * reverse wrapping order, so this receives the third-party route and can replace
 * it without a generated-XML race.
 */
function withHealthConnectPrivacyPolicy(config) {
  const applicationId = config.android?.package;
  if (!applicationId) {
    throw new Error(
      "Calora Health Connect privacy policy plugin requires expo.android.package.",
    );
  }
  const activityName = `.${POLICY_ACTIVITY}`;

  config = withAndroidManifest(config, async (modConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      modConfig.modResults,
    );
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(
      modConfig.modResults,
    );
    const mainIntentFilters = mainActivity["intent-filter"] ?? [];
    const aliases = application["activity-alias"] ?? [];

    // Remove the generic third-party route when present. This is harmless on
    // versions that leave rationale routing to the host app.
    mainActivity["intent-filter"] = removeAction(
      mainIntentFilters,
      RATIONALE_ACTION,
    );

    const existingActivities = application.activity ?? [];
    const activityWithoutPolicy = existingActivities.filter(
      (activity) => activity.$?.["android:name"] !== activityName,
    );
    activityWithoutPolicy.push({
      $: {
        "android:name": activityName,
        // Health Connect starts this action from outside the app process. The
        // target is safe to export because it ignores every caller-supplied
        // value and opens only the fixed Calora privacy-policy URL below.
        "android:exported": "true",
        "android:label": "Calora privacy policy",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": RATIONALE_ACTION } }],
        },
      ],
    });
    application.activity = activityWithoutPolicy;

    const aliasesWithoutGenericRoute = aliases.filter(
      (alias) => alias.$?.["android:name"] !== VIEW_PERMISSION_USAGE_ALIAS,
    );
    aliasesWithoutGenericRoute.push({
      $: {
        "android:name": VIEW_PERMISSION_USAGE_ALIAS,
        "android:exported": "true",
        "android:targetActivity": activityName,
        "android:permission": "android.permission.START_VIEW_PERMISSION_USAGE",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": VIEW_PERMISSION_USAGE_ACTION } }],
          category: [
            {
              $: {
                "android:name": "android.intent.category.HEALTH_PERMISSIONS",
              },
            },
          ],
        },
      ],
    });
    application["activity-alias"] = aliasesWithoutGenericRoute;
    return modConfig;
  });

  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const javaRoot = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        ...applicationId.split("."),
      );
      fs.mkdirSync(javaRoot, { recursive: true });
      const destination = path.join(javaRoot, `${POLICY_ACTIVITY}.kt`);
      const source = `package ${applicationId}\n\nimport android.app.Activity\nimport android.content.Intent\nimport android.net.Uri\nimport android.os.Bundle\n\n/**\n * Fixed, system-browser-only Health Connect rationale route. No Health data,\n * app credentials, or caller-controlled URLs are accepted here.\n */\nclass ${POLICY_ACTIVITY} : Activity() {\n  override fun onCreate(savedInstanceState: Bundle?) {\n    super.onCreate(savedInstanceState)\n    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(\"${POLICY_URL}\")))\n    finish()\n  }\n}\n`;
      fs.writeFileSync(destination, source, "utf8");
      return modConfig;
    },
  ]);
}

module.exports = createRunOncePlugin(
  withHealthConnectPrivacyPolicy,
  "calora-health-connect-privacy-policy",
  "1.0.0",
);
module.exports.POLICY_ACTIVITY = POLICY_ACTIVITY;
module.exports.POLICY_URL = POLICY_URL;
