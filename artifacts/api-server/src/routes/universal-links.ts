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

// ── /invite/:code — fallback landing page for users without the app ──────────
router.get("/invite/:code", (req: Request, res: Response) => {
  const rawCode = req.params["code"];
  const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode ?? "").replace(
    /[^A-Za-z0-9]/g,
    "",
  );
  const appStoreId = process.env["APPLE_APP_STORE_ID"] ?? "";
  const appStoreUrl = appStoreId
    ? `https://apps.apple.com/app/id${appStoreId}`
    : "https://apps.apple.com/search?term=calora";
  const playStoreUrl = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;
  const deepLink = `caloraapp://invite/${code}`;

  res
    .status(200)
    .set("Content-Type", "text/html; charset=utf-8")
    .set("Cache-Control", "no-store")
    .send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>You're invited to Calora!</title>
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
    // Attempt the deep link; if the app is installed the OS will hand off.
    // After a short delay, do nothing (the store links are manual fallbacks).
    (function () {
      var code = ${JSON.stringify(code)};
      if (!code) return;
      // Only auto-attempt on mobile where the app might actually be installed.
      var ua = navigator.userAgent || "";
      if (/iPhone|iPad|iPod|Android/i.test(ua)) {
        setTimeout(function () {
          window.location.href = "caloraapp://invite/" + code;
        }, 300);
      }
    })();
  </script>
</body>
</html>`);
});

export default router;
