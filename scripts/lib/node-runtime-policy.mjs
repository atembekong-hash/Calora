export const SUPPORTED_NODE_MAJOR = 22;
export const MIN_SUPPORTED_NODE = Object.freeze({ major: 22, minor: 13, patch: 0 });

export function parseNodeVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(value));
  if (!match) throw new Error("Node runtime version is not parseable.");
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function assertSupportedNodeRuntime(value = process.versions.node) {
  const parsed = parseNodeVersion(value);
  const belowMinimum =
    parsed.major < MIN_SUPPORTED_NODE.major ||
    (parsed.major === MIN_SUPPORTED_NODE.major && parsed.minor < MIN_SUPPORTED_NODE.minor) ||
    (parsed.major === MIN_SUPPORTED_NODE.major &&
      parsed.minor === MIN_SUPPORTED_NODE.minor &&
      parsed.patch < MIN_SUPPORTED_NODE.patch);
  if (parsed.major !== SUPPORTED_NODE_MAJOR || belowMinimum) {
    throw new Error(
      `Unsupported Node runtime ${value}; Calora API requires Node >=${MIN_SUPPORTED_NODE.major}.${MIN_SUPPORTED_NODE.minor}.${MIN_SUPPORTED_NODE.patch} and <${SUPPORTED_NODE_MAJOR + 1}.0.0.`,
    );
  }
  return parsed;
}
