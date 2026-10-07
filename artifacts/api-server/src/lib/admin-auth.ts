import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { pool } from "@workspace/db";
import { checkRateLimit } from "./rate-limit.js";
import { verifyBearerToken, type VerifiedUser } from "./supabase-auth.js";

export const ADMIN_ROLES = [
  "owner",
  "operations",
  "support",
  "content",
  "moderation",
  "analyst",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AdminPermission =
  | "overview.read"
  | "users.read"
  | "subscriptions.read"
  | "scan.read"
  | "coach.read"
  | "moderation.read"
  | "moderation.resolve"
  | "content.read"
  | "privacy.read"
  | "system.read"
  | "audit.read"
  | "feature_flags.manage"
  | "admin.roles.manage";

export const ADMIN_ROLE_PERMISSIONS: Readonly<
  Record<AdminRole, readonly AdminPermission[]>
> = {
  owner: [
    "overview.read",
    "users.read",
    "subscriptions.read",
    "scan.read",
    "coach.read",
    "moderation.read",
    "moderation.resolve",
    "content.read",
    "privacy.read",
    "system.read",
    "audit.read",
    "feature_flags.manage",
    "admin.roles.manage",
  ],
  operations: [
    "overview.read",
    "users.read",
    "subscriptions.read",
    "scan.read",
    "coach.read",
    "moderation.read",
    "moderation.resolve",
    "content.read",
    "privacy.read",
    "system.read",
    "audit.read",
    "feature_flags.manage",
  ],
  support: [
    "overview.read",
    "users.read",
    "subscriptions.read",
    "privacy.read",
  ],
  content: ["overview.read", "content.read", "scan.read"],
  moderation: [
    "overview.read",
    "coach.read",
    "moderation.read",
    "moderation.resolve",
  ],
  analyst: [
    "overview.read",
    "subscriptions.read",
    "scan.read",
    "coach.read",
    "content.read",
    "privacy.read",
    "system.read",
  ],
};

const ADMIN_COOKIE = "__Host-calora_admin";
const ADMIN_SESSION_TTL_MS = 15 * 60 * 1000;
const ADMIN_REAUTH_TTL_MS = 5 * 60 * 1000;
const ADMIN_RATE_WINDOW_SECS = 15 * 60;
const ADMIN_LOGIN_LIMIT = 10;

export type AdminPrincipal = {
  id: string;
  externalUserId: string;
  displayName: string;
  role: AdminRole;
};

export type AdminSession = {
  id: string;
  principal: AdminPrincipal;
  csrfToken: string;
  reauthUntil: Date | null;
  expiresAt: Date;
};

type SessionRow = {
  session_id: string;
  token_digest: string;
  csrf_digest: string;
  expires_at: Date;
  reauth_until: Date | null;
  principal_id: string;
  external_user_id: string;
  display_name: string;
  role: string;
};

function adminSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

export function adminConsoleHost(): string {
  const configured = process.env.ADMIN_CONSOLE_HOST?.trim().toLowerCase();
  return configured && /^[a-z0-9.-]+$/.test(configured)
    ? configured
    : "admin.mycaloraapp.com";
}

export function requestHost(req: Request): string {
  // Express applies the application's configured trusted-proxy policy before
  // deriving hostname. Reading X-Forwarded-Host directly here would let a
  // caller influence this boundary on any path that bypasses the managed edge.
  const raw = req.hostname || req.get("host") || "";
  return raw.trim().toLowerCase().replace(/:\d+$/, "");
}

export function isAdminHost(req: Request): boolean {
  return requestHost(req) === adminConsoleHost();
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

function digest(value: string): string {
  const secret = adminSecret();
  if (!secret) throw new Error("Admin session security is unavailable");
  return createHash("sha256")
    .update(`${secret}:${value}`, "utf8")
    .digest("hex");
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function cookieValue(sessionId: string, token: string): string {
  return `v1.${sessionId}.${token}`;
}

function parsedCookie(
  req: Request,
): { sessionId: string; token: string } | null {
  const cookie = req.headers.cookie ?? "";
  const value = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(`${ADMIN_COOKIE}=`.length);
  if (!value) return null;
  const [version, sessionId, token, extra] = value.split(".");
  if (
    version !== "v1" ||
    extra !== undefined ||
    !/^[0-9a-f-]{36}$/i.test(sessionId ?? "") ||
    !/^[A-Za-z0-9_-]{32,}$/.test(token ?? "")
  ) {
    return null;
  }
  return { sessionId: sessionId!, token: token! };
}

function setSessionCookie(
  res: Response,
  sessionId: string,
  token: string,
): void {
  res.cookie(ADMIN_COOKIE, cookieValue(sessionId, token), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_MS,
  });
}

export function clearAdminSessionCookie(res: Response): void {
  res.clearCookie(ADMIN_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });
}

function roleFromDatabase(value: string): AdminRole | null {
  return (ADMIN_ROLES as readonly string[]).includes(value)
    ? (value as AdminRole)
    : null;
}

export function hasPermission(
  role: AdminRole,
  permission: AdminPermission,
): boolean {
  return ADMIN_ROLE_PERMISSIONS[role].includes(permission);
}

function sameAdminOrigin(req: Request): boolean {
  const origin = req.get("origin");
  if (!origin) return false;
  const expected = `https://${adminConsoleHost()}`;
  return origin === expected;
}

function csrfHeader(req: Request): string {
  const value = req.get("x-calora-admin-csrf") ?? "";
  return /^[A-Za-z0-9_-]{32,}$/.test(value) ? value : "";
}

function sessionFromRow(
  row: SessionRow,
  csrfToken: string,
): AdminSession | null {
  const role = roleFromDatabase(row.role);
  if (!role) return null;
  return {
    id: row.session_id,
    csrfToken,
    expiresAt: row.expires_at,
    reauthUntil: row.reauth_until,
    principal: {
      id: row.principal_id,
      externalUserId: row.external_user_id,
      displayName: row.display_name,
      role,
    },
  };
}

async function readSession(req: Request): Promise<AdminSession | null> {
  const parsed = parsedCookie(req);
  if (!parsed || !adminSecret()) return null;
  const result = await pool.query<SessionRow>(
    `SELECT s.id AS session_id, s.token_digest, s.csrf_digest, s.expires_at,
            s.reauth_until, p.id AS principal_id, p.external_user_id,
            p.display_name, p.role
       FROM calora_admin_sessions s
       INNER JOIN calora_admin_principals p ON p.id = s.principal_id
      WHERE s.id = $1::uuid
        AND s.revoked_at IS NULL
        AND p.revoked_at IS NULL
        AND s.expires_at > now()
      LIMIT 1`,
    [parsed.sessionId],
  );
  const row = result.rows[0];
  if (!row || !safeEqual(row.token_digest, digest(parsed.token))) return null;
  const session = sessionFromRow(row, "");
  if (!session) return null;
  return session;
}

async function enforceAdminRequestRateLimit(
  req: Request,
  res: Response,
): Promise<boolean> {
  const rate = await checkRateLimit(
    `admin:ip:${req.ip || req.socket.remoteAddress || "unknown"}`,
    ADMIN_LOGIN_LIMIT,
    ADMIN_RATE_WINDOW_SECS,
    { failClosed: true },
  );
  if (rate.allowed) return true;
  res.setHeader("Retry-After", String(rate.retryAfterSecs));
  res.status(rate.degraded ? 503 : 429).json({
    message: rate.degraded
      ? "Administrative access is temporarily unavailable."
      : "Too many administrative sign-in attempts. Please wait before trying again.",
  });
  return false;
}

export async function createAdminSession(
  req: Request,
  res: Response,
): Promise<{ session: AdminSession; csrfToken: string } | null> {
  if (!(await enforceAdminRequestRateLimit(req, res))) return null;
  let user: VerifiedUser | null;
  try {
    user = await verifyBearerToken(req);
  } catch {
    res
      .status(503)
      .json({ message: "Administrative access is temporarily unavailable." });
    return null;
  }
  if (!user) {
    res.status(401).json({
      message: "Administrative access is not available for this account.",
    });
    return null;
  }

  const principalResult = await pool.query<{
    id: string;
    external_user_id: string;
    display_name: string;
    role: string;
  }>(
    `SELECT id, external_user_id, display_name, role
       FROM calora_admin_principals
      WHERE external_user_id = $1
        AND revoked_at IS NULL
      LIMIT 1`,
    [user.id],
  );
  const principal = principalResult.rows[0];
  const role = principal ? roleFromDatabase(principal.role) : null;
  if (!principal || !role || !adminSecret()) {
    res.status(403).json({
      message: "Administrative access is not available for this account.",
    });
    return null;
  }

  const token = randomToken();
  const csrfToken = randomToken();
  const sessionResult = await pool.query<{ id: string; expires_at: Date }>(
    `INSERT INTO calora_admin_sessions
       (principal_id, token_digest, csrf_digest, expires_at)
     VALUES ($1::uuid, $2, $3, now() + interval '15 minutes')
     RETURNING id, expires_at`,
    [principal.id, digest(token), digest(csrfToken)],
  );
  const sessionRow = sessionResult.rows[0];
  if (!sessionRow) {
    res
      .status(503)
      .json({ message: "Administrative access is temporarily unavailable." });
    return null;
  }
  setSessionCookie(res, sessionRow.id, token);
  const session: AdminSession = {
    id: sessionRow.id,
    csrfToken,
    expiresAt: sessionRow.expires_at,
    reauthUntil: null,
    principal: {
      id: principal.id,
      externalUserId: principal.external_user_id,
      displayName: principal.display_name,
      role,
    },
  };
  return { session, csrfToken };
}

export async function authenticateAdmin(
  req: Request,
  res: Response,
  permission: AdminPermission,
  options: { mutate?: boolean; reauth?: boolean } = {},
): Promise<AdminSession | null> {
  if (!isAdminHost(req)) {
    res.status(404).end();
    return null;
  }
  let session: AdminSession | null;
  try {
    session = await readSession(req);
  } catch {
    res
      .status(503)
      .json({ message: "Administrative access is temporarily unavailable." });
    return null;
  }
  if (!session) {
    clearAdminSessionCookie(res);
    res
      .status(401)
      .json({ message: "Administrative authentication is required." });
    return null;
  }
  if (!hasPermission(session.principal.role, permission)) {
    res.status(403).json({
      message: "This administrative role is not authorized for that operation.",
    });
    return null;
  }
  if (options.mutate) {
    const parsed = parsedCookie(req);
    const csrf = csrfHeader(req);
    if (!parsed || !csrf || !sameAdminOrigin(req)) {
      res
        .status(403)
        .json({ message: "Administrative request verification failed." });
      return null;
    }
    const result = await pool.query<{ csrf_digest: string }>(
      `SELECT csrf_digest
         FROM calora_admin_sessions
        WHERE id = $1::uuid AND revoked_at IS NULL AND expires_at > now()
        LIMIT 1`,
      [parsed.sessionId],
    );
    if (
      !result.rows[0] ||
      !safeEqual(result.rows[0].csrf_digest, digest(csrf))
    ) {
      res
        .status(403)
        .json({ message: "Administrative request verification failed." });
      return null;
    }
  }
  if (
    options.reauth &&
    (!session.reauthUntil || session.reauthUntil.getTime() <= Date.now())
  ) {
    res
      .status(401)
      .json({ message: "Recent administrator reauthentication is required." });
    return null;
  }
  await pool
    .query(
      "UPDATE calora_admin_sessions SET last_seen_at = now() WHERE id = $1::uuid",
      [session.id],
    )
    .catch(() => undefined);
  return session;
}

export async function rotateAdminCsrf(session: AdminSession): Promise<string> {
  const csrfToken = randomToken();
  await pool.query(
    `UPDATE calora_admin_sessions
        SET csrf_digest = $2
      WHERE id = $1::uuid AND revoked_at IS NULL AND expires_at > now()`,
    [session.id, digest(csrfToken)],
  );
  return csrfToken;
}

export async function reauthenticateAdmin(
  req: Request,
  res: Response,
  session: AdminSession,
): Promise<boolean> {
  let user: VerifiedUser | null;
  try {
    user = await verifyBearerToken(req);
  } catch {
    res.status(503).json({
      message: "Administrative reauthentication is temporarily unavailable.",
    });
    return false;
  }
  if (!user || user.id !== session.principal.externalUserId) {
    res.status(401).json({ message: "Administrator reauthentication failed." });
    return false;
  }
  await pool.query(
    `UPDATE calora_admin_sessions
        SET reauth_until = now() + interval '5 minutes'
      WHERE id = $1::uuid AND principal_id = $2::uuid`,
    [session.id, session.principal.id],
  );
  return true;
}

export async function revokeAdminSession(session: AdminSession): Promise<void> {
  await pool.query(
    `UPDATE calora_admin_sessions
        SET revoked_at = now()
      WHERE id = $1::uuid AND principal_id = $2::uuid`,
    [session.id, session.principal.id],
  );
}

export function publicAdminSession(session: AdminSession) {
  return {
    administrator: {
      displayName: session.principal.displayName,
      role: session.principal.role,
      permissions: ADMIN_ROLE_PERMISSIONS[session.principal.role],
    },
    expiresAt: session.expiresAt.toISOString(),
  };
}
