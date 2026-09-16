/**
 * Public Calora pages required by app stores and customers.
 *
 * These pages intentionally live at the API origin so the legal and support
 * links remain reachable even though the mobile app is an Expo artifact.
 * Keep the copy aligned with the actual product and review it before changing
 * the effective date or data-use statements.
 */
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();
const ORIGIN = (process.env["PUBLIC_WEB_ORIGIN"] ?? "https://calorie-coach-pie35449.replit.app").replace(/\/+$/, "");
const PUBLIC_PREFIX = "/api/legal";
const SUPPORT_EMAIL = "support@mycaloraapp.com";
const EFFECTIVE_DATE = "August 27, 2026";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  } as Record<string, string>)[character] ?? character);

const link = (path: string, label: string): string =>
  `<a href="${ORIGIN}${PUBLIC_PREFIX}${path}">${label}</a>`;

const layout = (title: string, description: string, body: string): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${ORIGIN}${PUBLIC_PREFIX}${pathForTitle(title)}">
  <title>${escapeHtml(title)} · CaloraApp</title>
  <style>
    :root { color-scheme: light; --ink:#20251f; --muted:#667064; --line:#dce5d9; --paper:#fbfcf8; --card:#fff; --green:#2e6b4f; --green-dark:#214d39; --cream:#eef5e9; }
    * { box-sizing:border-box; } body { margin:0; background:var(--paper); color:var(--ink); font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; line-height:1.65; }
    header { border-bottom:1px solid var(--line); background:var(--card); } .nav { max-width:960px; margin:auto; padding:22px 24px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
    .brand { color:var(--green-dark); font-weight:800; text-decoration:none; letter-spacing:-.02em; font-size:1.15rem; } nav { display:flex; flex-wrap:wrap; gap:14px; justify-content:flex-end; } nav a { color:var(--muted); font-size:.9rem; text-decoration:none; } nav a:hover, a:hover { color:var(--green-dark); text-decoration:underline; }
    main { max-width:820px; margin:0 auto; padding:58px 24px 76px; } .eyebrow { color:var(--green); font-size:.78rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
    h1 { font-size:clamp(2rem,5vw,3.2rem); line-height:1.1; letter-spacing:-.045em; margin:10px 0 14px; color:var(--green-dark); } h2 { margin:36px 0 10px; font-size:1.35rem; line-height:1.25; color:var(--green-dark); } h3 { margin:24px 0 6px; font-size:1.05rem; }
    p, li { font-size:1rem; } .lede { color:var(--muted); font-size:1.12rem; max-width:680px; } .meta { color:var(--muted); font-size:.9rem; margin:0 0 32px; } .card { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:24px; margin:24px 0; } .notice { background:var(--cream); border-left:4px solid var(--green); padding:16px 20px; margin:24px 0; }
    a { color:var(--green); } code { background:var(--cream); padding:2px 5px; border-radius:4px; } footer { max-width:820px; padding:0 24px 38px; margin:auto; color:var(--muted); font-size:.88rem; } footer a { margin-right:14px; }
    @media (max-width:600px) { .nav { align-items:flex-start; flex-direction:column; } nav { justify-content:flex-start; } main { padding-top:38px; } }
  </style>
</head>
<body>
  <header><div class="nav"><a class="brand" href="${ORIGIN}${PUBLIC_PREFIX}/">CaloraApp</a><nav>
    ${link("/privacy", "Privacy")} ${link("/terms", "Terms")} ${link("/subscriptions", "Subscriptions")} ${link("/support", "Support")}
  </nav></div></header>
  <main>${body}</main>
  <footer>© 2026 Etiendem Technologies · ${link("/contact", "Contact")} ${link("/delete-account", "Delete account")} ${link("/help", "Help")}</footer>
</body>
</html>`;

function pathForTitle(title: string): string {
  if (title === "Privacy Policy") return "/privacy";
  if (title === "Terms of Use") return "/terms";
  if (title === "Subscription Information") return "/subscriptions";
  if (title === "Account Deletion") return "/delete-account";
  if (title === "Help & Support") return "/support";
  return "/";
}

function sendPage(title: string, description: string, body: string, res: Response): void {
  res.status(200)
    .set("Content-Type", "text/html; charset=utf-8")
    .set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
    .set("X-Robots-Tag", "index, follow")
    .send(layout(title, description, body));
}

const contactCard = (topic: string): string => `
  <div class="card">
    <h2>Contact Calora support</h2>
    <p>For ${topic}, email our monitored support team. Please do not include passwords, access tokens, or unnecessary health information.</p>
    <p><a href="mailto:${SUPPORT_EMAIL}?subject=Calora%20${encodeURIComponent(topic)}%20request"><strong>${SUPPORT_EMAIL}</strong></a></p>
    <p class="meta">We aim to reply within two business days. For account deletion, include the email address used for your Calora account so we can verify the request.</p>
  </div>`;

router.get("/", (_req: Request, res: Response) => sendPage("CaloraApp", "CaloraApp helps you track meals, understand nutrition, and build sustainable habits.", `
  <div class="eyebrow">Eat smarter. Live better.</div>
  <h1>Nutrition support for real life.</h1>
  <p class="lede">CaloraApp helps you log meals, understand nutrition, plan ahead, and notice the habits shaping your progress.</p>
  <div class="card"><h2>What CaloraApp does</h2><p>Scan a meal photo, read a barcode, or describe what you ate. Review the estimate before saving it to your diary, then use your diary, recipes, planner, progress, and Coach tools to make informed wellness choices.</p></div>
  <div class="notice"><strong>Important:</strong> CaloraApp provides estimates and general wellness information, not medical advice. Speak with a qualified health professional about medical or nutrition concerns.</div>
  <h2>Need help?</h2><p>Visit ${link("/support", "Help & Support")} or email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
` , res));

router.get("/privacy", (_req: Request, res: Response) => sendPage("Privacy Policy", "How CaloraApp collects, uses, stores, and deletes information.", `
  <div class="eyebrow">Your information</div><h1>Privacy Policy</h1><p class="meta">Effective ${EFFECTIVE_DATE} · Published by Etiendem Technologies</p>
  <p>This Privacy Policy explains how Etiendem Technologies ("CaloraApp", "we", "us") handles information when you use the CaloraApp mobile application and related services.</p>
  <h2>Information you provide</h2><p>Depending on the features you use, CaloraApp may receive your email address and display name when you create an account; profile details such as age, height, weight, goal, activity level, and diet preference; diary entries, saved meals, recipes, planner preferences, weight, water, mood, and wellness entries; and messages, photos, food descriptions, or barcodes that you actively submit for analysis.</p>
  <h2>How we use information</h2><ul><li>To provide account access, authenticated sync, account deletion, and referral features.</li><li>To calculate and display nutrition and wellness summaries and to personalize planning and Coach responses.</li><li>To process food, nutrition-label, and Coach requests that you submit.</li><li>To provide subscriptions, restore purchases, and maintain customer support.</li><li>To protect the service, prevent abuse, and meet legal obligations.</li></ul>
  <h2>On-device storage and sync</h2><p>Your diary and wellness data are designed to be stored locally on your device. If you sign in and use sync, selected data is transmitted to and stored by our application backend so it can be associated with your account. You can delete your account through the app; see ${link("/delete-account", "Account Deletion")} for details.</p>
  <h2>Service providers</h2><p>We use Supabase for authentication, RevenueCat and the relevant app store for subscription processing, OpenAI through Replit's managed AI integration for submitted food and Coach analysis, and public food and recipe data providers for lookups. Providers process only the information needed for the requested feature under their own terms and privacy policies. We do not sell your personal information.</p>
  <h2>Photos and AI requests</h2><p>Photos, food descriptions, labels, and Coach messages are sent only when you request the corresponding feature. They are used to return the requested result and are not intentionally retained by CaloraApp after processing, except where needed for security, troubleshooting, or legal compliance. Do not submit sensitive information that is not needed for your request.</p>
  <h2>Retention and security</h2><p>We retain account and synced records while needed to provide the service, comply with law, resolve disputes, or enforce agreements. We use access controls, encrypted transport, and provider security controls, but no service can guarantee absolute security.</p>
  <h2>Your choices</h2><p>You may review or remove local data in the app, stop using optional AI features, manage subscriptions through the store, and request account deletion. To ask a privacy question, contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  <h2>Children</h2><p>CaloraApp is not directed to children under 13, and we do not knowingly collect personal information from children under 13.</p>
  <h2>Policy changes</h2><p>We may update this policy as the service changes. We will update the effective date and publish the revised policy at this URL.</p>
  ${contactCard("privacy")}
`, res));

router.get("/terms", (_req: Request, res: Response) => sendPage("Terms of Use", "Terms governing use of the CaloraApp nutrition and wellness service.", `
  <div class="eyebrow">Using CaloraApp</div><h1>Terms of Use</h1><p class="meta">Effective ${EFFECTIVE_DATE} · Published by Etiendem Technologies</p>
  <p>These Terms govern your use of CaloraApp, provided by Etiendem Technologies. By creating an account or using the service, you agree to these Terms and our ${link("/privacy", "Privacy Policy")}.</p>
  <h2>Wellness information only</h2><p>Nutrition values, AI analysis, photo estimates, recommendations, and other information provided by CaloraApp are estimates for general informational and wellness purposes. They are not medical advice, diagnosis, treatment, or a substitute for a doctor, registered dietitian, or other qualified professional. Do not use CaloraApp for emergencies or to make decisions that require professional care.</p>
  <h2>Your account</h2><p>You are responsible for keeping your sign-in credentials secure and for activity under your account. Provide accurate information and tell us promptly if you believe your account has been used without permission.</p>
  <h2>Acceptable use</h2><p>Do not misuse, reverse engineer, disrupt, probe, scrape, or attempt unauthorized access to CaloraApp or its providers. Do not upload unlawful, abusive, malicious, or infringing content, or use the service to provide medical care to another person.</p>
  <h2>AI and third-party data</h2><p>AI results and food-database results can be incomplete or inaccurate. Review every result before relying on it or saving it. CaloraApp may link to or use third-party services; their availability and terms are outside our control.</p>
  <h2>Subscriptions</h2><p>Paid features are governed by ${link("/subscriptions", "Subscription Information")}. Purchases, renewals, refunds, and cancellations are handled by the store through which you subscribed.</p>
  <h2>Availability and changes</h2><p>We may change, suspend, or discontinue features, including provider-backed features, when necessary. We do not guarantee uninterrupted availability or that every estimate will be accurate or suitable for your goals.</p>
  <h2>Contact</h2><p>Questions about these Terms can be sent to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  ${contactCard("legal")}
`, res));

router.get("/subscriptions", (_req: Request, res: Response) => sendPage("Subscription Information", "CaloraApp Pro pricing, trials, renewals, and cancellation information.", `
  <div class="eyebrow">CaloraApp Pro</div><h1>Subscription Information</h1><p class="meta">Updated ${EFFECTIVE_DATE}</p>
  <p>CaloraApp Pro unlocks paid features shown in the app. The applicable store listing and purchase sheet are the final authority for your local price, currency, taxes, eligibility, and terms.</p>
  <div class="card"><h2>Current US reference plans</h2><ul><li><strong>Monthly:</strong> 7-day free trial when eligible, then $4.99/month.</li><li><strong>Annual:</strong> 7-day free trial when eligible, then $35.99/year (a $3.00/month equivalent billed annually).</li></ul><p>After a trial, the selected plan renews at the same plan price unless changed or canceled through the relevant app store. Trial eligibility is determined by the store and may vary.</p></div>
  <h2>How billing works</h2><p>Subscriptions are purchased through Apple App Store or Google Play and charged to the payment method on your store account. CaloraApp does not directly receive or store your full payment card details.</p>
  <h2>Cancel or manage a subscription</h2><p>Manage or cancel on the same store where you subscribed: <a href="https://support.apple.com/en-us/118428">Apple subscription settings</a> or <a href="https://support.google.com/googleplay/answer/7018481">Google Play subscription settings</a>. Canceling prevents the next renewal; access generally continues through the current paid period.</p>
  <h2>Refunds and billing questions</h2><p>Refund decisions are made by Apple or Google under their policies. For a CaloraApp billing issue, include your store, transaction date, and order identifier (but never send payment card details) when contacting <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  ${contactCard("billing")}
`, res));

router.get("/delete-account", (_req: Request, res: Response) => sendPage("Account Deletion", "How to permanently delete a CaloraApp account and associated data.", `
  <div class="eyebrow">Your control</div><h1>Delete your account</h1><p class="meta">Updated ${EFFECTIVE_DATE}</p>
  <p>CaloraApp provides permanent account deletion for signed-in users. Deletion removes your Calora account data and requests removal of associated authentication and subscription records. This action cannot be undone.</p>
  <h2>Delete from the app</h2><ol><li>Open CaloraApp and sign in.</li><li>Open Profile or Settings and choose the account and privacy controls.</li><li>Choose <strong>Delete account</strong> and confirm the warning.</li></ol>
  <h2>What happens next</h2><p>The authenticated deletion flow verifies your session, fences new writes, removes application data, requests removal of the RevenueCat subscriber record, and removes the authentication user. If a provider is temporarily unavailable, the deletion is retried safely rather than silently treated as complete. Local-only data must also be cleared from the device.</p>
  <h2>Can’t access the app?</h2><p>Email <a href="mailto:${SUPPORT_EMAIL}?subject=Calora%20account%20deletion%20request">${SUPPORT_EMAIL}</a> from the address on your account. We will verify ownership before processing the request. Do not send your password or access token.</p>
  <div class="notice"><strong>Subscriptions:</strong> deleting your Calora account does not replace canceling a store subscription. Cancel subscriptions separately in ${link("/subscriptions", "Subscription Information")} to prevent renewal.</div>
`, res));

router.get("/support", (_req: Request, res: Response) => sendPage("Help & Support", "Contact CaloraApp support for product, privacy, billing, or account-deletion help.", `
  <div class="eyebrow">We’re here to help</div><h1>Help & Support</h1><p class="lede">Tell us what happened and include the smallest amount of information needed to investigate. Never send a password, access token, or full payment-card number.</p>
  <div class="card"><h2>Contact the team</h2><p>Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. Choose a subject such as <em>Support</em>, <em>Privacy</em>, <em>Billing</em>, or <em>Account deletion</em>.</p><p class="meta">We aim to reply within two business days.</p></div>
  <h2>Useful information to include</h2><ul><li>What you were trying to do and what happened.</li><li>Your device type and app version, if relevant.</li><li>A transaction/order identifier for billing questions, with payment details removed.</li><li>The email on your account only when we need to locate or delete it.</li></ul>
  <h2>Quick links</h2><p>${link("/privacy", "Privacy Policy")} · ${link("/terms", "Terms of Use")} · ${link("/subscriptions", "Subscription Information")} · ${link("/delete-account", "Account Deletion")}</p>
`, res));

router.get("/contact", (_req: Request, res: Response) => res.redirect(308, "support"));
router.get("/help", (_req: Request, res: Response) => res.redirect(308, "support"));

export default router;