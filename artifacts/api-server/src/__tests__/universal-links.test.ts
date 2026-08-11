/**
 * Tests for the invite landing page and universal-link verification files.
 *
 * Verifies:
 *  - GET /invite/TESTCODE  → 200, shows invite card with code badge, App Store
 *    button, Google Play button, and deep-link anchor
 *  - GET /invite           → 200, no code badge, no auto-attempt JS (safe empty)
 *  - GET /invite/:code with special chars → strips to alphanumeric only
 *  - Inline JS never throws when code is empty string (static analysis of
 *    the emitted script block)
 *  - GET /.well-known/apple-app-site-association → 503 when APPLE_TEAM_ID unset
 *  - GET /.well-known/assetlinks.json           → 503 when fingerprint unset
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import universalLinksRouter from '../routes/universal-links';

function makeApp() {
  const app = express();
  app.use(universalLinksRouter);
  return app;
}

describe('GET /invite/:code — landing page with a code', () => {
  const app = makeApp();

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.status).toBe(200);
  });

  it('sends HTML content-type', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('sets Cache-Control: no-store', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('shows the invite code badge', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toContain('class="code-badge"');
    expect(res.text).toContain('TESTCODE');
  });

  it('includes the App Store button', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toContain('App Store');
    expect(res.text).toContain('apps.apple.com');
  });

  it('includes the Google Play button', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toContain('Google Play');
    expect(res.text).toContain('play.google.com');
  });

  it('includes an "Open in Calora" anchor with the custom-scheme deep link', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toContain('id="openApp"');
    expect(res.text).toContain('href="caloraapp://invite/TESTCODE"');
  });

  it('emits the JS code variable with the sanitised code', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    // The inline script must serialise the code via JSON.stringify so it is
    // a quoted JS string literal — safe against injection.
    expect(res.text).toContain('var code = "TESTCODE"');
  });
});

describe('GET /invite — no code segment', () => {
  const app = makeApp();

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/invite');
    expect(res.status).toBe(200);
  });

  it('sends HTML content-type', async () => {
    const res = await request(app).get('/invite');
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('does NOT render a code badge', async () => {
    const res = await request(app).get('/invite');
    expect(res.text).not.toContain('class="code-badge"');
  });

  it('still shows App Store and Google Play buttons', async () => {
    const res = await request(app).get('/invite');
    expect(res.text).toContain('App Store');
    expect(res.text).toContain('Google Play');
  });

  it('inline JS early-returns for empty code — no assignment to window.location', async () => {
    const res = await request(app).get('/invite');
    // code must be the empty string so the guard `if (!code) return` fires
    expect(res.text).toContain('var code = ""');
    // The deep-link navigation line must still be present in source (it is
    // dead code when code is ""); its presence confirms no template error.
    expect(res.text).toContain('caloraapp://invite/');
  });
});

describe('GET /invite/:code — code sanitisation', () => {
  const app = makeApp();

  it('strips non-alphanumeric characters from the code', async () => {
    const res = await request(app).get('/invite/ABC-123!@#');
    expect(res.status).toBe(200);
    // Only "ABC123" should survive the /[^A-Za-z0-9]/g strip.
    // The JS code variable must be exactly the sanitised value.
    expect(res.text).toContain('var code = "ABC123"');
    // The code badge must not contain the raw special chars
    expect(res.text).not.toContain('class="code-badge">ABC-123');
  });

  it('treats a code of all special chars as empty — no badge, no deep link attempt', async () => {
    const res = await request(app).get('/invite/---');
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('class="code-badge"');
    expect(res.text).toContain('var code = ""');
  });
});

describe('GET /invite/:code — App Store URL', () => {
  const savedId = process.env['APPLE_APP_STORE_ID'];

  afterEach(() => {
    if (savedId === undefined) {
      delete process.env['APPLE_APP_STORE_ID'];
    } else {
      process.env['APPLE_APP_STORE_ID'] = savedId;
    }
  });

  it('uses a direct App Store URL when APPLE_APP_STORE_ID is set', async () => {
    process.env['APPLE_APP_STORE_ID'] = '9876543210';
    const app = makeApp();
    const res = await request(app).get('/invite/X');
    expect(res.text).toContain('apps.apple.com/app/id9876543210');
  });

  it('falls back to App Store search when APPLE_APP_STORE_ID is absent', async () => {
    delete process.env['APPLE_APP_STORE_ID'];
    const app = makeApp();
    const res = await request(app).get('/invite/X');
    expect(res.text).toContain('apps.apple.com/search?term=calora');
  });
});

describe('GET /invite/:code — Open Graph and Twitter Card meta tags', () => {
  const app = makeApp();

  it('includes og:title', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toContain('property="og:title"');
    expect(res.text).toContain("You're invited to Calora!");
  });

  it('includes og:description', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toContain('property="og:description"');
    expect(res.text).toContain('free week of Calora Pro');
  });

  it('includes og:image pointing to an absolute PNG URL', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toMatch(/property="og:image"\s+content="https?:\/\/[^"]+\/invite\/og-image\.png"/);
  });

  it('declares og:image:type as image/png', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toContain('content="image/png"');
  });

  it('declares og:image:width and og:image:height', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toContain('content="1200"');
    expect(res.text).toContain('content="630"');
  });

  it('includes og:url with the page URL', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toMatch(/property="og:url"\s+content="https?:\/\/[^"]+\/invite\/TESTCODE"/);
  });

  it('sets twitter:card to summary_large_image', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toContain('name="twitter:card"');
    expect(res.text).toContain('content="summary_large_image"');
  });

  it('includes twitter:image pointing to the PNG', async () => {
    const res = await request(app).get('/invite/TESTCODE');
    expect(res.text).toMatch(/name="twitter:image"\s+content="https?:\/\/[^"]+\/invite\/og-image\.png"/);
  });
});

describe('GET /invite/og-image.png — preview image', () => {
  const app = makeApp();

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/invite/og-image.png');
    expect(res.status).toBe(200);
  });

  it('sends image/png content-type', async () => {
    const res = await request(app).get('/invite/og-image.png');
    expect(res.headers['content-type']).toMatch(/image\/png/);
  });

  it('sets a long-lived Cache-Control header', async () => {
    const res = await request(app).get('/invite/og-image.png');
    expect(res.headers['cache-control']).toContain('max-age=86400');
  });

  it('responds with a non-empty body (valid PNG bytes)', async () => {
    const res = await request(app).get('/invite/og-image.png');
    // PNG magic bytes: 89 50 4E 47 …
    const buf = Buffer.from(res.body as Buffer);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // P
    expect(buf[2]).toBe(0x4e); // N
    expect(buf[3]).toBe(0x47); // G
  });
});

describe('GET /.well-known/apple-app-site-association', () => {
  const savedTeamId = process.env['APPLE_TEAM_ID'];

  afterEach(() => {
    if (savedTeamId === undefined) {
      delete process.env['APPLE_TEAM_ID'];
    } else {
      process.env['APPLE_TEAM_ID'] = savedTeamId;
    }
  });

  it('returns 503 when APPLE_TEAM_ID is not configured', async () => {
    delete process.env['APPLE_TEAM_ID'];
    const app = makeApp();
    const res = await request(app).get('/.well-known/apple-app-site-association');
    expect(res.status).toBe(503);
  });

  it('returns 200 with applinks JSON when APPLE_TEAM_ID is set', async () => {
    process.env['APPLE_TEAM_ID'] = 'AB12CD34EF';
    const app = makeApp();
    const res = await request(app).get('/.well-known/apple-app-site-association');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('applinks');
    expect(JSON.stringify(res.body)).toContain('AB12CD34EF.com.etiendem.caloraapp');
  });

  it('covers /invite/* in the applinks components', async () => {
    process.env['APPLE_TEAM_ID'] = 'AB12CD34EF';
    const app = makeApp();
    const res = await request(app).get('/.well-known/apple-app-site-association');
    expect(JSON.stringify(res.body)).toContain('/invite/*');
  });
});

describe('GET /.well-known/assetlinks.json', () => {
  const savedFp = process.env['ANDROID_SHA256_FINGERPRINT'];

  afterEach(() => {
    if (savedFp === undefined) {
      delete process.env['ANDROID_SHA256_FINGERPRINT'];
    } else {
      process.env['ANDROID_SHA256_FINGERPRINT'] = savedFp;
    }
  });

  it('returns 503 when ANDROID_SHA256_FINGERPRINT is not configured', async () => {
    delete process.env['ANDROID_SHA256_FINGERPRINT'];
    const app = makeApp();
    const res = await request(app).get('/.well-known/assetlinks.json');
    expect(res.status).toBe(503);
  });

  it('returns 200 with the fingerprint when configured', async () => {
    process.env['ANDROID_SHA256_FINGERPRINT'] =
      'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99';
    const app = makeApp();
    const res = await request(app).get('/.well-known/assetlinks.json');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].target.package_name).toBe('com.etiendem.caloraapp');
    expect(res.body[0].target.sha256_cert_fingerprints).toContain(
      'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
    );
  });

  it('supports comma-separated fingerprints', async () => {
    process.env['ANDROID_SHA256_FINGERPRINT'] = 'AA:BB, CC:DD';
    const app = makeApp();
    const res = await request(app).get('/.well-known/assetlinks.json');
    expect(res.status).toBe(200);
    expect(res.body[0].target.sha256_cert_fingerprints).toHaveLength(2);
    expect(res.body[0].target.sha256_cert_fingerprints).toContain('AA:BB');
    expect(res.body[0].target.sha256_cert_fingerprints).toContain('CC:DD');
  });
});
