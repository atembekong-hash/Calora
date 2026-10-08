import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import {
  ADMIN_ROLES,
  adminConsoleHost,
  authenticateAdmin,
  clearAdminSessionCookie,
  createAdminSession,
  isAdminHost,
  publicAdminSession,
  reauthenticateAdmin,
  revokeAdminSession,
  rotateAdminCsrf,
  type AdminRole,
} from "../lib/admin-auth.js";
import {
  grantAdminRole,
  listAdminPrincipals,
  revokeAdminPrincipal,
  writeAdminAudit,
} from "../lib/admin-data.js";
import {
  listManagedFeatureFlags,
  setManagedFeatureFlag,
} from "../lib/admin-feature-flags.js";

const router = Router();
const ADMIN_HTML_CACHE = "no-store, max-age=0";
const MAX_QUERY_LIMIT = 90;

function integerLimit(value: unknown, fallback = 30): number {
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, MAX_QUERY_LIMIT)
    : fallback;
}

function safeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function sendUnavailable(res: Response): void {
  res.status(503).json({
    message: "Administrative information is temporarily unavailable.",
  });
}

function adminSecurityHeaders(req: Request, res: Response): void {
  const supabaseOrigin = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const connectSource =
    supabaseOrigin && /^https:\/\//.test(supabaseOrigin)
      ? ` 'self' ${supabaseOrigin}`
      : " 'self'";
  res.setHeader("Cache-Control", ADMIN_HTML_CACHE);
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src${connectSource};`,
  );
  void req;
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    handler(req, res).catch(() => {
      if (!res.headersSent) sendUnavailable(res);
    });
  };
}

async function requirePermission(
  req: Request,
  res: Response,
  permission: Parameters<typeof authenticateAdmin>[2],
  options?: Parameters<typeof authenticateAdmin>[3],
) {
  const session = await authenticateAdmin(req, res, permission, options);
  if (!session && !res.headersSent) {
    res
      .status(401)
      .json({ message: "Administrative authentication is required." });
  }
  return session;
}

function clientConfig() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return {
    configured: Boolean(supabaseUrl && supabaseAnonKey),
    supabaseUrl,
    supabaseAnonKey,
  };
}

function adminConsoleHtml() {
  const config = JSON.stringify(clientConfig()).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
<title>Calora Control Center</title>
<style>
:root{color-scheme:dark;--ink:#edf4ef;--muted:#9bb0a3;--panel:#11231c;--panel-2:#162d24;--line:#2b473a;--accent:#ff795f;--good:#7cda9c;--warn:#ffce73;--danger:#ff8a8a}*{box-sizing:border-box}body{margin:0;background:#08130e;color:var(--ink);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.shell{max-width:1220px;margin:auto;padding:30px 20px 56px}.brand{display:flex;justify-content:space-between;gap:18px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:22px}.brand h1{margin:0;font-size:26px}.eyebrow{font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:var(--accent);font-weight:700}.subtle{color:var(--muted)}button,input,select{font:inherit}button{background:var(--accent);border:0;border-radius:10px;color:#261310;font-weight:750;padding:10px 14px;cursor:pointer}button.secondary{background:transparent;border:1px solid var(--line);color:var(--ink)}button.danger{background:#4a1f22;color:#ffd9d8}button:disabled{opacity:.55;cursor:not-allowed}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:22px 0}.panel{border:1px solid var(--line);border-radius:15px;background:var(--panel);padding:18px}.metric strong{display:block;font-size:28px;margin-top:5px}.metric span{color:var(--muted);font-size:13px}.layout{display:grid;grid-template-columns:220px 1fr;gap:16px}.nav{display:flex;flex-direction:column;gap:7px;align-self:start;position:sticky;top:16px}.nav button{text-align:left;background:transparent;color:var(--muted);padding:11px 12px}.nav button.active{background:var(--panel-2);color:var(--ink)}.view{min-width:0}.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.space{justify-content:space-between}.notice{border-radius:10px;padding:11px 13px;margin:15px 0;background:#163326;color:#c5f7d5}.notice.error{background:#3b2022;color:#ffd7d6}.table{width:100%;border-collapse:collapse}.table th,.table td{padding:10px 8px;border-bottom:1px solid var(--line);text-align:left;font-size:13px}.table th{color:var(--muted);font-weight:600}.chip{border-radius:999px;padding:3px 8px;font-size:12px;font-weight:700;display:inline-block;background:#243f31;color:#bdeccb}.chip.warn{background:#4a3c20;color:#ffdb93}.chip.danger{background:#492425;color:#ffc4c3}.login{max-width:460px;margin:10vh auto}.login label{display:block;margin-top:13px;color:var(--muted);font-size:13px}.login input,.form-control{width:100%;margin-top:5px;border:1px solid var(--line);background:#0b1b14;color:var(--ink);padding:11px;border-radius:9px}.login small{display:block;color:var(--muted);margin-top:15px}.empty{color:var(--muted);padding:30px 4px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:820px){.layout{grid-template-columns:1fr}.nav{position:static;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.brand{align-items:flex-start;flex-direction:column}}@media(max-width:440px){.grid{grid-template-columns:1fr}.shell{padding:20px 14px}}
</style></head><body><main class="shell" id="app" aria-live="polite"></main><script>
const config=${config};let csrf='';let accessToken='';let session=null;let active='overview';
const app=document.getElementById('app');const allowed={owner:['overview','users','subscriptions','scan','coach','moderation','content','privacy','system','features','access','audit'],operations:['overview','users','subscriptions','scan','coach','moderation','content','privacy','system','features','audit'],support:['overview','users','subscriptions','privacy'],content:['overview','content','scan'],moderation:['overview','coach','moderation'],analyst:['overview','subscriptions','scan','coach','content','privacy','system']};
function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}function stamp(v){return v?new Date(v).toLocaleString(): '—'}function note(text,error=false){return '<div class="notice '+(error?'error':'')+'">'+esc(text)+'</div>'}function api(path,options={}){const headers={...(options.headers||{})};if(csrf)headers['X-Calora-Admin-Csrf']=csrf;return fetch('/admin/api'+path,{credentials:'same-origin',...options,headers}).then(async r=>{const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.message||'Request failed');return body})}
function layout(body){const tabs=allowed[session.administrator.role]||[];return '<header class="brand"><div><div class="eyebrow">Restricted internal system</div><h1>Calora Control Center</h1><div class="subtle">Privacy-minimized operational visibility. No user nutrition or Coach message content is displayed.</div></div><div class="row"><span class="chip">'+esc(session.administrator.role)+'</span><button class="secondary" id="logout">Sign out</button></div></header><div class="layout"><nav class="nav" aria-label="Control Center sections">'+tabs.map(t=>'<button class="'+(active===t?'active':'')+'" data-tab="'+t+'">'+esc(t[0].toUpperCase()+t.slice(1))+'</button>').join('')+'</nav><section class="view">'+body+'</section></div>'}
function bindLayout(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.tab;render()});document.getElementById('logout').onclick=async()=>{try{await api('/session',{method:'DELETE'});csrf='';session=null;active='overview';render()}catch(e){flash(e.message,true)}}}
function flash(message,error=false){const el=document.getElementById('flash');if(el)el.outerHTML='<div id="flash">'+note(message,error)+'</div>'}
async function login(){const email=document.getElementById('email').value.trim();const password=document.getElementById('password').value;const target=document.getElementById('login-message');if(!config.configured){target.innerHTML=note('Administrative sign-in is not configured.',true);return}target.innerHTML=note('Signing in…');try{const tokenRes=await fetch(config.supabaseUrl.replace(/\/$/,'')+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json','apikey':config.supabaseAnonKey},body:JSON.stringify({email,password})});const token=await tokenRes.json();password='';document.getElementById('password').value='';if(!tokenRes.ok||!token.access_token)throw new Error('Sign-in failed.');accessToken=token.access_token;const response=await fetch('/admin/api/session',{method:'POST',credentials:'same-origin',headers:{Authorization:'Bearer '+accessToken}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.message||'Administrative access is not available for this account.');csrf=body.csrfToken;session=body.session;render()}catch(e){target.innerHTML=note(e.message||'Sign-in failed.',true)}}
function renderLogin(){app.innerHTML='<section class="panel login"><div class="eyebrow">Authorized administrators only</div><h1>Sign in to Calora Control Center</h1><p class="subtle">Use your existing approved Calora account. Administrative access is role-based, time-limited, and logged.</p><label>Email<input id="email" type="email" autocomplete="username" required></label><label>Password<input id="password" type="password" autocomplete="current-password" required></label><div class="row" style="margin-top:18px"><button id="login">Secure sign in</button></div><div id="login-message"></div><small>This console never displays raw Coach conversations, user food logs, health data, passwords, access tokens, payment details, or secret keys.</small></section>';document.getElementById('login').onclick=login;document.getElementById('password').onkeydown=e=>{if(e.key==='Enter')login()}}
function cards(data){return '<div class="grid">'+data.map(x=>'<article class="panel metric"><span>'+esc(x.label)+'</span><strong>'+esc(x.value)+'</strong><span>'+esc(x.hint||'')+'</span></article>').join('')+'</div>'}
function table(headers,rows){if(!rows.length)return '<div class="panel empty">No operational records are available in this bounded view.</div>';return '<div class="panel"><div style="overflow:auto"><table class="table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div></div>'}
async function overview(){const d=await api('/overview');return cards([{label:'Registered accounts',value:d.accounts.total,hint:'aggregate only'},{label:'Active subscriptions',value:d.subscriptions.active,hint:'current local records'},{label:'Scan completion',value:d.scans.completionRate+'%',hint:'last 24 hours'},{label:'Open Coach reports',value:d.coach.openReports,hint:'bounded moderation queue'}])+table(['System','Status','Observed'],d.systems.map(x=>'<tr><td>'+esc(x.name)+'</td><td><span class="chip '+(x.status==='healthy'?'':'warn')+'">'+esc(x.status)+'</span></td><td>'+esc(x.detail)+'</td></tr>'))}
async function users(){const d=await api('/users');return cards([{label:'Accounts',value:d.total,hint:'all-time aggregate'},{label:'New in 7 days',value:d.newLast7Days,hint:'daily rollup below'},{label:'Recent activity',value:d.activeLast7Days,hint:'non-identifying proxy'}])+table(['Date','New accounts'],d.daily.map(x=>'<tr><td>'+esc(x.date)+'</td><td>'+esc(x.count)+'</td></tr>'))}
async function subscriptions(){const d=await api('/subscriptions');return cards([{label:'Active',value:d.active,hint:'local entitlement records'},{label:'Expiring soon',value:d.expiringSoon,hint:'next 7 days'},{label:'Cancelled / inactive',value:d.inactive,hint:'local status aggregate'}])+table(['Entitlement status','Count'],d.byStatus.map(x=>'<tr><td>'+esc(x.status)+'</td><td>'+esc(x.count)+'</td></tr>'))}
async function scan(){const d=await api('/scan');return cards([{label:'Sessions',value:d.total,hint:'last 7 days'},{label:'Completion rate',value:d.completionRate+'%',hint:'review or approved'},{label:'Unavailable / failed',value:d.unavailable,hint:'operational aggregate'}])+table(['Mode','Sessions','Completion rate'],d.byMode.map(x=>'<tr><td>'+esc(x.mode)+'</td><td>'+esc(x.count)+'</td><td>'+esc(x.completionRate)+'%</td></tr>'))}
async function coach(){const d=await api('/coach');return cards([{label:'Assistant replies',value:d.assistantTurns,hint:'last 7 days aggregate'},{label:'Open reports',value:d.openReports,hint:'received or under review'},{label:'Reports expiring soon',value:d.expiringSoon,hint:'retention monitor'}])+table(['Report reason','Count'],d.reportsByReason.map(x=>'<tr><td>'+esc(x.reason)+'</td><td>'+esc(x.count)+'</td></tr>'))}
async function moderation(){const d=await api('/moderation');const can=allowed[session.administrator.role].includes('moderation');return cards([{label:'Received',value:d.summary.received,hint:'needs triage'},{label:'Under review',value:d.summary.under_review,hint:'in progress'},{label:'Escalated',value:d.summary.escalated,hint:'follow controlled response'}])+table(['Received','Reason','Scope','Status','Action'],d.reports.map(x=>'<tr><td>'+stamp(x.createdAt)+'</td><td>'+esc(x.reason)+'</td><td>'+esc(x.scope)+'</td><td><span class="chip '+(x.status==='escalated'?'danger':x.status==='received'?'warn':'')+'">'+esc(x.status)+'</span></td><td>'+(can?'<button class="secondary" data-report="'+esc(x.id)+'">Update</button>':'—')+'</td></tr>'));}
async function content(){const d=await api('/content');return cards([{label:'Recipes',value:d.recipes.total,hint:'server records'},{label:'Recipe media',value:d.media.total,hint:'metadata only'},{label:'Missing media',value:d.media.withoutMedia,hint:'content operation cue'}])+table(['Content status','Count'],d.status.map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+esc(x.count)+'</td></tr>'))}
async function privacy(){const d=await api('/privacy');return cards([{label:'Deletion operations',value:d.deletion.inProgress,hint:'in progress'},{label:'Coach reports expiring',value:d.coachReports.expiringSoon,hint:'next 7 days'},{label:'Expired report records',value:d.coachReports.expired,hint:'requires scheduled retention worker'}])+table(['Privacy control','Value'],d.controls.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.value)+'</td></tr>'))}
async function system(){const d=await api('/system');return cards([{label:'Release',value:d.release.commit,hint:'short deployment identity'},{label:'Database',value:d.database.status,hint:'readiness query'},{label:'Admin sessions',value:d.sessions.active,hint:'active time-bound sessions'}])+table(['Check','Status','Detail'],d.checks.map(x=>'<tr><td>'+esc(x.name)+'</td><td><span class="chip '+(x.status==='healthy'?'':'warn')+'">'+esc(x.status)+'</span></td><td>'+esc(x.detail)+'</td></tr>'))}
async function features(){const d=await api('/features');return '<section class="panel"><h2>Reviewed feature controls</h2><p class="subtle">Only code-reviewed flags are listed. Each change requires a recent administrator reauthentication and is permanently audited.</p></section>'+table(['Feature','State','Purpose','Action'],d.map(x=>'<tr><td>'+esc(x.label)+'</td><td><span class="chip '+(x.enabled?'':'warn')+'">'+(x.enabled?'enabled':'disabled')+'</span></td><td>'+esc(x.description)+'</td><td><button class="secondary" data-feature="'+esc(x.key)+'" data-enabled="'+String(!x.enabled)+'">'+(x.enabled?'Disable':'Enable')+'</button></td></tr>'))}
async function access(){const d=await api('/principals');const owner=session.administrator.role==='owner';return cards([{label:'Active administrators',value:d.filter(x=>x.active).length,hint:'role-controlled access'},{label:'Your role',value:session.administrator.role,hint:'least privilege' }])+table(['Administrator','Role','State','Created','Action'],d.map(x=>'<tr><td>'+esc(x.displayName)+'</td><td>'+esc(x.role)+'</td><td>'+esc(x.active?'active':'revoked')+'</td><td>'+stamp(x.createdAt)+'</td><td>'+(owner&&x.active?'<button class="danger" data-revoke="'+esc(x.id)+'">Revoke</button>':'—')+'</td></tr>'))+(owner?'<section class="panel" style="margin-top:14px"><h3>Grant or restore a role</h3><p class="subtle">Enter an existing Supabase Auth user identifier from the approved access process. This action is audited and requires recent reauthentication.</p><div class="row"><input class="form-control" id="grant-id" placeholder="Existing Auth user identifier"><input class="form-control" id="grant-name" placeholder="Display name"><select class="form-control" id="grant-role">'+['operations','support','content','moderation','analyst','owner'].map(r=>'<option>'+r+'</option>').join('')+'</select><input class="form-control" id="grant-reason" placeholder="Access reason"><button id="grant">Grant role</button></div></section>':'')}
async function audit(){const d=await api('/audit?limit=50');return table(['When','Action','Target','Result'],d.map(x=>'<tr><td>'+stamp(x.createdAt)+'</td><td>'+esc(x.action)+'</td><td>'+esc(x.targetType||'—')+'</td><td>'+esc(x.result)+'</td></tr>'))}
async function render(){if(!session){renderLogin();return}app.innerHTML=layout('<div id="flash"></div><div class="panel">Loading restricted operational data…</div>');bindLayout();try{const view=({overview,users,subscriptions,scan,coach,moderation,content,privacy,system,features,access,audit})[active]||overview;app.innerHTML=layout('<div id="flash"></div>'+await view());bindLayout();bindActions()}catch(e){app.innerHTML=layout('<div id="flash">'+note(e.message||'Unable to load this restricted view.',true)+'</div>');bindLayout()}}
function bindActions(){document.querySelectorAll('[data-report]').forEach(b=>b.onclick=async()=>{const status=prompt('Set status: received, under_review, resolved, dismissed, or escalated');if(!status)return;try{await reauthAnd(()=>api('/moderation/reports/'+b.dataset.report,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})}));render()}catch(e){flash(e.message,true)}});document.querySelectorAll('[data-feature]').forEach(b=>b.onclick=async()=>{const enabled=b.dataset.enabled==='true';if(!confirm((enabled?'Enable':'Disable')+' this reviewed feature?'))return;try{await reauthAnd(()=>api('/features/'+b.dataset.feature,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled})}));render()}catch(e){flash(e.message,true)}});document.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=async()=>{if(!confirm('Revoke this administrator and all active sessions?'))return;try{await reauthAnd(()=>api('/principals/'+b.dataset.revoke,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:'Access no longer required'})}));render()}catch(e){flash(e.message,true)}});const grant=document.getElementById('grant');if(grant)grant.onclick=async()=>{try{await reauthAnd(()=>api('/principals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({externalUserId:document.getElementById('grant-id').value.trim(),displayName:document.getElementById('grant-name').value.trim(),role:document.getElementById('grant-role').value,reason:document.getElementById('grant-reason').value.trim()})}));render()}catch(e){flash(e.message,true)}}}
async function reauthAnd(action){if(!accessToken)throw new Error('Reauthentication requires signing in again.');const response=await fetch('/admin/api/reauth',{method:'POST',credentials:'same-origin',headers:{Authorization:'Bearer '+accessToken,'X-Calora-Admin-Csrf':csrf,'Origin':location.origin}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.message||'Recent reauthentication failed.');csrf=body.csrfToken;return action()}
(async()=>{try{const response=await fetch('/admin/api/session',{credentials:'same-origin'});if(response.ok){const body=await response.json();session=body.session;csrf=body.csrfToken||''}}catch{}render()})();
</script></main></body></html>`;
}

router.use((req, res, next) => {
  if (!isAdminHost(req)) {
    if (req.path === "/admin" || req.path.startsWith("/admin/")) {
      res.status(404).end();
      return;
    }
    return next();
  }
  adminSecurityHeaders(req, res);
  return next();
});

router.get("/admin", (req, res, next) => {
  if (!isAdminHost(req)) return next();
  res.status(404).end();
});

router.get("/", (req, res, next) => {
  if (!isAdminHost(req)) return next();
  res.status(200).type("html").send(adminConsoleHtml());
});

router.post(
  "/admin/api/session",
  asyncRoute(async (req, res) => {
    if (!isAdminHost(req)) {
      res.status(404).end();
      return;
    }
    const created = await createAdminSession(req, res);
    if (!created) return;
    await writeAdminAudit({
      session: created.session,
      action: "admin.session_created",
      result: "success",
      requestId: String(req.id),
    }).catch(() => undefined);
    res.status(201).json({
      session: publicAdminSession(created.session),
      csrfToken: created.csrfToken,
    });
  }),
);

router.get(
  "/admin/api/session",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "overview.read");
    if (!session) return;
    const csrfToken = await rotateAdminCsrf(session);
    res.json({ session: publicAdminSession(session), csrfToken });
  }),
);

router.delete(
  "/admin/api/session",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "overview.read", {
      mutate: true,
    });
    if (!session) return;
    await revokeAdminSession(session);
    clearAdminSessionCookie(res);
    await writeAdminAudit({
      session,
      action: "admin.session_revoked",
      result: "success",
      requestId: String(req.id),
    }).catch(() => undefined);
    res.status(204).end();
  }),
);

router.post(
  "/admin/api/reauth",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "overview.read", {
      mutate: true,
    });
    if (!session) return;
    if (!(await reauthenticateAdmin(req, res, session))) return;
    const csrfToken = await rotateAdminCsrf(session);
    await writeAdminAudit({
      session,
      action: "admin.reauthenticated",
      result: "success",
      requestId: String(req.id),
    }).catch(() => undefined);
    res.json({ reauthenticated: true, csrfToken });
  }),
);

router.get(
  "/admin/api/overview",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "overview.read");
    if (!session) return;
    const result = await pool.query<{
      account_count: string;
      active_subscription_count: string;
      scan_total: string;
      scan_completed: string;
      open_reports: string;
    }>(`SELECT
      (SELECT count(*)::text FROM calora_users) AS account_count,
      (SELECT count(*)::text FROM calora_subscriptions WHERE status IN ('active', 'trialing')) AS active_subscription_count,
      (SELECT count(*)::text FROM calora_ai_capture_sessions WHERE created_at >= now() - interval '24 hours') AS scan_total,
      (SELECT count(*)::text FROM calora_ai_capture_sessions WHERE created_at >= now() - interval '24 hours' AND status IN ('review', 'approved')) AS scan_completed,
      (SELECT count(*)::text FROM calora_coach_reports WHERE status IN ('received', 'under_review', 'escalated') AND expires_at > now()) AS open_reports`);
    const row = result.rows[0];
    const total = Number(row?.scan_total ?? "0");
    const completed = Number(row?.scan_completed ?? "0");
    res.json({
      accounts: { total: Number(row?.account_count ?? "0") },
      subscriptions: { active: Number(row?.active_subscription_count ?? "0") },
      scans: {
        completionRate: total ? Math.round((completed / total) * 100) : 0,
      },
      coach: { openReports: Number(row?.open_reports ?? "0") },
      systems: [
        {
          name: "Admin authorization",
          status: "healthy",
          detail: "Server-enforced role and session checks",
        },
        {
          name: "Operational data",
          status: "healthy",
          detail: "Aggregate-only dashboard queries",
        },
      ],
    });
  }),
);

router.get(
  "/admin/api/users",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "users.read");
    if (!session) return;
    const result = await pool.query<{
      date: string;
      count: string;
      total: string;
      recent: string;
    }>(`WITH daily AS (
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date, count(*)::text AS count
        FROM calora_users
       WHERE created_at >= now() - interval '7 days'
       GROUP BY 1
       ORDER BY 1 DESC
    ) SELECT date, count,
      (SELECT count(*)::text FROM calora_users) AS total,
      (SELECT count(*)::text FROM calora_ai_capture_sessions WHERE created_at >= now() - interval '7 days') AS recent
      FROM daily`);
    res.json({
      total: Number(result.rows[0]?.total ?? "0"),
      newLast7Days: result.rows.reduce(
        (sum, row) => sum + Number(row.count),
        0,
      ),
      activeLast7Days: Number(result.rows[0]?.recent ?? "0"),
      daily: result.rows.map((row) => ({
        date: row.date,
        count: Number(row.count),
      })),
    });
  }),
);

router.get(
  "/admin/api/subscriptions",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "subscriptions.read");
    if (!session) return;
    const result = await pool.query<{ status: string; count: string }>(
      `SELECT status, count(*)::text AS count FROM calora_subscriptions GROUP BY status ORDER BY status LIMIT 30`,
    );
    const byStatus = result.rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));
    const active = byStatus
      .filter((row) => ["active", "trialing"].includes(row.status))
      .reduce((sum, row) => sum + row.count, 0);
    const inactive = byStatus
      .filter((row) => !["active", "trialing"].includes(row.status))
      .reduce((sum, row) => sum + row.count, 0);
    const expiring = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM calora_subscriptions WHERE expires_at > now() AND expires_at <= now() + interval '7 days'`,
    );
    res.json({
      active,
      inactive,
      expiringSoon: Number(expiring.rows[0]?.count ?? "0"),
      byStatus,
    });
  }),
);

router.get(
  "/admin/api/scan",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "scan.read");
    if (!session) return;
    const result = await pool.query<{
      mode: string;
      count: string;
      complete: string;
      unavailable: string;
    }>(`SELECT mode, count(*)::text AS count,
      count(*) FILTER (WHERE status IN ('review', 'approved'))::text AS complete,
      count(*) FILTER (WHERE status IN ('unavailable', 'failed'))::text AS unavailable
     FROM calora_ai_capture_sessions
    WHERE created_at >= now() - interval '7 days'
    GROUP BY mode ORDER BY mode LIMIT 30`);
    const total = result.rows.reduce((sum, row) => sum + Number(row.count), 0);
    const complete = result.rows.reduce(
      (sum, row) => sum + Number(row.complete),
      0,
    );
    res.json({
      total,
      completionRate: total ? Math.round((complete / total) * 100) : 0,
      unavailable: result.rows.reduce(
        (sum, row) => sum + Number(row.unavailable),
        0,
      ),
      byMode: result.rows.map((row) => ({
        mode: row.mode,
        count: Number(row.count),
        completionRate: Number(row.count)
          ? Math.round((Number(row.complete) / Number(row.count)) * 100)
          : 0,
      })),
    });
  }),
);

router.get(
  "/admin/api/coach",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "coach.read");
    if (!session) return;
    const result = await pool.query<{
      assistant_turns: string;
      open_reports: string;
      expiring: string;
    }>(`SELECT
    (SELECT count(*)::text FROM calora_coach_v2_turns WHERE role = 'assistant' AND created_at >= now() - interval '7 days') AS assistant_turns,
    (SELECT count(*)::text FROM calora_coach_reports WHERE status IN ('received', 'under_review', 'escalated') AND expires_at > now()) AS open_reports,
    (SELECT count(*)::text FROM calora_coach_reports WHERE expires_at > now() AND expires_at <= now() + interval '7 days') AS expiring`);
    const reasons = await pool.query<{ reason: string; count: string }>(
      `SELECT reason, count(*)::text AS count FROM calora_coach_reports WHERE expires_at > now() GROUP BY reason ORDER BY reason LIMIT 20`,
    );
    const row = result.rows[0];
    res.json({
      assistantTurns: Number(row?.assistant_turns ?? "0"),
      openReports: Number(row?.open_reports ?? "0"),
      expiringSoon: Number(row?.expiring ?? "0"),
      reportsByReason: reasons.rows.map((reason) => ({
        reason: reason.reason,
        count: Number(reason.count),
      })),
    });
  }),
);

router.get(
  "/admin/api/moderation",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "moderation.read");
    if (!session) return;
    const summaryResult = await pool.query<{ status: string; count: string }>(
      `SELECT status, count(*)::text AS count FROM calora_coach_reports WHERE expires_at > now() GROUP BY status LIMIT 20`,
    );
    const reports = await pool.query<{
      id: string;
      scope: string;
      reason: string;
      status: string;
      created_at: Date;
    }>(
      `SELECT id, scope, reason, status, created_at FROM calora_coach_reports WHERE expires_at > now() ORDER BY created_at DESC LIMIT $1`,
      [integerLimit(req.query.limit)],
    );
    const summary = Object.fromEntries(
      summaryResult.rows.map((row) => [row.status, Number(row.count)]),
    );
    res.json({
      summary: {
        received: summary.received ?? 0,
        under_review: summary.under_review ?? 0,
        escalated: summary.escalated ?? 0,
      },
      reports: reports.rows.map((report) => ({
        id: report.id,
        scope: report.scope,
        reason: report.reason,
        status: report.status,
        createdAt: report.created_at.toISOString(),
      })),
    });
  }),
);

router.patch(
  "/admin/api/moderation/reports/:id",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "moderation.resolve", {
      mutate: true,
      reauth: true,
    });
    if (!session) return;
    const reportId = typeof req.params.id === "string" ? req.params.id : "";
    const status = typeof req.body?.status === "string" ? req.body.status : "";
    if (
      !safeUuid(reportId) ||
      ![
        "received",
        "under_review",
        "resolved",
        "dismissed",
        "escalated",
      ].includes(status)
    ) {
      res.status(400).json({ message: "Invalid report status update." });
      return;
    }
    const updated = await pool.query<{ id: string }>(
      `UPDATE calora_coach_reports SET status = $2 WHERE id = $1::uuid AND expires_at > now() RETURNING id`,
      [reportId, status],
    );
    if (!updated.rows[0]) {
      res.status(404).json({ message: "Report is unavailable." });
      return;
    }
    await writeAdminAudit({
      session,
      action: "moderation.status_changed",
      targetType: "coach_report",
      targetReference: reportId,
      result: "success",
      metadata: { status },
      requestId: String(req.id),
    });
    res.json({ updated: true });
  }),
);

router.get(
  "/admin/api/content",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "content.read");
    if (!session) return;
    const result = await pool.query<{
      recipes: string;
      media: string;
      missing: string;
    }>(`SELECT
      (SELECT count(*)::text FROM calora_recipes) AS recipes,
      (SELECT count(*)::text FROM calora_recipe_media) AS media,
      (SELECT count(*)::text FROM calora_recipes r WHERE NOT EXISTS (SELECT 1 FROM calora_recipe_media m WHERE m.client_recipe_id = r.id::text)) AS missing`);
    const row = result.rows[0];
    res.json({
      recipes: { total: Number(row?.recipes ?? "0") },
      media: {
        total: Number(row?.media ?? "0"),
        withoutMedia: Number(row?.missing ?? "0"),
      },
      status: [
        {
          label: "Recipes with canonical media",
          count: Math.max(
            0,
            Number(row?.recipes ?? "0") - Number(row?.missing ?? "0"),
          ),
        },
        {
          label: "Recipes without stored media",
          count: Number(row?.missing ?? "0"),
        },
      ],
    });
  }),
);

router.get(
  "/admin/api/privacy",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "privacy.read");
    if (!session) return;
    const result = await pool.query<{
      deleting: string;
      expiring: string;
      expired: string;
    }>(`SELECT
      (SELECT count(*)::text FROM calora_account_deletion_states WHERE state IN ('requested', 'deleting', 'retryable')) AS deleting,
      (SELECT count(*)::text FROM calora_coach_reports WHERE expires_at > now() AND expires_at <= now() + interval '7 days') AS expiring,
      (SELECT count(*)::text FROM calora_coach_reports WHERE expires_at <= now()) AS expired`);
    const row = result.rows[0];
    res.json({
      deletion: { inProgress: Number(row?.deleting ?? "0") },
      coachReports: {
        expiringSoon: Number(row?.expiring ?? "0"),
        expired: Number(row?.expired ?? "0"),
      },
      controls: [
        { name: "Account deletion writes", value: "fenced during erasure" },
        { name: "Coach report retention", value: "90-day expiry metadata" },
        { name: "Admin audit trail", value: "append-only events" },
      ],
    });
  }),
);

router.get(
  "/admin/api/system",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "system.read");
    if (!session) return;
    const db = await pool.query<{
      current_time: Date;
      active_sessions: string;
    }>(
      `SELECT now() AS current_time, (SELECT count(*)::text FROM calora_admin_sessions WHERE revoked_at IS NULL AND expires_at > now()) AS active_sessions`,
    );
    const release = (process.env.CALORA_RELEASE_COMMIT ?? "unattested").slice(
      0,
      12,
    );
    const activeSessions = Number(db.rows[0]?.active_sessions ?? "0");
    res.json({
      release: { commit: release },
      database: { status: "healthy" },
      sessions: { active: activeSessions },
      checks: [
        {
          name: "Database connectivity",
          status: "healthy",
          detail: "Read-only readiness query completed",
        },
        {
          name: "Admin session policy",
          status: "healthy",
          detail: "Short-lived encrypted cookie sessions",
        },
        {
          name: "Release identity",
          status: release === "unattested" ? "attention" : "healthy",
          detail:
            release === "unattested"
              ? "Runtime commit is not attested"
              : `Runtime commit ${release}`,
        },
      ],
    });
  }),
);

router.get(
  "/admin/api/principals",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "admin.roles.manage");
    if (!session) return;
    res.json(await listAdminPrincipals());
  }),
);

router.get(
  "/admin/api/features",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "feature_flags.manage");
    if (!session) return;
    res.json(await listManagedFeatureFlags());
  }),
);

router.patch(
  "/admin/api/features/:key",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "feature_flags.manage", {
      mutate: true,
      reauth: true,
    });
    if (!session) return;
    const key = typeof req.params.key === "string" ? req.params.key : "";
    const enabled = req.body?.enabled;
    if (typeof enabled !== "boolean") {
      res.status(400).json({ message: "Feature state must be a boolean." });
      return;
    }
    const updated = await setManagedFeatureFlag(key, enabled);
    if (!updated) {
      res.status(404).json({ message: "Feature is unavailable." });
      return;
    }
    await writeAdminAudit({
      session,
      action: "feature_flag.updated",
      targetType: "feature_flag",
      targetReference: updated,
      result: "success",
      metadata: { enabled },
      requestId: String(req.id),
    });
    res.json({ key: updated, enabled });
  }),
);

router.post(
  "/admin/api/principals",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "admin.roles.manage", {
      mutate: true,
      reauth: true,
    });
    if (!session) return;
    const externalUserId =
      typeof req.body?.externalUserId === "string"
        ? req.body.externalUserId.trim()
        : "";
    const displayName =
      typeof req.body?.displayName === "string"
        ? req.body.displayName.trim()
        : "";
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const role = typeof req.body?.role === "string" ? req.body.role : "";
    if (
      !externalUserId ||
      externalUserId.length > 128 ||
      !displayName ||
      displayName.length > 80 ||
      reason.length < 3 ||
      reason.length > 500 ||
      !(ADMIN_ROLES as readonly string[]).includes(role)
    ) {
      res.status(400).json({ message: "Role grant input is invalid." });
      return;
    }
    const principal = await grantAdminRole({
      actor: session,
      externalUserId,
      displayName,
      role: role as AdminRole,
      reason,
    });
    if (!principal) return sendUnavailable(res);
    await writeAdminAudit({
      session,
      action: "admin.role_granted",
      targetType: "admin_principal",
      targetReference: principal.id,
      result: "success",
      metadata: { role: principal.role },
      requestId: String(req.id),
    });
    res.status(201).json({
      principal: {
        id: principal.id,
        displayName: principal.displayName,
        role: principal.role,
      },
    });
  }),
);

router.delete(
  "/admin/api/principals/:id",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "admin.roles.manage", {
      mutate: true,
      reauth: true,
    });
    if (!session) return;
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const principalId = typeof req.params.id === "string" ? req.params.id : "";
    if (!safeUuid(principalId) || reason.length < 3 || reason.length > 500) {
      res.status(400).json({ message: "Role revocation input is invalid." });
      return;
    }
    const outcome = await revokeAdminPrincipal({
      actor: session,
      principalId,
      reason,
    });
    if (outcome === "not_found") {
      res.status(404).json({ message: "Administrator is unavailable." });
      return;
    }
    if (outcome === "last_owner") {
      res
        .status(409)
        .json({ message: "The final active Owner cannot be revoked." });
      return;
    }
    if (outcome === "self") {
      res.status(409).json({
        message: "Administrators cannot revoke their own active role.",
      });
      return;
    }
    await writeAdminAudit({
      session,
      action: "admin.role_revoked",
      targetType: "admin_principal",
      targetReference: principalId,
      result: "success",
      requestId: String(req.id),
    });
    res.status(204).end();
  }),
);

router.get(
  "/admin/api/audit",
  asyncRoute(async (req, res) => {
    const session = await requirePermission(req, res, "audit.read");
    if (!session) return;
    const events = await pool.query<{
      action: string;
      target_type: string | null;
      result: string;
      created_at: Date;
    }>(
      `SELECT action, target_type, result, created_at FROM calora_admin_audit_events ORDER BY created_at DESC LIMIT $1`,
      [integerLimit(req.query.limit, 50)],
    );
    res.json(
      events.rows.map((event) => ({
        action: event.action,
        targetType: event.target_type,
        result: event.result,
        createdAt: event.created_at.toISOString(),
      })),
    );
  }),
);

export default router;
