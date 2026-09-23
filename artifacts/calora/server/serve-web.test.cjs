const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { createServer } = require("./serve-web");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "calora-web-"));
const distRoot = path.join(tempRoot, "dist");
const outsideFile = path.join(tempRoot, "outside-secret.txt");
const indexHtml =
  '<!doctype html><html><body><div id="root">Calora web</div></body></html>';
const assetBody = 'console.log("calora-web");';
fs.mkdirSync(path.join(distRoot, "_expo", "static", "js", "web"), {
  recursive: true,
});
fs.mkdirSync(path.join(distRoot, "assets"), { recursive: true });
fs.writeFileSync(path.join(distRoot, "index.html"), indexHtml);
fs.writeFileSync(path.join(distRoot, "favicon.ico"), "ico");
fs.writeFileSync(
  path.join(distRoot, "_expo", "static", "js", "web", "entry-deadbeef.js"),
  assetBody,
);
fs.writeFileSync(path.join(distRoot, "assets", "meal-abc123.jpg"), "image");
fs.writeFileSync(outsideFile, "must never be served");
fs.symlinkSync(outsideFile, path.join(distRoot, "outside-link.txt"));

let apiPort;
let webPort;
let lastUpstreamRequest;
const apiServer = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    lastUpstreamRequest = {
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
      origin: req.headers.origin,
      cookie: req.headers.cookie,
      body: Buffer.concat(chunks).toString("utf8"),
    };
    res.writeHead(201, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "set-cookie": "upstream-private=must-not-reach-web; Secure",
    });
    res.end(JSON.stringify({ proxied: true }));
  });
});
let webServer;

before(async () => {
  await new Promise((resolve, reject) => {
    apiServer.once("error", reject);
    apiServer.listen(0, "127.0.0.1", () => {
      apiPort = apiServer.address().port;
      resolve();
    });
  });
  webServer = createServer({
    staticRoot: distRoot,
    apiUpstreamOrigin: `http://127.0.0.1:${apiPort}`,
  });
  await new Promise((resolve, reject) => {
    webServer.once("error", reject);
    webServer.listen(0, "127.0.0.1", () => {
      webPort = webServer.address().port;
      resolve();
    });
  });
});

after(async () => {
  await Promise.all([
    new Promise((resolve) => webServer.close(resolve)),
    new Promise((resolve) => apiServer.close(resolve)),
  ]);
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

function request(rawPath, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port: webPort, path: rawPath, method, headers },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    req.once("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

test("serves the Calora SPA at the root with no-store HTML caching and security headers", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  assert.equal(response.body, indexHtml);
  assert.match(response.headers["cache-control"], /no-store/);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "DENY");
  assert.equal(
    response.headers["strict-transport-security"],
    "max-age=31536000",
  );
  assert.match(
    response.headers["content-security-policy"],
    /frame-ancestors 'none'/,
  );
});

test("rewrites direct Expo Router paths to index.html", async () => {
  for (const route of [
    "/auth/sign-in",
    "/auth/callback?code=redacted",
    "/invite/ABC123",
    "/restaurants",
  ]) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    assert.equal(response.body, indexHtml, route);
  }
});

test("serves immutable hashed assets and HEAD requests", async () => {
  const get = await request("/_expo/static/js/web/entry-deadbeef.js");
  assert.equal(get.status, 200);
  assert.equal(get.body, assetBody);
  assert.match(get.headers["cache-control"], /immutable/);
  const head = await request("/assets/meal-abc123.jpg", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.body, "");
});

test("returns 404 for missing asset-like paths instead of the SPA shell", async () => {
  for (const route of [
    "/favicon-missing.ico",
    "/_expo/static/js/web/missing.js",
    "/assets/missing.jpg",
  ]) {
    const response = await request(route);
    assert.equal(response.status, 404, route);
  }
});

test("exposes a distinct no-store Railway health endpoint", async () => {
  const response = await request("/health");
  assert.equal(response.status, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(
    response.headers["strict-transport-security"],
    "max-age=31536000",
  );
  assert.deepEqual(JSON.parse(response.body), {
    status: "ok",
    service: "calora-web",
  });
});

test("proxies API methods, query, authorization, and body to the apex API", async () => {
  const response = await request("/api/v1/diary?date=2026-09-23", {
    method: "POST",
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
      origin: "https://app.mycaloraapp.com",
      cookie: "calora-web-private=must-not-leave-host",
    },
    body: '{"ok":true}',
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers["set-cookie"], undefined);
  assert.equal(
    response.headers["strict-transport-security"],
    "max-age=31536000",
  );
  assert.deepEqual(JSON.parse(response.body), { proxied: true });
  assert.deepEqual(lastUpstreamRequest, {
    method: "POST",
    url: "/api/v1/diary?date=2026-09-23",
    authorization: "Bearer test-token",
    origin: undefined,
    cookie: undefined,
    body: '{"ok":true}',
  });
});

test("never serves traversal or out-of-root symlink targets", async () => {
  for (const route of [
    "/../outside-secret.txt",
    "/%2e%2e%2foutside-secret.txt",
    "/..%5coutside-secret.txt",
  ]) {
    const response = await request(route);
    assert.notEqual(response.status, 200, route);
    assert.notEqual(response.body, "must never be served", route);
  }
  const symlink = await request("/outside-link.txt");
  assert.equal(symlink.status, 403);
});

test("rejects malformed encoded paths and non-API write methods", async () => {
  assert.equal((await request("/%E0%A4%A")).status, 400);
  const post = await request("/auth/sign-in", { method: "POST" });
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, "GET, HEAD");
});
