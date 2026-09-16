const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { createServer } = require('./serve');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calora-static-'));
const staticRoot = path.join(tempRoot, 'static-build');
const outsideFile = path.join(tempRoot, 'outside-secret.txt');
const publicAsset = 'console.log("calora");';
const outsideContent = 'must never be served';

fs.mkdirSync(path.join(staticRoot, 'assets'), { recursive: true });
fs.mkdirSync(path.join(staticRoot, 'ios'), { recursive: true });
fs.writeFileSync(path.join(staticRoot, 'assets', 'app.js'), publicAsset);
fs.writeFileSync(
  path.join(staticRoot, 'ios', 'manifest.json'),
  JSON.stringify({ id: 'calora-test' }),
);
fs.writeFileSync(outsideFile, outsideContent);
fs.symlinkSync(outsideFile, path.join(staticRoot, 'outside-link.txt'));

const server = createServer({
  staticRoot,
  basePath: '/calora',
  appName: 'Calora Test',
  landingPageTemplate: '<html>APP_NAME_PLACEHOLDER</html>',
});

let port;

before(
  () =>
    new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    }),
);

after(
  () =>
    new Promise((resolve) => {
      server.close(() => {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        resolve();
      });
    }),
);

function request(rawPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        method: 'GET',
        path: rawPath,
        headers: { host: 'localhost', ...headers },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.once('error', reject);
    req.end();
  });
}

test('serves a normal asset under the exact configured base path', async () => {
  const response = await request('/calora/assets/app.js?cache=1');

  assert.equal(response.status, 200);
  assert.equal(response.body, publicAsset);
});

test('serves an allowlisted platform manifest from the trusted file index', async () => {
  const response = await request('/calora/manifest', {
    'expo-platform': 'ios',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), { id: 'calora-test' });
});

test('does not treat a base-path prefix collision as the configured base path', async () => {
  const response = await request('/calorax/assets/app.js');

  assert.equal(response.status, 404);
});

test('never serves files outside the static root through traversal variants', async () => {
  const traversalPaths = [
    '/../outside-secret.txt',
    '/calora/../../outside-secret.txt',
    '/calora/%2e%2e%2foutside-secret.txt',
    '/calora/%2e%2e%5coutside-secret.txt',
    '/calora/..%5c..%5coutside-secret.txt',
    '/calora/%2f..%2foutside-secret.txt',
  ];

  for (const traversalPath of traversalPaths) {
    const response = await request(traversalPath);
    assert.notEqual(response.status, 200, traversalPath);
    assert.notEqual(response.body, outsideContent, traversalPath);
  }
});

test('rejects a symlink that resolves outside the static root', async () => {
  const response = await request('/calora/outside-link.txt');

  assert.equal(response.status, 403);
  assert.notEqual(response.body, outsideContent);
});

test('rejects malformed encoded paths without reading the filesystem target', async () => {
  const response = await request('/calora/%E0%A4%A');

  assert.equal(response.status, 400);
});