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

// Metro can otherwise resolve React through both the workspace symlink and a
// peer dependency's pnpm-scoped node_modules directory. On web that embeds a
// second React/React DOM runtime in the single entry bundle. Pin only the web
// runtime to the workspace copies; native resolution keeps Expo's defaults.
const reactRoot = path.dirname(require.resolve('react/package.json'));
const reactDomRoot = path.dirname(require.resolve('react-dom/package.json'));
const webSingletons = new Map([
  ['react', path.join(reactRoot, 'index.js')],
  ['react/jsx-runtime', path.join(reactRoot, 'jsx-runtime.js')],
  ['react/jsx-dev-runtime', path.join(reactRoot, 'jsx-dev-runtime.js')],
  ['react-dom', path.join(reactDomRoot, 'index.js')],
  ['react-dom/client', path.join(reactDomRoot, 'client.js')],
  ['react-dom/server', path.join(reactDomRoot, 'server.js')],
]);
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webSingletons.has(moduleName)) {
    return { type: 'sourceFile', filePath: webSingletons.get(moduleName) };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
