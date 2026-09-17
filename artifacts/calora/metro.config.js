const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace root
const projectRoot = __dirname;
// This avoids relying on fixed relative paths if the monorepo structure changes
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo while preserving Expo's defaults
config.watchFolders = [...new Set([...(config.watchFolders ?? []), workspaceRoot])];

// Historical release snapshots can contain many thousands of files and are not
// part of the active workspace. Exclude them so the local watcher does not
// exhaust the container's file-descriptor limit.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  /\/\.step[^/]*\//,
  /\/artifacts\/calora\/static-build(?:\/|$)/,
];

// 2. Let Metro resolve modules from both the project and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Keep package exports enabled; Expo's default symlink handling is used.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
