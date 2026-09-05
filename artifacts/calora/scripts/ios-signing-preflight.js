const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const appConfigPath = path.join(projectRoot, 'app.json');
const easConfigPath = path.join(projectRoot, 'eas.json');
const easGraphqlUrl = process.env.EAS_GRAPHQL_URL || 'https://api.expo.dev/graphql';
const accountName = 'vvault07';
const projectName = 'calora';
const profileName = 'production';
const distributionType = 'APP_STORE';
const DEFAULT_WARNING_WINDOW_DAYS = 30;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const FAILURE_CLASSES = {
  LOCAL_CONFIGURATION: 'LOCAL_CONFIGURATION',
  EAS_SERVICE: 'EAS_SERVICE',
  EAS_RECORD: 'EAS_RECORD',
  EAS_BUILD: 'EAS_BUILD',
  APPLE_CERTIFICATE_STATE: 'APPLE_CERTIFICATE_STATE',
  HOST_PLATFORM: 'HOST_PLATFORM',
};

const REPAIR_COMMAND =
  'eas credentials --platform ios (choose "Build Credentials: Manage everything needed to build your project", then "All: Set up all the required credentials to build your project"; if needed, use "Distribution Certificate: Use an existing one for your project" or "Distribution Certificate: Add a new one to your account")';
const REPAIR_GUIDE_URL = 'https://docs.expo.dev/app-signing/app-credentials/';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadBuildIdentity() {
  const appConfig = readJson(appConfigPath);
  const easConfig = readJson(easConfigPath);
  const bundleIdentifier = appConfig?.expo?.ios?.bundleIdentifier;
  const productionProfile = easConfig?.build?.[profileName];

  if (!bundleIdentifier) {
    throw new Error(`iOS bundleIdentifier is missing from ${path.basename(appConfigPath)}.`);
  }
  if (!productionProfile) {
    throw new Error(`EAS build profile "${profileName}" is missing from ${path.basename(easConfigPath)}.`);
  }

  return {
    bundleIdentifier,
    projectFullName: `@${accountName}/${projectName}`,
  };
}

function getToken() {
  return process.env.EXPO_TOKEN?.trim() || process.env.EAS_TOKEN?.trim() || null;
}

function redactSensitiveText(value) {
  return String(value)
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(
      /(certificate(?:p12|password)?|password|token|secret|private\s+key)\s*[:=]\s*\S+/gi,
      '$1=[redacted]',
    )
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, '[redacted credential block]');
}

async function easRequest(query, variables, token) {
  const response = await fetch(easGraphqlUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`EAS credentials service returned HTTP ${response.status}.`);
  }

  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map((error) => error.message).join('; ');
    throw new Error(message || `EAS credentials service returned HTTP ${response.status}.`);
  }

  return payload.data;
}

async function getAppleAppIdentifierId(bundleIdentifier, token) {
  const data = await easRequest(
    `
      query AppleAppIdentifierForCalora(
        $accountName: String!
        $bundleIdentifier: String!
      ) {
        account {
          byName(accountName: $accountName) {
            appleAppIdentifiers(bundleIdentifier: $bundleIdentifier) {
              id
            }
          }
        }
      }
    `,
    { accountName, bundleIdentifier },
    token,
  );

  return data.account?.byName?.appleAppIdentifiers?.[0]?.id || null;
}

async function getAppStoreCredentials(bundleIdentifier, token) {
  const appleAppIdentifierId = await getAppleAppIdentifierId(bundleIdentifier, token);
  if (!appleAppIdentifierId) {
    return null;
  }

  const data = await easRequest(
    `
      query CaloraIosAppStoreCredentials(
        $projectFullName: String!
        $appleAppIdentifierId: String!
        $distributionType: IosDistributionType!
      ) {
        app {
          byFullName(fullName: $projectFullName) {
            iosAppCredentials(filter: { appleAppIdentifierId: $appleAppIdentifierId }) {
              iosAppBuildCredentialsList(
                filter: { iosDistributionType: $distributionType }
              ) {
                distributionCertificate {
                  id
                  serialNumber
                  validityNotBefore
                  validityNotAfter
                  appleTeam {
                    appleTeamIdentifier
                  }
                }
                provisioningProfile {
                  id
                  expiration
                  status
                }
              }
            }
          }
        }
      }
    `,
    {
      projectFullName: `@${accountName}/${projectName}`,
      appleAppIdentifierId,
      distributionType,
    },
    token,
  );

  return data.app?.byFullName?.iosAppCredentials?.[0]?.iosAppBuildCredentialsList?.[0] || null;
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseWarningWindowDays(value = DEFAULT_WARNING_WINDOW_DAYS) {
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error('The iOS signing warning window must be a whole number of days from 1 to 365.');
  }
  return days;
}

function evaluateCredentialExpiryRisk(credentials, now = new Date(), warningWindowDays = DEFAULT_WARNING_WINDOW_DAYS) {
  const windowDays = parseWarningWindowDays(warningWindowDays);
  const readiness = evaluateCredentialReadiness(credentials, now);
  if (!readiness.ready) {
    return {
      ...readiness,
      warning: false,
      warningWindowDays: windowDays,
      warnings: [],
    };
  }

  const expirations = [
    {
      credential: 'distribution certificate',
      expires: readiness.certificateExpires,
    },
    {
      credential: 'provisioning profile',
      expires: readiness.provisioningProfileExpires,
    },
  ];
  const warnings = expirations
    .map(({ credential, expires }) => {
      const expiration = parseDate(expires);
      const daysRemaining = Math.ceil((expiration.getTime() - now.getTime()) / DAY_IN_MILLISECONDS);
      return {
        credential,
        expires,
        daysRemaining,
      };
    })
    .filter(({ daysRemaining }) => daysRemaining <= windowDays);

  return {
    ...readiness,
    warning: warnings.length > 0,
    warningWindowDays: windowDays,
    warnings,
  };
}

function evaluateCredentialReadiness(credentials, now = new Date()) {
  if (!credentials) {
    return {
      ready: false,
      failureClass: FAILURE_CLASSES.EAS_RECORD,
      reason: 'No App Store iOS build credentials are assigned to this app.',
    };
  }

  const certificate = credentials.distributionCertificate;
  if (!certificate) {
    return {
      ready: false,
      failureClass: FAILURE_CLASSES.EAS_RECORD,
      reason: 'No iOS distribution certificate is assigned to the App Store build credentials.',
    };
  }

  const certificateNotBefore = parseDate(certificate.validityNotBefore);
  const certificateNotAfter = parseDate(certificate.validityNotAfter);
  if (!certificateNotBefore || !certificateNotAfter) {
    return {
      ready: false,
      failureClass: FAILURE_CLASSES.EAS_RECORD,
      reason: 'The assigned iOS distribution certificate has no readable validity window.',
    };
  }
  if (now < certificateNotBefore || now > certificateNotAfter) {
    return {
      ready: false,
      failureClass: FAILURE_CLASSES.EAS_RECORD,
      reason: `The assigned iOS distribution certificate is outside its validity window (ends ${formatDate(certificateNotAfter)}).`,
    };
  }

  const provisioningProfile = credentials.provisioningProfile;
  if (!provisioningProfile) {
    return {
      ready: false,
      failureClass: FAILURE_CLASSES.EAS_RECORD,
      reason: 'No iOS provisioning profile is assigned to the App Store build credentials.',
    };
  }

  const profileExpiration = parseDate(provisioningProfile.expiration);
  if (!profileExpiration) {
    return {
      ready: false,
      failureClass: FAILURE_CLASSES.EAS_RECORD,
      reason: 'The assigned iOS provisioning profile has no readable expiration date.',
    };
  }
  if (now > profileExpiration) {
    return {
      ready: false,
      failureClass: FAILURE_CLASSES.EAS_RECORD,
      reason: `The assigned iOS provisioning profile expired on ${formatDate(profileExpiration)}.`,
    };
  }
  if (provisioningProfile.status && provisioningProfile.status !== 'ACTIVE') {
    return {
      ready: false,
      failureClass: FAILURE_CLASSES.EAS_RECORD,
      reason: `The assigned iOS provisioning profile is not active (status: ${provisioningProfile.status}).`,
    };
  }

  return {
    ready: true,
    certificateExpires: formatDate(certificateNotAfter),
    provisioningProfileExpires: formatDate(profileExpiration),
  };
}

function classifyBuildFailure(output) {
  const text = String(output);
  const appleCertificatePattern =
    /(?:apple|developer portal|itunes connect|app store connect|codesign|certificate|provisioning profile).*(?:revok|invalid|not valid|expired|rejected|ineligible)|(?:revok|invalid|expired|rejected|ineligible).*(?:apple|developer portal|itunes connect|app store connect|codesign|certificate|provisioning profile)|ITMS-(?:90035|90161)/i;

  if (appleCertificatePattern.test(text)) {
    return {
      failureClass: FAILURE_CLASSES.APPLE_CERTIFICATE_STATE,
      reason:
        'EAS reached the Apple signing step, but Apple rejected or invalidated the distribution certificate or provisioning profile.',
    };
  }

  return {
    failureClass: FAILURE_CLASSES.EAS_BUILD,
    reason:
      'The EAS build failed without a recognizable Apple certificate-state response; Apple-side revocation was not proven.',
  };
}

function printFailure(reason, bundleIdentifier, failureClass = FAILURE_CLASSES.EAS_RECORD) {
  console.error('\n[ios-signing] RELEASE PREFLIGHT FAILED');
  console.error(`[ios-signing] Failure class: ${failureClass}`);
  console.error(`[ios-signing] ${redactSensitiveText(reason)}`);
  console.error(`[ios-signing] App: ${bundleIdentifier}`);
  printRepairPath();
}

function printRepairPath() {
  console.error(`[ios-signing] Repair interactively with: ${REPAIR_COMMAND}`);
  console.error(`[ios-signing] EAS credential guide: ${REPAIR_GUIDE_URL}`);
  console.error('[ios-signing] Do not paste certificates, passwords, or tokens into chat or logs.');
}

function printExpiryWarning(expiryRisk, bundleIdentifier) {
  console.error('\n[ios-signing] EXPIRATION WARNING');
  console.error(
    `[ios-signing] App Store signing credentials for ${bundleIdentifier} enter the ${expiryRisk.warningWindowDays}-day warning window.`,
  );
  for (const warning of expiryRisk.warnings) {
    const dayLabel = warning.daysRemaining === 1 ? 'day' : 'days';
    console.error(
      `[ios-signing] ${warning.credential} expires on ${warning.expires} (${warning.daysRemaining} ${dayLabel} remaining).`,
    );
  }
  printRepairPath();
}

function getWarningWindowDaysFromArgs(args = process.argv.slice(2)) {
  const inlineArgument = args.find((argument) => argument.startsWith('--warn-days='));
  const separateArgumentIndex = args.indexOf('--warn-days');
  const separateArgument =
    separateArgumentIndex >= 0 ? args[separateArgumentIndex + 1] : undefined;
  const requestedDays =
    inlineArgument?.slice('--warn-days='.length) ||
    separateArgument ||
    process.env.IOS_SIGNING_WARNING_DAYS ||
    DEFAULT_WARNING_WINDOW_DAYS;
  return parseWarningWindowDays(requestedDays);
}

function runEasBuild({ rehearsal = false, bundleIdentifier } = {}) {
  const command = process.env.EAS_CLI_COMMAND?.trim() || 'eas';
  const buildArguments = [
    'build',
    '--platform',
    'ios',
    '--profile',
    profileName,
    '--non-interactive',
    '--freeze-credentials',
  ];
  if (!rehearsal) {
    buildArguments.push('--no-wait');
  }

  const result = spawnSync(
    command,
    buildArguments,
    {
      cwd: projectRoot,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  if (result.error) {
    printFailure(
      `Unable to start the EAS CLI: ${result.error.message}`,
      bundleIdentifier,
      FAILURE_CLASSES.EAS_BUILD,
    );
    console.error('[ios-signing] Install an authenticated EAS CLI or set EAS_CLI_COMMAND to its path.');
    return 1;
  }

  if (result.status !== 0) {
    const classification = classifyBuildFailure(
      `${result.stdout || ''}\n${result.stderr || ''}`,
    );
    printFailure(classification.reason, bundleIdentifier, classification.failureClass);
    return result.status ?? 1;
  }

  if (rehearsal) {
    console.log('[ios-signing] APPLE CERTIFICATE REHEARSAL PASSED');
    console.log('[ios-signing] EAS completed the signed build without an Apple-side signing rejection.');
  } else {
    console.log('[ios-signing] EAS accepted the production build request.');
  }
  return 0;
}

async function main() {
  const appleRehearsal = process.argv.includes('--apple-rehearsal');
  const expiryMonitor = process.argv.some(
    (argument) => argument === '--warn-days' || argument.startsWith('--warn-days='),
  );
  let warningWindowDays;
  if (expiryMonitor) {
    try {
      warningWindowDays = getWarningWindowDaysFromArgs();
    } catch (error) {
      printFailure(error.message, 'unknown', FAILURE_CLASSES.LOCAL_CONFIGURATION);
      return 1;
    }
  }
  let identity;
  try {
    identity = loadBuildIdentity();
  } catch (error) {
    printFailure(error.message, 'unknown', FAILURE_CLASSES.LOCAL_CONFIGURATION);
    return 1;
  }

  if (appleRehearsal && process.platform !== 'darwin') {
    printFailure(
      'The Apple certificate rehearsal must run on macOS so the release environment matches the native signing host.',
      identity.bundleIdentifier,
      FAILURE_CLASSES.HOST_PLATFORM,
    );
    return 1;
  }

  const token = getToken();
  if (!token) {
    printFailure(
      'EXPO_TOKEN (or EAS_TOKEN) is required for the read-only EAS credentials check.',
      identity.bundleIdentifier,
      FAILURE_CLASSES.EAS_SERVICE,
    );
    return 1;
  }

  let credentials;
  try {
    credentials = await getAppStoreCredentials(identity.bundleIdentifier, token);
  } catch (error) {
    printFailure(
      `Could not read the EAS iOS signing record: ${error.message}`,
      identity.bundleIdentifier,
      FAILURE_CLASSES.EAS_SERVICE,
    );
    return 1;
  }

  const readiness = evaluateCredentialReadiness(credentials);
  if (!readiness.ready) {
    printFailure(readiness.reason, identity.bundleIdentifier, readiness.failureClass);
    return 1;
  }

  if (expiryMonitor) {
    const expiryRisk = evaluateCredentialExpiryRisk(credentials, new Date(), warningWindowDays);
    if (expiryRisk.warning) {
      printExpiryWarning(expiryRisk, identity.bundleIdentifier);
      return 1;
    }
  }

  console.log(
    [
      '\n[ios-signing] RELEASE PREFLIGHT PASSED',
      `[ios-signing] App Store distribution certificate ready for ${identity.projectFullName} (${identity.bundleIdentifier}).`,
      `[ios-signing] Certificate expires: ${readiness.certificateExpires}`,
      `[ios-signing] Provisioning profile expires: ${readiness.provisioningProfileExpires}`,
      '[ios-signing] This result validates the EAS record only; Apple-side state requires the macOS rehearsal.',
    ].join('\n'),
  );

  if (process.argv.includes('--queue-build') || appleRehearsal) {
    console.log(
      appleRehearsal
        ? '[ios-signing] EAS record is ready; running the controlled Apple certificate rehearsal...'
        : '[ios-signing] Credentials are ready; queuing the current revision with EAS...',
    );
    return runEasBuild({ rehearsal: appleRehearsal, bundleIdentifier: identity.bundleIdentifier });
  }

  console.log('[ios-signing] No build was started. Run pnpm build:ios:production to queue the signed build.');
  return 0;
}

if (require.main === module) {
  main()
    .then((exitCode) => process.exit(exitCode))
    .catch((error) => {
      printFailure(error.message, 'unknown', FAILURE_CLASSES.EAS_SERVICE);
      process.exit(1);
    });
}

module.exports = {
  classifyBuildFailure,
  evaluateCredentialReadiness,
  evaluateCredentialExpiryRisk,
  formatDate,
  getWarningWindowDaysFromArgs,
  loadBuildIdentity,
  parseWarningWindowDays,
  redactSensitiveText,
};