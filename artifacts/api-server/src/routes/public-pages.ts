/**
 * Canonical public Calora website and legal pages.
 *
 * This router owns mycaloraapp.com only. The authenticated application remains
 * on app.mycaloraapp.com and is intentionally not changed here.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { Resvg } from "@resvg/resvg-js";

const router: IRouter = Router();
const ORIGIN = (
  process.env["PUBLIC_WEB_ORIGIN"] ?? "https://mycaloraapp.com"
).replace(/\/+$/, "");
const APP_ORIGIN = "https://app.mycaloraapp.com";
const SUPPORT_EMAIL = "support@mycaloraapp.com";
const EFFECTIVE_DATE = "August 27, 2026";
const SUBSCRIPTION_UPDATED_DATE = "September 24, 2026";

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      (
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }) as Record<string, string>
      )[character] ?? character,
  );

const link = (path: string, label: string, className = ""): string =>
  `<a class="${className}" href="${ORIGIN}${path}">${label}</a>`;
const external = (url: string, label: string): string =>
  `<a href="${url}" rel="noopener noreferrer">${label}</a>`;

const featureIcon = (
  kind: "scan" | "diary" | "plan" | "coach" | "progress" | "water",
): string => {
  const paths: Record<string, string> = {
    scan: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M7 4v3M4 7h3M17 4v3M17 17h3M4 17h3M17 7h3"/>',
    diary:
      '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"/><path d="M8 8h7M8 12h7M8 16h4"/>',
    plan: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3M14 14h2M8 17h3"/>',
    coach: '<path d="M5 5h14v10H9l-4 4V5Z"/><path d="M8 9h8M8 12h5"/>',
    progress: '<path d="M4 19V5M10 19V9M16 19V3M22 19V7"/><path d="M3 19h20"/>',
    water:
      '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/><path d="M9 15c.5 1.3 1.5 2 3 2"/>',
  };
  return `<svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`;
};

const layout = (
  title: string,
  description: string,
  body: string,
  path = "/",
  active = "",
): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${ORIGIN}${path}">
  <meta property="og:type" content="website"><meta property="og:site_name" content="Calora"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${ORIGIN}${path}"><meta property="og:image" content="${ORIGIN}/assets/social/calora-social-card.png"><meta property="og:image:alt" content="Calora nutrition and meal planning app"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${ORIGIN}/assets/social/calora-social-card.png">
  <link rel="manifest" href="${ORIGIN}/site.webmanifest"><title>${escapeHtml(title)} · Calora</title>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${ORIGIN}/#organization`,
        name: "Etiendem Technologies",
        url: `${ORIGIN}/`,
        email: SUPPORT_EMAIL,
      },
      {
        "@type": "MobileApplication",
        "@id": `${ORIGIN}/#application`,
        name: "Calora",
        applicationCategory: "HealthApplication",
        operatingSystem: "iOS, Android",
        description:
          "Calora helps users log meals, understand nutrition, plan meals, and observe progress.",
        publisher: { "@id": `${ORIGIN}/#organization` },
        url: `${ORIGIN}/`,
      },
      {
        "@type": "WebSite",
        "@id": `${ORIGIN}/#website`,
        name: "Calora",
        url: `${ORIGIN}/`,
        publisher: { "@id": `${ORIGIN}/#organization` },
      },
    ],
  })}</script>
  <style>
    :root{color-scheme:light;--ink:#17231f;--muted:#68756f;--line:#dce7df;--paper:#f7faf6;--card:#fff;--forest:#123f32;--green:#287553;--mint:#cfe9dc;--coral:#ff765c;--soft:#edf6f0;--gold:#e8b85d}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6}a{color:var(--green);text-underline-offset:3px}a:hover{color:var(--forest)}.site-header{position:sticky;top:0;z-index:5;background:rgba(247,250,246,.92);backdrop-filter:blur(14px);border-bottom:1px solid rgba(220,231,223,.85)}.nav{max-width:1180px;margin:auto;padding:16px 28px;display:flex;align-items:center;justify-content:space-between;gap:24px}.brand{display:flex;align-items:center;gap:10px;color:var(--forest);font-weight:850;text-decoration:none;letter-spacing:-.035em;font-size:1.28rem}.brand-mark{width:31px;height:31px;border-radius:10px;background:var(--coral);display:grid;place-items:center;color:white;font-size:18px;font-weight:900}.nav-links{display:flex;align-items:center;gap:22px}.nav-links a{color:var(--muted);font-size:.92rem;text-decoration:none}.nav-links .nav-cta{color:#fff;background:var(--forest);padding:10px 16px;border-radius:999px;font-weight:750}.nav-toggle{display:none}.page{max-width:1180px;margin:auto;padding:0 28px}.hero{min-height:650px;display:grid;grid-template-columns:1.03fr .97fr;align-items:center;gap:72px;padding:78px 0 88px}.eyebrow{display:inline-flex;align-items:center;gap:8px;color:var(--green);font-size:.75rem;font-weight:850;letter-spacing:.14em;text-transform:uppercase}.eyebrow:before{content:"";width:23px;height:2px;background:var(--coral)}h1,h2,h3{font-family:Georgia,"Times New Roman",serif;color:var(--forest);letter-spacing:-.045em;line-height:1.08;margin:0}h1{font-size:clamp(3.1rem,7vw,6.2rem);max-width:680px;margin:17px 0 22px}h2{font-size:clamp(2.1rem,4vw,3.65rem);margin-bottom:18px}h3{font-size:1.45rem;margin-bottom:10px}p{margin:0 0 16px}.lede{font-size:1.22rem;color:var(--muted);max-width:610px}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 20px;border-radius:999px;background:var(--forest);color:#fff;font-weight:800;text-decoration:none;border:1px solid var(--forest)}.button:hover{color:#fff;background:#1b5b46}.button.secondary{background:transparent;color:var(--forest);border-color:var(--line)}.button.coral{background:var(--coral);border-color:var(--coral);color:#291b17}.hero-note{color:var(--muted);font-size:.88rem;margin-top:18px}.hero-visual{position:relative;min-height:500px;border-radius:40px;background:linear-gradient(145deg,#d9eee2,#afd5c1);overflow:hidden;display:grid;place-items:center}.hero-visual:before,.hero-visual:after{content:"";position:absolute;border-radius:50%;background:rgba(255,255,255,.3)}.hero-visual:before{width:310px;height:310px;right:-80px;top:-75px}.hero-visual:after{width:210px;height:210px;left:-55px;bottom:-55px}.phone{position:relative;z-index:1;width:min(282px,64%);padding:11px;border-radius:34px;background:#102e26;box-shadow:0 24px 55px rgba(18,63,50,.25);transform:rotate(4deg)}.phone-screen{border-radius:25px;background:#f7faf6;min-height:480px;padding:22px 16px;color:var(--forest)}.phone-top{font-size:.7rem;color:var(--muted);display:flex;justify-content:space-between}.phone h3{font-family:Inter,sans-serif;font-size:1.45rem;margin:18px 0}.demo-label{display:inline-block;color:var(--muted);font-size:.64rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.metric{background:#d9eee2;border-radius:18px;padding:15px;margin:10px 0}.metric strong{display:block;font-size:1.8rem;letter-spacing:-.07em}.metric span{color:var(--muted);font-size:.72rem}.mini-row{display:flex;gap:8px}.mini-row .metric{flex:1}.phone-button{height:42px;border-radius:999px;background:var(--coral);margin-top:16px;display:grid;place-items:center;font-weight:800}.strip{background:var(--forest);color:#fff}.strip-inner{max-width:1180px;margin:auto;padding:20px 28px;display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}.strip strong{font-size:1.05rem}.section{padding:96px 0}.section-head{display:flex;justify-content:space-between;align-items:end;gap:30px;margin-bottom:42px}.section-head p{max-width:470px;color:var(--muted)}.feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.feature{background:var(--card);border:1px solid var(--line);border-radius:24px;padding:27px;min-height:220px;box-shadow:0 12px 28px rgba(18,63,50,.035)}.feature-icon{width:35px;height:35px;color:var(--coral);margin-bottom:24px}.feature p{color:var(--muted);font-size:.96rem}.split{display:grid;grid-template-columns:.85fr 1.15fr;gap:76px;align-items:center}.split-copy p{color:var(--muted);font-size:1.08rem}.list{display:grid;gap:14px}.list-item{display:flex;gap:15px;align-items:flex-start;padding:17px 0;border-bottom:1px solid var(--line)}.list-item:last-child{border-bottom:0}.number{width:31px;height:31px;border-radius:50%;background:var(--mint);display:grid;place-items:center;color:var(--forest);font-weight:850;flex:0 0 auto}.dashboard-card{background:var(--forest);border-radius:30px;padding:30px;color:#fff;box-shadow:0 22px 50px rgba(18,63,50,.16)}.dashboard-card h3{color:#fff;font-family:Inter,sans-serif;font-size:1.2rem}.dashboard-card p{color:#cbe4d8}.bars{display:flex;align-items:end;gap:12px;height:180px;margin-top:24px}.bar{flex:1;background:var(--coral);border-radius:12px 12px 4px 4px;min-height:35px}.bar:nth-child(2n){background:#8cd0ac}.bar:nth-child(3n){background:#f0c66c}.bar-labels{display:flex;justify-content:space-between;color:#b4d2c5;font-size:.72rem;margin-top:9px}.quote{background:var(--soft);border-radius:28px;padding:34px;font-family:Georgia,serif;font-size:1.7rem;color:var(--forest)}.quote small{display:block;font-family:Inter,sans-serif;font-size:.85rem;color:var(--muted);margin-top:18px}.faq-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.faq{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px}.faq h3{font-family:Inter,sans-serif;font-size:1rem;letter-spacing:-.02em}.faq p{color:var(--muted);font-size:.93rem}.cta{background:var(--coral);border-radius:32px;padding:52px 58px;display:flex;align-items:center;justify-content:space-between;gap:35px}.cta h2{color:#281b17;max-width:650px}.cta p{color:#51332b;max-width:520px}.footer{background:#0d2c24;color:#c1d8cd;padding:48px 0 28px}.footer-inner{max-width:1180px;margin:auto;padding:0 28px;display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:35px}.footer .brand{color:#fff}.footer p{font-size:.9rem;color:#9ebbae;max-width:320px}.footer h3{font-family:Inter,sans-serif;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:#fff}.footer a{display:block;color:#b5d0c2;text-decoration:none;margin:8px 0;font-size:.9rem}.copyright{max-width:1180px;margin:36px auto 0;padding:20px 28px 0;border-top:1px solid rgba(193,216,205,.2);font-size:.82rem;color:#91ad9e}.legal{max-width:900px;padding-top:72px;padding-bottom:100px}.legal h1{font-size:clamp(2.8rem,6vw,5rem)}.legal h2{font-family:Inter,sans-serif;font-size:1.35rem;letter-spacing:-.025em;margin-top:40px}.legal .lede{margin-bottom:30px}.meta{color:var(--muted);font-size:.88rem}.card{background:#fff;border:1px solid var(--line);border-radius:22px;padding:25px;margin:25px 0}.notice{background:var(--soft);border-left:4px solid var(--green);padding:17px 20px;border-radius:0 14px 14px 0;margin:25px 0}.legal li{margin:8px 0}.legal ol,.legal ul{padding-left:24px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:820px){.nav{padding:14px 18px}.nav-links{gap:12px}.page{padding:0 18px}.hero{grid-template-columns:1fr;gap:35px;padding:60px 0}.hero-visual{min-height:440px}.feature-grid{grid-template-columns:1fr 1fr}.split{grid-template-columns:1fr;gap:35px}.section{padding:70px 0}.footer-inner{grid-template-columns:1.5fr 1fr 1fr}}@media(max-width:560px){.nav{align-items:flex-start}.nav-links{display:none;flex-wrap:wrap}.nav-links.open{display:flex}.nav-toggle{display:block;border:1px solid var(--line);background:#fff;color:var(--forest);border-radius:10px;padding:8px 10px;font-weight:800}.nav{position:relative}.nav-toggle{position:absolute;right:18px;top:12px}.nav-links{padding-top:10px}.nav-links .nav-cta{padding:8px 12px}.hero{padding-top:48px}h1{font-size:3.25rem}.feature-grid,.faq-grid{grid-template-columns:1fr}.section-head{display:block}.cta{display:block;padding:34px 25px}.cta .button{margin-top:5px}.footer-inner{grid-template-columns:1fr 1fr}.footer-inner>div:first-child{grid-column:1/-1}.legal{padding-top:48px}.phone{width:70%}}
  </style>
</head>
<body>
<header class="site-header"><div class="nav"><a class="brand" href="${ORIGIN}/"><span class="brand-mark" aria-hidden="true">◒</span>Calora</a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav" onclick="const n=document.getElementById('main-nav');const open=n.classList.toggle('open');this.setAttribute('aria-expanded',String(open))">Menu</button><nav id="main-nav" class="nav-links" aria-label="Main navigation">${link("/", "Product", active === "product" ? "active" : "")}${link("/subscriptions", "Pricing", active === "pricing" ? "active" : "")}${link("/support", "Support", active === "support" ? "active" : "")}${link("/privacy", "Privacy", active === "privacy" ? "active" : "")}<a class="nav-cta" href="${APP_ORIGIN}/auth/sign-in">Open Calora</a></nav></div></header>
${body}
<footer class="footer"><div class="footer-inner"><div><a class="brand" href="${ORIGIN}/"><span class="brand-mark" aria-hidden="true">◒</span>Calora</a><p>Nutrition support for real life. Log honestly, understand your patterns, and make your next choice a little clearer.</p></div><div><h3>Explore</h3>${link("/", "How it works")}${link("/subscriptions", "Calora Pro")}${link("/support", "Help & Support")}</div><div><h3>Trust</h3>${link("/privacy", "Privacy Policy")}${link("/terms", "Terms of Use")}${link("/delete-account", "Delete account")}</div><div><h3>Contact</h3>${link("/contact", "Contact Calora")}<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></div></div><div class="copyright">© 2026 Etiendem Technologies · Calora is intended for people 18 and older and provides general wellness information and nutrition estimates, not medical advice.</div></footer>
</body></html>`;

function sendPage(
  title: string,
  description: string,
  body: string,
  res: Response,
  path = "/",
  active = "",
): void {
  res
    .status(200)
    .set("Content-Type", "text/html; charset=utf-8")
    .set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
    .set("X-Robots-Tag", "index, follow")
    .send(layout(title, description, body, path, active));
}

const contactCard = (topic: string): string =>
  `<div class="card"><h2>Contact Calora support</h2><p>For ${topic}, email our monitored support team. Please do not include passwords, access tokens, or unnecessary health information.</p><p><a href="mailto:${SUPPORT_EMAIL}?subject=Calora%20${encodeURIComponent(topic)}%20request"><strong>${SUPPORT_EMAIL}</strong></a></p><p class="meta">We aim to reply within two business days.</p></div>`;

router.get("/", (_req: Request, res: Response) =>
  sendPage(
    "Calora — AI Nutrition & Calorie Tracker",
    "A calmer way to log meals, understand nutrition, plan ahead, and see the patterns shaping your progress.",
    `
<main><div class="page"><section class="hero"><div><span class="eyebrow">Eat smarter. Live better.</span><h1>Make sense of your everyday nutrition.</h1><p class="lede">Calora brings meal logging, nutrition context, planning, and progress into one calm place—so you can focus on the next useful choice, not perfect tracking.</p><div class="actions"><a class="button coral" href="#how-it-works">See how it works</a>${link("/subscriptions", "View Calora Pro", "button secondary")}</div><p class="hero-note">General wellness support. Nutrition values and AI results are estimates.</p></div><div class="hero-visual" aria-label="Illustrative preview of the Calora dashboard, not live user data"><div class="phone"><div class="phone-screen"><div class="phone-top"><span>Calora</span><span>Today</span></div><span class="demo-label">Illustrative app view · example data</span><h3>A little more clarity.</h3><div class="metric"><strong>1,240</strong><span>calories logged today</span></div><div class="mini-row"><div class="metric"><strong>6,420</strong><span>steps</span></div><div class="metric"><strong>5</strong><span>meals planned</span></div></div><div class="phone-button">Log a meal</div></div></div></div></section><div class="strip"><div class="strip-inner"><strong>One home for the habits that matter.</strong><span>Meals · water · movement · plans · progress</span></div></div><section id="how-it-works" class="section"><div class="section-head"><div><span class="eyebrow">A clearer rhythm</span><h2>Tools that meet you where you are.</h2></div><p>Use one feature or the whole flow. Calora keeps review and choice with you before anything is added to your diary.</p></div><div class="feature-grid"><article class="feature">${featureIcon("scan")}<h3>Log in the way that fits</h3><p>Scan a food photo, barcode, label, receipt, or describe your meal. Review the result before saving it.</p></article><article class="feature">${featureIcon("diary")}<h3>See the day at a glance</h3><p>Keep meals, calories, protein, carbohydrates, fat, hydration, and movement together in Today.</p></article><article class="feature">${featureIcon("plan")}<h3>Plan without pressure</h3><p>Build a week that feels practical, keep shopping in view, and adjust as real life changes.</p></article><article class="feature">${featureIcon("coach")}<h3>Ask Coach</h3><p>Use Coach as a general wellness assistant. It can help you think through nutrition questions, but it can be wrong.</p></article><article class="feature">${featureIcon("progress")}<h3>Notice your patterns</h3><p>Progress brings trends for food, water, movement, and weight so you can look back with context.</p></article><article class="feature">${featureIcon("water")}<h3>Keep the basics visible</h3><p>Small signals like water and steps stay easy to find, without turning every day into a scorecard.</p></article></div></section><section class="section split"><div class="split-copy"><span class="eyebrow">From capture to clarity</span><h2>Review first. Then decide.</h2><p>Calora is designed around a simple boundary: a scan or AI estimate is a starting point, not a fact. Check the result, adjust it when needed, and only then add it to your diary.</p><div class="list"><div class="list-item"><span class="number">1</span><div><strong>Capture</strong><br><span class="meta">Use the camera, library, barcode, label, voice, or text.</span></div></div><div class="list-item"><span class="number">2</span><div><strong>Understand</strong><br><span class="meta">See the estimate and its nutrition context in plain language.</span></div></div><div class="list-item"><span class="number">3</span><div><strong>Choose</strong><br><span class="meta">Approve, edit, retry, or leave it out of your diary.</span></div></div></div></div><div class="dashboard-card"><h3>Your progress, with context</h3><p>Patterns are more useful than a single number. Look across a week and make tomorrow easier.</p><div class="bars"><div class="bar" style="height:48%"></div><div class="bar" style="height:67%"></div><div class="bar" style="height:42%"></div><div class="bar" style="height:78%"></div><div class="bar" style="height:60%"></div><div class="bar" style="height:88%"></div><div class="bar" style="height:72%"></div></div><div class="bar-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></section><section class="section"><div class="quote">“The goal is not a perfect record. It is a more useful relationship with the choices you make.”<small>Calora’s approach to everyday wellness</small></div></section><section class="section"><div class="section-head"><div><span class="eyebrow">Questions, answered</span><h2>What Calora is—and isn’t.</h2></div></div><div class="faq-grid"><article class="faq"><h3>Is Calora a medical app?</h3><p>No. It is a general wellness and nutrition tool. It does not diagnose, treat, or replace qualified medical care.</p></article><article class="faq"><h3>How does AI fit in?</h3><p>AI may support Coach and applicable food or recipe analysis. AI-generated information can contain errors; review it before relying on it.</p></article><article class="faq"><h3>Does a scan automatically log food?</h3><p>No. Scan results are presented for your review. Nothing reaches your diary until you approve it.</p></article><article class="faq"><h3>Can I delete my account?</h3><p>Yes. Signed-in users can start deletion in the app, or contact support if they cannot access it. ${link("/delete-account", "Read the deletion steps")}.</p></article></div></section><section class="section"><div class="cta"><div><h2>Start with one honest meal.</h2><p>Calora is built for the everyday moments that make up a bigger picture.</p></div><a class="button" href="${APP_ORIGIN}/auth/sign-up">Open Calora</a></div></section></div></main>`,
    res,
    "/",
    "product",
  ),
);

router.get("/privacy", (_req: Request, res: Response) =>
  sendPage(
    "Calora Privacy Policy",
    "How Calora collects, uses, stores, and deletes information.",
    `<main class="page legal"><span class="eyebrow">Your information</span><h1>Privacy Policy</h1><p class="meta">Effective ${EFFECTIVE_DATE} · Published by Etiendem Technologies</p><p class="lede">We aim to collect what Calora needs to provide the features you choose, explain how those features work, and give you a clear way to delete your account.</p><h2>Information you provide</h2><p>Depending on the features you use, Calora may receive your email address and display name when you create an account; profile details such as age, height, weight, goal, activity level, and diet preference; diary entries, saved meals, recipes, planner preferences, weight, water, mood, and wellness entries; and messages, photos, food descriptions, or barcodes that you actively submit for analysis.</p><h2>How we use information</h2><ul><li>To provide account access, authenticated sync, account deletion, and referral features.</li><li>To calculate and display nutrition and wellness summaries and personalize planning and Coach responses.</li><li>To process food, nutrition-label, and Coach requests that you submit.</li><li>To provide subscriptions, restore purchases, and customer support.</li><li>To protect the service, prevent abuse, and meet legal obligations.</li></ul><h2>On-device storage and sync</h2><p>Your diary and wellness data are designed to be stored locally on your device. If you sign in and use sync, selected data is transmitted to and stored by our application backend so it can be associated with your account. You can delete your account through the app; see ${link("/delete-account", "Account Deletion")} for details.</p><h2>Service providers</h2><p>We use Supabase for authentication, RevenueCat and the relevant app store for subscription processing, OpenAI for submitted food and Coach analysis, and public food and recipe data providers for lookups. Providers process only the information needed for the requested feature under their own terms and privacy policies. We do not sell your personal information.</p><h2>Photos and AI requests</h2><p>Photos, food descriptions, and labels are sent only when you request the corresponding feature and are not intentionally retained by Calora after processing, except where needed for security, troubleshooting, or legal compliance. Signed-in Coach messages are stored in your account-scoped Coach conversation history so you can reopen saved chats; guest Coach chats remain ephemeral. Coach reports retain a short-lived digest and reason, not the reported message text. Do not submit sensitive information that is not needed for your request.</p><h2>Retention and security</h2><p>We retain account and synced records, including signed-in Coach conversation history, while needed to provide the service, comply with law, resolve disputes, or enforce agreements. You can delete individual saved Coach chats, clear Coach history, or request account deletion through the available controls. We use access controls, encrypted transport, and provider security controls, but no service can guarantee absolute security.</p><h2>Your choices</h2><p>You may review or remove local data in the app, stop using optional AI features, manage subscriptions through the store, and request account deletion. To ask a privacy question, contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p><h2>Children and changes</h2><p>Calora is currently offered only to people 18 and older. We do not knowingly provide accounts or collect profile data from people under 18. If you believe an under-18 account was created, contact support so we can review and delete it. We may update this policy as the service changes; the effective date above will be updated when we publish a revision.</p>${contactCard("privacy")}</main>`,
    res,
    "/privacy",
    "privacy",
  ),
);

router.get("/terms", (_req: Request, res: Response) =>
  sendPage(
    "Calora Terms of Use",
    "Terms governing use of the Calora nutrition and wellness service.",
    `<main class="page legal"><span class="eyebrow">Using Calora</span><h1>Terms of Use</h1><p class="meta">Effective ${EFFECTIVE_DATE} · Published by Etiendem Technologies</p><p class="lede">These terms keep the service useful, respectful, and clear about what Calora can and cannot do. Calora is currently offered only to people 18 and older.</p><h2>Wellness information only</h2><p>Nutrition values, AI analysis, photo estimates, recommendations, and other information provided by Calora are estimates for general informational and wellness purposes. They are not medical advice, diagnosis, treatment, or a substitute for a doctor, registered dietitian, or other qualified professional. Do not use Calora for emergencies or decisions that require professional care.</p><h2>Your account</h2><p>You are responsible for keeping your sign-in credentials secure and for activity under your account. Provide accurate information and tell us promptly if you believe your account has been used without permission.</p><h2>Acceptable use</h2><p>Do not misuse, reverse engineer, disrupt, probe, scrape, or attempt unauthorized access to Calora or its providers. Do not upload unlawful, abusive, malicious, or infringing content, or use the service to provide medical care to another person.</p><h2>AI and third-party data</h2><p>AI results and food-database results can be incomplete or inaccurate. Review every result before relying on it or saving it. Calora may link to or use third-party services; their availability and terms are outside our control.</p><h2>Subscriptions and availability</h2><p>Paid features are governed by ${link("/subscriptions", "Subscription Information")}. Purchases, renewals, refunds, and cancellations are handled by the store through which you subscribed. We may change, suspend, or discontinue features, including provider-backed features, when necessary.</p><h2>Food image attribution</h2><p>Product images identified in the app as “Open Food Facts · CC BY-SA” are contributed by <a href="https://openfoodfacts.org">Open Food Facts</a> participants and reused under the Creative Commons Attribution-ShareAlike license.</p><h2>Contact</h2><p>Questions about these Terms can be sent to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>${contactCard("legal")}</main>`,
    res,
    "/terms",
  ),
);

router.get("/subscriptions", (_req: Request, res: Response) =>
  sendPage(
    "Calora Pro Subscription Information",
    "Calora Pro pricing, trials, renewals, and cancellation information.",
    `<main class="page legal"><span class="eyebrow">Calora Pro</span><h1>Subscription Information</h1><p class="meta">Updated ${SUBSCRIPTION_UPDATED_DATE}</p><p class="lede">Calora Pro unlocks paid features shown in the app. The applicable store listing and purchase sheet are the final authority for your local price, currency, taxes, eligibility, and terms.</p><div class="card"><h2>Current US reference plans</h2><ul><li><strong>Monthly:</strong> 7-day free trial when eligible, then $4.99/month.</li><li><strong>Annual:</strong> 7-day free trial when eligible, then $34.99/year (approximately $2.92/month billed annually).</li></ul><p>After a trial, the selected plan renews at the same plan price unless changed or canceled through the relevant app store. Trial eligibility is determined by the store and may vary.</p></div><h2>Billing and renewal</h2><p>Subscriptions are purchased through Apple App Store or Google Play and charged to the payment method on your store account. Calora does not directly receive or store your full payment card details. Renewal occurs unless you cancel through the same store before the renewal period.</p><h2>Cancel or manage</h2><p>Manage or cancel on the same store where you subscribed: ${external("https://support.apple.com/en-us/118428", "Apple subscription settings")} or ${external("https://support.google.com/googleplay/answer/7018481", "Google Play subscription settings")}. Canceling prevents the next renewal; access generally continues through the current paid period.</p><h2>Refunds and account deletion</h2><p>Refund decisions are made by Apple or Google under their policies. Deleting a Calora account does not replace canceling a store subscription. Cancel subscriptions separately to prevent renewal. For a Calora billing issue, include your store, transaction date, and order identifier—never payment card details—when contacting <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>${contactCard("billing")}</main>`,
    res,
    "/subscriptions",
    "pricing",
  ),
);

router.get("/delete-account", (_req: Request, res: Response) =>
  sendPage(
    "Delete Your Calora Account",
    "How to permanently delete a Calora account and associated data.",
    `<main class="page legal"><span class="eyebrow">Your control</span><h1>Delete your account</h1><p class="meta">Updated ${EFFECTIVE_DATE}</p><p class="lede">You can permanently delete a signed-in Calora account. This action cannot be undone.</p><div class="notice"><strong>Important:</strong> account deletion and store subscription cancellation are separate. Cancel an Apple or Google subscription separately to prevent renewal.</div><h2>Delete from the app</h2><ol><li>Open Calora and sign in.</li><li>Open Profile or Settings and choose the account and privacy controls.</li><li>Choose <strong>Delete account</strong> and confirm the warning.</li></ol><h2>What happens next</h2><p>The authenticated deletion flow verifies your session, fences new writes, removes application data, requests removal of the RevenueCat subscriber record, and removes the authentication user. If a provider is temporarily unavailable, the deletion is retried safely rather than silently treated as complete. Local-only data must also be cleared from the device.</p><h2>Can’t access the app?</h2><p>Email <a href="mailto:${SUPPORT_EMAIL}?subject=Calora%20account%20deletion%20request">${SUPPORT_EMAIL}</a> from the address on your account. We will verify ownership before processing the request. Do not send your password or access token.</p></main>`,
    res,
    "/delete-account",
  ),
);

router.get("/support", (_req: Request, res: Response) =>
  sendPage(
    "Calora Help & Support",
    "Contact Calora support for product, privacy, billing, or account-deletion help.",
    `<main class="page legal"><span class="eyebrow">We’re here to help</span><h1>Help & Support</h1><p class="lede">Tell us what happened and include the smallest amount of information needed to investigate. Never send a password, access token, or full payment-card number.</p><div class="card"><h2>Contact the team</h2><p>Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. Choose a subject such as Support, Privacy, Billing, or Account deletion.</p><p class="meta">We aim to reply within two business days.</p></div><h2>Useful information to include</h2><ul><li>What you were trying to do and what happened.</li><li>Your device type and app version, if relevant.</li><li>A transaction/order identifier for billing questions, with payment details removed.</li><li>The email on your account only when we need to locate or delete it.</li></ul><h2>Quick links</h2><p>${link("/privacy", "Privacy Policy")} · ${link("/terms", "Terms of Use")} · ${link("/subscriptions", "Subscription Information")} · ${link("/delete-account", "Account Deletion")}</main>`,
    res,
    "/support",
    "support",
  ),
);
router.get("/legal-center", (_req: Request, res: Response) =>
  sendPage(
    "Calora Legal Center",
    "Calora legal documents, privacy controls, and review status.",
    `<main class="page legal"><span class="eyebrow">Trust & governance</span><h1>Calora Legal Center</h1><p class="meta">Document status: review package · Last engineering verification: October 8, 2026</p><p class="lede">This page is a transparent index of Calora’s current legal and privacy surfaces. It does not replace the applicable Terms of Use or Privacy Policy and does not publish unresolved draft provisions.</p><div class="notice"><strong>Publication status:</strong> The binding documents currently available on this site remain the source of truth. Additional jurisdiction-specific language, retention periods, regional rights handling, and dispute provisions remain subject to owner approval and qualified-counsel review.</div><h2>Current public documents</h2><ul><li>${link("/privacy", "Privacy Policy")} — current public notice.</li><li>${link("/terms", "Terms of Use")} — current public terms.</li><li>${link("/subscriptions", "Subscription Information")} — purchase, renewal, cancellation, and refund information.</li><li>${link("/delete-account", "Account Deletion")} — authenticated deletion and support path.</li><li>${link("/support", "Help & Support")} — product, privacy, billing, and account contact.</li></ul><h2>Privacy controls</h2><p>Signed-in users can submit an access, correction, deletion, portability, restriction, or consent-withdrawal request through the application’s privacy controls. Requests are recorded with an account-scoped status and are reviewed according to the applicable policy and law. Account deletion remains available separately.</p><h2>What is still under review</h2><p>Launch jurisdictions, operator identity details, retention periods, provider contract settings, international transfer analysis, accessibility evidence, and jurisdiction-specific dispute provisions are not represented as finalized here. The current launch posture is U.S.-first and 18+; future expansion would require a new legal and product review.</p>${contactCard("legal")}</main>`,
    res,
    "/legal-center",
    "legal",
  ),
);
router.get("/contact", (_req: Request, res: Response) =>
  sendPage(
    "Contact Calora",
    "Contact Calora and Etiendem Technologies for support, privacy, billing, or account questions.",
    `<main class="page legal"><span class="eyebrow">Contact Calora</span><h1>We’re listening.</h1><p class="lede">Calora is published by Etiendem Technologies. Our monitored team can help with product, privacy, billing, and account questions.</p>${contactCard("general")}</main>`,
    res,
    "/contact",
    "support",
  ),
);
router.get("/help", (_req: Request, res: Response) =>
  sendPage(
    "Calora Help",
    "Find help for Calora, including support, privacy, billing, and account deletion.",
    `<main class="page legal"><span class="eyebrow">Calora Help</span><h1>Calora Help</h1><p class="lede">Find answers and contact the team about Calora.</p><p>${link("/support", "Help & Support")} · ${link("/privacy", "Privacy Policy")} · ${link("/delete-account", "Delete your account")}</p></main>`,
    res,
    "/help",
    "support",
  ),
);

router.get("/robots.txt", (_req: Request, res: Response) =>
  res
    .status(200)
    .type("text/plain")
    .send(
      "User-agent: *\nAllow: /\nDisallow: /invite\nDisallow: /auth/\nSitemap: https://mycaloraapp.com/sitemap.xml\n",
    ),
);
router.get("/sitemap.xml", (_req: Request, res: Response) => {
  const urls = [
    "",
    "privacy",
    "terms",
    "support",
    "contact",
    "delete-account",
    "subscriptions",
    "legal-center",
  ];
  res
    .status(200)
    .type("application/xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>https://mycaloraapp.com/${path}</loc></url>`).join("")}</urlset>`,
    );
});
router.get("/site.webmanifest", (_req: Request, res: Response) =>
  res
    .status(200)
    .type("application/manifest+json")
    .json({
      name: "Calora",
      short_name: "Calora",
      start_url: "/",
      display: "standalone",
      background_color: "#f7faf6",
      theme_color: "#123f32",
      icons: [
        {
          src: "/assets/icon/calora-icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    }),
);

let cachedIcon: Buffer | null = null;
router.get(
  "/assets/icon/calora-icon-512.png",
  (_req: Request, res: Response) => {
    try {
      if (!cachedIcon)
        cachedIcon = Buffer.from(
          new Resvg(
            `<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="116" fill="#123f32"/><circle cx="256" cy="270" r="174" fill="#ff765c"/><path d="M319 143c-93 19-157 64-164 135-6 61 25 101 67 111 39-76 94-96 123-154 13-26 16-57 12-92-12 0-25 0-38 0Z" fill="#cfe9dc"/></svg>`,
          )
            .render()
            .asPng(),
        );
      res
        .status(200)
        .set("Content-Type", "image/png")
        .set(
          "Cache-Control",
          "public, max-age=86400, stale-while-revalidate=604800",
        )
        .send(cachedIcon);
    } catch {
      res.status(500).send("Image generation failed");
    }
  },
);
let cachedSocialCard: Buffer | null = null;
router.get(
  "/assets/social/calora-social-card.png",
  (_req: Request, res: Response) => {
    try {
      if (!cachedSocialCard)
        cachedSocialCard = Buffer.from(
          new Resvg(
            `<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#123f32"/><circle cx="1050" cy="100" r="240" fill="#cfe9dc" opacity=".18"/><circle cx="1100" cy="570" r="280" fill="#ff765c" opacity=".22"/><rect x="80" y="80" width="130" height="130" rx="38" fill="#ff765c"/><text x="80" y="365" font-family="Arial,sans-serif" font-size="96" font-weight="700" fill="#fff">Calora</text><text x="84" y="435" font-family="Arial,sans-serif" font-size="34" fill="#cfe9dc">AI Nutrition &amp; Calorie Tracker</text><text x="84" y="505" font-family="Arial,sans-serif" font-size="25" fill="#fff" opacity=".82">Eat Smarter. Live Better.</text></svg>`,
          )
            .render()
            .asPng(),
        );
      res
        .status(200)
        .set("Content-Type", "image/png")
        .set(
          "Cache-Control",
          "public, max-age=86400, stale-while-revalidate=604800",
        )
        .send(cachedSocialCard);
    } catch {
      res.status(500).send("Image generation failed");
    }
  },
);

export default router;
