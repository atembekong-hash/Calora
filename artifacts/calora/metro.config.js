const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace root
const projectRoot = __dirname;
// In this repo, the workspace root is two levels up from artifacts/calora
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Enable symlink support for pnpm
config.resolver.unstable_enableSymlinks = true;

// 4. Enable package export support (needed for some modern packages)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
