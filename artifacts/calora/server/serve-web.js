"use strict";

const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const zlib = require("node:zlib");

const DIST_ROOT = path.resolve(__dirname, "..", "dist");
const DEFAULT_API_UPSTREAM = "https://mycaloraapp.com";
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".otf": "font/otf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
const STRICT_TRANSPORT_SECURITY = "max-age=31536000";
const COMPRESSIBLE_TYPES = new Set([
  "application/javascript; charset=utf-8",
  "application/json; charset=utf-8",
  "application/octet-stream",
  "image/svg+xml",
  "text/css; charset=utf-8",
  "text/html; charset=utf-8",
]);

function isPathInside(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return (
    relativePath !== "" &&
    relativePath !== ".." &&
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
  if (decodedPath.includes("\0")) return { status: 400 };

  const segments = decodedPath.replaceAll("\\", "/").split("/");
  const canonicalSegments = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") return { status: 403 };
    canonicalSegments.push(segment);
  }
  if (canonicalSegments.length === 0) return { status: 404 };
  return { status: 200, requestPath: `/${canonicalSegments.join("/")}` };
}

function cacheControlFor(requestPath, contentType) {
  if (contentType.startsWith("text/html"))
    return "no-cache, no-store, must-revalidate";
  if (
    requestPath.startsWith("/_expo/static/") ||
    requestPath.startsWith("/assets/")
  ) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=300, must-revalidate";
}

function buildStaticFileIndex(staticRoot) {
  const files = new Map();
  if (!fs.existsSync(staticRoot) || !fs.statSync(staticRoot).isDirectory())
    return files;
  const realStaticRoot = fs.realpathSync(staticRoot);

  const visitDirectory = (directoryPath, requestPrefix = "") => {
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
        visitDirectory(
          candidatePath,
          path.posix.join(requestPrefix, entry.name),
        );
        continue;
      }
      if (!entry.isFile()) continue;

      const realFilePath = fs.realpathSync(candidatePath);
      if (!isPathInside(realStaticRoot, realFilePath)) {
        files.set(requestPath, { status: 403 });
        continue;
      }
      const contentType =
        MIME_TYPES[path.extname(realFilePath).toLowerCase()] ||
        "application/octet-stream";
      files.set(requestPath, {
        status: 200,
        contentType,
        cacheControl: cacheControlFor(requestPath, contentType),
        size: fs.statSync(realFilePath).size,
        read: () => fs.readFileSync(realFilePath),
      });
    }
  };

  visitDirectory(staticRoot);
  return files;
}

function setSecurityHeaders(res) {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; media-src 'self' blob: https:; worker-src 'self' blob:",
  );
  res.setHeader(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), payment=(self)",
  );
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", STRICT_TRANSPORT_SECURITY);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
}

function acceptsEncoding(header, encoding) {
  const entries = String(header || "")
    .toLowerCase()
    .split(",")
    .map((value) => value.trim().split(";"))
    .map(([name, ...parameters]) => {
      const quality = parameters.find((parameter) =>
        parameter.trim().startsWith("q="),
      );
      const parsedQuality = quality
        ? Number.parseFloat(quality.trim().slice(2))
        : 1;
      return [name, Number.isFinite(parsedQuality) ? parsedQuality : 0];
    });
  const exact = entries.find(([name]) => name === encoding);
  if (exact) return exact[1] > 0;
  const wildcard = entries.find(([name]) => name === "*");
  return wildcard ? wildcard[1] > 0 : false;
}

function preferredContentEncoding(header) {
  if (acceptsEncoding(header, "br")) return "br";
  if (acceptsEncoding(header, "gzip")) return "gzip";
  return null;
}

function getStaticBody(req, entry) {
  const body = entry.read();
  if (!COMPRESSIBLE_TYPES.has(entry.contentType)) {
    return { body, encoding: null };
  }

  const encoding = preferredContentEncoding(req.headers["accept-encoding"]);
  if (!encoding) return { body, encoding: null };

  // Cache compressed variants on the indexed entry: the large entry bundle is
  // requested repeatedly during a session, and recompressing it per request
  // would trade network savings for avoidable CPU spikes.
  entry.compressed ??= Object.create(null);
  if (!entry.compressed[encoding]) {
    const compressed =
      encoding === "br"
        ? zlib.brotliCompressSync(body, {
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
          })
        : zlib.gzipSync(body, { level: 6 });
    entry.compressed[encoding] =
      compressed.length < body.length ? compressed : body;
  }
  const compressedBody = entry.compressed[encoding];
  return {
    body: compressedBody,
    encoding: compressedBody === body ? null : encoding,
  };
}

function sendStaticEntry(req, res, entry) {
  if (entry.status !== 200) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const { body, encoding } = getStaticBody(req, entry);
  const headers = {
    "content-type": entry.contentType,
    "content-length": body.length,
    "cache-control": entry.cacheControl,
  };
  if (encoding) {
    headers["content-encoding"] = encoding;
    headers.vary = "Accept-Encoding";
  }
  res.writeHead(200, {
    ...headers,
  });
  if (req.method === "HEAD") res.end();
  else res.end(body);
}

function normalizeApiUpstream(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "CALORA_API_UPSTREAM_URL must be an absolute HTTP(S) origin.",
    );
  }
  const isLocalTest =
    url.protocol === "http:" &&
    ["127.0.0.1", "localhost"].includes(url.hostname);
  if (
    (!isLocalTest && url.protocol !== "https:") ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "CALORA_API_UPSTREAM_URL must be an HTTPS origin without path, query, fragment, or credentials.",
    );
  }
  return url;
}

function proxyApiRequest(req, res, upstream) {
  const transport = upstream.protocol === "https:" ? https : http;
  const headers = {};
  for (const [name, value] of Object.entries(req.headers)) {
    const lowerName = name.toLowerCase();
    if (
      !HOP_BY_HOP_HEADERS.has(lowerName) &&
      lowerName !== "host" &&
      lowerName !== "origin" &&
      lowerName !== "cookie"
    )
      headers[name] = value;
  }
  headers.host = upstream.host;
  headers["x-forwarded-host"] = req.headers.host || "";
  headers["x-forwarded-proto"] = req.headers["x-forwarded-proto"] || "https";

  const proxyRequest = transport.request(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || undefined,
      method: req.method,
      path: req.url,
      headers,
    },
    (proxyResponse) => {
      const responseHeaders = {};
      for (const [name, value] of Object.entries(proxyResponse.headers)) {
        if (
          !HOP_BY_HOP_HEADERS.has(name.toLowerCase()) &&
          name.toLowerCase() !== "set-cookie" &&
          value !== undefined
        )
          responseHeaders[name] = value;
      }
      res.writeHead(proxyResponse.statusCode || 502, responseHeaders);
      proxyResponse.pipe(res);
    },
  );
  proxyRequest.setTimeout(30_000, () =>
    proxyRequest.destroy(new Error("API upstream timeout")),
  );
  proxyRequest.on("error", () => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(502, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(
      JSON.stringify({ error: "Calora API is temporarily unavailable." }),
    );
  });
  req.pipe(proxyRequest);
}

function createServer(options = {}) {
  const staticRoot = path.resolve(options.staticRoot || DIST_ROOT);
  const staticFiles = buildStaticFileIndex(staticRoot);
  const indexEntry = staticFiles.get("/index.html");
  if (!indexEntry || indexEntry.status !== 200) {
    throw new Error(
      `Calora web distribution is missing ${path.join(staticRoot, "index.html")}.`,
    );
  }
  const apiUpstream = normalizeApiUpstream(
    options.apiUpstreamOrigin ||
      process.env.CALORA_API_UPSTREAM_URL ||
      DEFAULT_API_UPSTREAM,
  );

  return http.createServer((req, res) => {
    setSecurityHeaders(res);
    const host = req.headers.host || "localhost";
    let url;
    try {
      url = new URL(req.url || "/", `http://${host}`);
    } catch {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }

    if (url.pathname === "/health") {
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify({ status: "ok", service: "calora-web" }));
      return;
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      proxyApiRequest(req, res, apiUpstream);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { allow: "GET, HEAD" });
      res.end("Method Not Allowed");
      return;
    }

    const resolved = resolveStaticRequestPath(url.pathname);
    if (resolved.status === 400 || resolved.status === 403) {
      res.writeHead(resolved.status);
      res.end(resolved.status === 400 ? "Bad Request" : "Forbidden");
      return;
    }

    if (resolved.status === 200) {
      const exactEntry = staticFiles.get(resolved.requestPath);
      if (exactEntry) {
        sendStaticEntry(req, res, exactEntry);
        return;
      }
      if (
        path.posix.extname(resolved.requestPath) ||
        resolved.requestPath.startsWith("/_expo/")
      ) {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }
    }

    sendStaticEntry(req, res, indexEntry);
  });
}

if (require.main === module) {
  try {
    const server = createServer();
    const port = Number.parseInt(process.env.PORT || "3000", 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error("PORT must be an integer from 1 through 65535.");
    server.listen(port, "0.0.0.0", () =>
      console.log(`Calora web server listening on 0.0.0.0:${port}`),
    );
  } catch (error) {
    console.error(
      `[serve:web] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}

module.exports = {
  buildStaticFileIndex,
  cacheControlFor,
  createServer,
  isPathInside,
  normalizeApiUpstream,
  resolveStaticRequestPath,
};
