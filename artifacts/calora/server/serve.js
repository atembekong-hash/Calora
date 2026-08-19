/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with two special routes:
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 * - GET / without expo-platform → landing page HTML
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const STATIC_ROOT = path.resolve(__dirname, '..', 'static-build');
const TEMPLATE_PATH = path.resolve(__dirname, 'templates', 'landing-page.html');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json',
};

function getAppName(appJsonPath = path.resolve(__dirname, '..', 'app.json')) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    return typeof appJson.expo?.name === 'string'
      ? appJson.expo.name
      : 'App Landing Page';
  } catch {
    return 'App Landing Page';
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toScriptString(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}

function normalizeBasePath(value) {
  const normalized = (value || '/').replace(/\/+$/, '');
  return normalized === '/' ? '' : normalized;
}

function isPathInside(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return (
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function resolveStaticRequestPath(urlPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    return { status: 400 };
  }

  if (decodedPath.includes('\0')) {
    return { status: 400 };
  }

  const segments = decodedPath.replaceAll('\\', '/').split('/');
  const canonicalSegments = [];
  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      return { status: 403 };
    }
    canonicalSegments.push(segment);
  }

  if (canonicalSegments.length === 0) {
    return { status: 404 };
  }

  return { status: 200, requestPath: `/${canonicalSegments.join('/')}` };
}

function buildStaticFileIndex(staticRoot) {
  const files = new Map();
  if (!fs.existsSync(staticRoot) || !fs.statSync(staticRoot).isDirectory()) {
    return files;
  }

  const realStaticRoot = fs.realpathSync(staticRoot);

  function visitDirectory(directoryPath, requestPrefix = '') {
    for (const entry of fs.readdirSync(directoryPath, {
      withFileTypes: true,
    })) {
      const requestPath = `/${path.posix.join(requestPrefix, entry.name)}`;
      const candidatePath = path.join(directoryPath, entry.name);

      if (entry.isSymbolicLink()) {
        files.set(requestPath, { status: 403 });
        continue;
      }

      if (entry.isDirectory()) {
        visitDirectory(candidatePath, path.posix.join(requestPrefix, entry.name));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const realFilePath = fs.realpathSync(candidatePath);
      if (!isPathInside(realStaticRoot, realFilePath)) {
        files.set(requestPath, { status: 403 });
        continue;
      }

      const ext = path.extname(realFilePath).toLowerCase();
      files.set(requestPath, {
        status: 200,
        contentType: MIME_TYPES[ext] || 'application/octet-stream',
        read: () => fs.readFileSync(realFilePath),
      });
    }
  }

  visitDirectory(staticRoot);
  return files;
}

function serveManifest(platform, res, staticFiles) {
  const manifestEntry = staticFiles.get(`/${platform}/manifest.json`);

  if (!manifestEntry || manifestEntry.status !== 200) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  const manifest = manifestEntry.read().toString('utf8');
  res.writeHead(200, {
    'content-type': 'application/json',
    'expo-protocol-version': '1',
    'expo-sfv-version': '0',
  });
  res.end(manifest);
}

function serveLandingPage(
  req,
  res,
  landingPageTemplate,
  appName,
  configuredBasePath,
) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = forwardedProto || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `exps://${host}${configuredBasePath}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_ATTRIBUTE_PLACEHOLDER/g, escapeHtml(expsUrl))
    .replace(/EXPS_URL_JSON_PLACEHOLDER/g, toScriptString(expsUrl))
    .replace(/APP_NAME_PLACEHOLDER/g, escapeHtml(appName));

  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

function serveStaticFile(urlPath, res, staticFiles) {
  const resolvedRequest = resolveStaticRequestPath(urlPath);
  if (resolvedRequest.status !== 200) {
    res.writeHead(resolvedRequest.status);
    const statusMessage = {
      400: 'Bad Request',
      403: 'Forbidden',
      404: 'Not Found',
    }[resolvedRequest.status];
    res.end(statusMessage || 'Request Rejected');
    return;
  }

  const staticFile = staticFiles.get(resolvedRequest.requestPath);
  if (!staticFile) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  if (staticFile.status !== 200) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const content = staticFile.read();
  res.writeHead(200, { 'content-type': staticFile.contentType });
  res.end(content);
}

function createServer(options = {}) {
  const staticRoot = path.resolve(options.staticRoot || STATIC_ROOT);
  const configuredBasePath = normalizeBasePath(
    options.basePath ?? process.env.BASE_PATH ?? '/',
  );
  const landingPageTemplate =
    options.landingPageTemplate ?? fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const appName = options.appName ?? getAppName(options.appJsonPath);
  const staticFiles = buildStaticFileIndex(staticRoot);

  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    let pathname = url.pathname;

    if (
      configuredBasePath &&
      (pathname === configuredBasePath ||
        pathname.startsWith(`${configuredBasePath}/`))
    ) {
      pathname = pathname.slice(configuredBasePath.length) || '/';
    }

    if (pathname === '/' || pathname === '/manifest') {
      const platform = req.headers['expo-platform'];
      if (platform === 'ios' || platform === 'android') {
        return serveManifest(platform, res, staticFiles);
      }

      if (pathname === '/') {
        return serveLandingPage(
          req,
          res,
          landingPageTemplate,
          appName,
          configuredBasePath,
        );
      }
    }

    serveStaticFile(pathname, res, staticFiles);
  });
}

if (require.main === module) {
  const server = createServer();
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen(port, '0.0.0.0', () => {
    console.log(`Serving static Expo build on port ${port}`);
  });
}

module.exports = {
  buildStaticFileIndex,
  createServer,
  isPathInside,
  resolveStaticRequestPath,
};
