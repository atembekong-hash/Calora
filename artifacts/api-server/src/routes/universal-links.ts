/**
 * Universal / App Links verification files and invite fallback landing page.
 *
 * Served at the ROOT of the express app (not under /api) so the OS can find
 * them at the canonical paths the specs require:
 *   GET /.well-known/apple-app-site-association
 *   GET /.well-known/assetlinks.json
 *   GET /invite/:code
 *
 * Configuration (environment variables):
 *   APPLE_TEAM_ID               — Apple Developer Team ID (e.g. AB12CD34EF)
 *   ANDROID_SHA256_FINGERPRINT  — SHA-256 cert fingerprint from Play Console or
 *                                 `eas credentials -p android`; separate
 *                                 multiple fingerprints with a comma.
 *   APPLE_APP_STORE_ID          — Numeric App Store ID (e.g. 1234567890)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { Resvg } from "@resvg/resvg-js";

const router: IRouter = Router();

const BUNDLE_ID = "com.etiendem.caloraapp";
const PACKAGE_NAME = "com.etiendem.caloraapp";

// ── /.well-known/apple-app-site-association ──────────────────────────────────
router.get(
  "/.well-known/apple-app-site-association",
  (_req: Request, res: Response) => {
    const teamId = process.env["APPLE_TEAM_ID"] ?? "";
    if (!teamId) {
      // Still serve a valid JSON body so the OS receives parseable content;
      // the placeholder just won't match any installed app.
      res.status(503).set("Content-Type", "application/json").json({
        error: "APPLE_TEAM_ID is not configured on the server",
      });
      return;
    }

    const appId = `${teamId}.${BUNDLE_ID}`;
    res
      .status(200)
      .set("Content-Type", "application/json")
      .set("Cache-Control", "public, max-age=3600")
      .json({
        applinks: {
          details: [
            {
              appIDs: [appId],
              components: [
                {
                  "/": "/invite/*",
                  comment: "Open invite referral links in the CaloraApp",
                },
              ],
            },
          ],
        },
      });
  },
);

// ── /.well-known/assetlinks.json ─────────────────────────────────────────────
router.get(
  "/.well-known/assetlinks.json",
  (_req: Request, res: Response) => {
    const raw = process.env["ANDROID_SHA256_FINGERPRINT"] ?? "";
    if (!raw) {
      res.status(503).set("Content-Type", "application/json").json({
        error: "ANDROID_SHA256_FINGERPRINT is not configured on the server",
      });
      return;
    }

    // Support comma-separated list of fingerprints (e.g. upload key + Play
    // signing key).
    const fingerprints = raw
      .split(",")
      .map((f) => f.trim().toUpperCase())
      .filter(Boolean);

    res
      .status(200)
      .set("Content-Type", "application/json")
      .set("Cache-Control", "public, max-age=3600")
      .json([
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: PACKAGE_NAME,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]);
  },
);

// ── /invite/og-image.png — branded Open Graph preview image ──────────────────
// Generated at request time from SVG via @resvg/resvg-js (WASM, no native deps).
// Cached in-process after the first render; the image is static so one copy is fine.
let cachedOgPng: Buffer | null = null;

function buildOgSvg(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff8f5"/>
      <stop offset="100%" stop-color="#ffe8dc"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1100" cy="80" r="160" fill="#ff6b35" opacity="0.08"/>
  <circle cx="100" cy="550" r="120" fill="#ff6b35" opacity="0.06"/>
  <rect x="260" y="115" width="680" height="400" rx="32" fill="#ffffff" opacity="0.95"/>
  <rect x="556" y="165" width="88" height="88" rx="22" fill="#ff6b35"/>
  <text x="600" y="220" font-family="Arial,Helvetica,sans-serif" font-size="52" text-anchor="middle" dominant-baseline="middle">C</text>
  <text x="600" y="300" font-family="Arial,Helvetica,sans-serif" font-size="40" font-weight="700" fill="#1a1a1a" text-anchor="middle">You&#x27;re invited to Calora!</text>
  <text x="600" y="352" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#666666" text-anchor="middle">Track nutrition effortlessly with AI</text>
  <rect x="436" y="386" width="328" height="56" rx="28" fill="#ff6b35"/>
  <text x="600" y="414" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">Get 1 week of Pro free</text>
  <text x="600" y="570" font-family="Arial,Helvetica,sans-serif" font-size="20" fill="#ff6b35" text-anchor="middle" opacity="0.7">calora.app</text>
</svg>`;
}

function getOgPng(): Buffer {
  if (!cachedOgPng) {
    const resvg = new Resvg(buildOgSvg(), { fitTo: { mode: "width", value: 1200 } });
    cachedOgPng = Buffer.from(resvg.render().asPng());
  }
  return cachedOgPng;
}

router.get("/invite/og-image.png", (_req: Request, res: Response) => {
  try {
    const png = getOgPng();
    res
      .status(200)
      .set("Content-Type", "image/png")
      .set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
      .send(png);
  } catch (err) {
    res.status(500).send("Image generation failed");
  }
});

// ── /invite and /invite/:code — fallback landing page for users without the app
function renderInvitePage(code: string, req: Request, res: Response): void {
  const appStoreId = process.env["APPLE_APP_STORE_ID"] ?? "";
  const appStoreUrl = appStoreId
    ? `https://apps.apple.com/app/id${appStoreId}`
    : "https://apps.apple.com/search?term=calora";
  const playStoreUrl = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;
  const deepLink = `caloraapp://invite/${code}`;

  // Build absolute base URL from the incoming request so OG tags are correct
  // in both dev (replit.dev) and production.
  const proto = req.get("x-forwarded-proto") ?? req.protocol ?? "https";
  const host = req.get("x-forwarded-host") ?? req.get("host") ?? "calora.app";
  const baseUrl = `${proto}://${host}`;
  const pageUrl = code ? `${baseUrl}/invite/${code}` : `${baseUrl}/invite`;
  const ogImageUrl = `${baseUrl}/invite/og-image.png`;

  res
    .status(200)
    .set("Content-Type", "text/html; charset=utf-8")
    .set("Cache-Control", "no-store")
    .set("X-Robots-Tag", "noindex")
    .send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>You're invited to Calora!</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Calora" />
  <meta property="og:title" content="You're invited to Calora!" />
  <meta property="og:description" content="A friend invited you to track nutrition effortlessly with AI. Get a free week of Calora Pro when you sign up using their invite link." />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${pageUrl}" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="You're invited to Calora!" />
  <meta name="twitter:description" content="Track nutrition effortlessly with AI. Get a free week of Calora Pro." />
  <meta name="twitter:image" content="${ogImageUrl}" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8f4f0;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #ffffff;
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .logo {
      width: 72px;
      height: 72px;
      border-radius: 18px;
      background: #ff6b35;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 36px;
    }
    h1 { font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; }
    p  { font-size: 15px; color: #666; line-height: 1.5; margin-bottom: 28px; }
    .btn {
      display: block;
      width: 100%;
      padding: 15px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      margin-bottom: 12px;
      transition: opacity 0.15s;
    }
    .btn:active { opacity: 0.8; }
    .btn-primary { background: #ff6b35; color: #fff; }
    .btn-secondary {
      background: #f0ebe6;
      color: #1a1a1a;
    }
    .code-badge {
      display: inline-block;
      background: #fff5f0;
      border: 1.5px solid #ff6b35;
      border-radius: 8px;
      padding: 4px 12px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #ff6b35;
      margin-bottom: 8px;
      font-family: "SF Mono", "Fira Code", monospace;
    }
    .stores { display: flex; gap: 10px; margin-top: 4px; }
    .stores .btn { margin-bottom: 0; flex: 1; font-size: 14px; }
    .already { margin-top: 20px; font-size: 13px; color: #999; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🥗</div>
    <h1>You're invited to Calora!</h1>
    ${code ? `<div class="code-badge">${code}</div>` : ""}
    <p>A friend invited you to track nutrition effortlessly with AI. Get a free week of Calora Pro when you sign up using their invite link.</p>

    <a class="btn btn-primary" href="${deepLink}" id="openApp">Open in Calora</a>

    <p style="font-size:13px;color:#999;margin-bottom:12px;">Don't have the app yet? Download it free:</p>
    <div class="stores">
      <a class="btn btn-secondary" href="${appStoreUrl}">📱 App Store</a>
      <a class="btn btn-secondary" href="${playStoreUrl}">▶ Google Play</a>
    </div>

    <p class="already">Already have the app? Tap <strong>Open in Calora</strong> above.</p>
  </div>

  <script>
    // Deep-link attempt is ONLY triggered by explicit user interaction.
    // We never auto-redirect on page load so that social-preview crawlers
    // (WhatsApp, Telegram, LinkedIn, etc.) that run on mobile user-agent
    // strings receive the full HTML card instead of a broken custom-scheme
    // redirect.
    (function () {
      var code = ${JSON.stringify(code)};
      if (!code) return;

      var btn = document.getElementById("openApp");
      if (!btn) return;

      btn.addEventListener("click", function (e) {
        // Only attempt the custom scheme on real mobile browsers.
        // navigator.maxTouchPoints > 0 is a reliable signal for touch-capable
        // hardware that crawlers typically lack even when spoofing a mobile UA.
        var ua = navigator.userAgent || "";
        var isMobileUA = /iPhone|iPad|iPod|Android/i.test(ua);
        var hasTouchPoints = navigator.maxTouchPoints > 0;
        if (isMobileUA && hasTouchPoints) {
          // Let the href do the navigation; no need to preventDefault.
          // The href is already set to the caloraapp:// deep link.
          return;
        }
        // On desktop (or a crawler with a mobile UA but no touch), prevent
        // the custom-scheme navigation and do nothing — the store links below
        // serve as the manual fallback.
        e.preventDefault();
      });
    })();
  </script>
</body>
</html>`);
}

// /invite (no code) — same page, no badge, no deep-link attempt
router.get("/invite", (req: Request, res: Response) => {
  renderInvitePage("", req, res);
});

// /invite/:code — fallback landing page for users without the app
router.get("/invite/:code", (req: Request, res: Response) => {
  const rawCode = req.params["code"];
  const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode ?? "").replace(
    /[^A-Za-z0-9]/g,
    "",
  );
  renderInvitePage(code, req, res);
});

export default router;
