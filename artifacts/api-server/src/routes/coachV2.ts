import { openai } from "@workspace/integrations-openai-ai-server";
import {
  parseCoachV2ChatInput,
  parseCoachV2SettingsInput,
} from "@workspace/api-zod/coach-v2";
import { normalizeCoachAssistantReply } from "@workspace/api-zod/coach-text-presentation";
import { pool } from "@workspace/db";
import { Router, type IRouter, type Request, type Response } from "express";
import { withAiProviderDeadline } from "../lib/ai-provider.js";
import {
  buildCoachV2Snapshot,
  clearCoachV2Conversation,
  completeCoachV2Turn,
  getCoachV2Conversation,
  getCoachV2Settings,
  listCoachV2Conversations,
  openCoachV2Conversation,
  resolveCoachV2User,
  setCoachV2Settings,
  startNewCoachV2Conversation,
  startCoachV2Turn,
  type CoachV2Role,
  type CoachV2Snapshot,
} from "../lib/coach-v2-data.js";
import {
  accountDeletionFenceSignal,
  assertAccountWritable,
  classifyAccountDeletionError,
} from "../lib/account-deletion-state.js";
import { logger } from "../lib/logger.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import { verifyBearerToken, type VerifiedUser } from "../lib/supabase-auth.js";

const router: IRouter = Router();
const COACH_V2_ACCOUNT_RATE_LIMIT = 30;
const COACH_V2_GUEST_RATE_LIMIT = 12;
const COACH_V2_RATE_WINDOW_SECS = 60 * 60;
const COACH_V2_PROVIDER_TIMEOUT_MS = process.env.OPENAI_TIMEOUT_MS_OVERRIDE
  ? Number(process.env.OPENAI_TIMEOUT_MS_OVERRIDE)
  : 15_000;
const COACH_V2_PROVIDER_FAILURE =
  "Coach is temporarily unavailable. Please try again shortly.";

type ProviderMessage = { role: "user" | "assistant"; content: string };

function canonicalizeIp(req: Request): string {
  const value = req.ip || req.socket.remoteAddress || "unknown";
  const mappedIpv4 = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1];
  return mappedIpv4 ?? value;
}

function isSafeProviderReply(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 4000
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
function snapshotForPrompt(snapshot: CoachV2Snapshot | null): string {
  if (!snapshot) {
    return "No signed-in app snapshot is available. Do not claim to know the user's logs, profile, plans, or history.";
  }
  return JSON.stringify({
    profile: snapshot.profile
      ? { ...snapshot.profile, calorieTarget: Math.round(snapshot.profile.calorieTarget) }
      : null,
    today: {
      ...snapshot.today,
      calories: Math.round(snapshot.today.calories),
      proteinG: Math.round(snapshot.today.proteinG),
      carbsG: Math.round(snapshot.today.carbsG),
      fatG: Math.round(snapshot.today.fatG),
    },
    recentDaysLogged: snapshot.recentDaysLogged,
    latestWeightKg: snapshot.latestWeightKg === null ? null : Math.round(snapshot.latestWeightKg),
  });
}

export function buildCoachV2Messages(input: {
  history: Array<{ role: CoachV2Role; content: string }>;
  snapshot: CoachV2Snapshot | null;
}): ProviderMessage[] {
  return [
    {
      role: "user",
      content: [
        "You are Calora Coach, a supportive general wellness and app-navigation assistant.",
        "Give concise, practical responses. You are not medical care: do not diagnose, prescribe, or provide emergency advice. Encourage qualified help for symptoms, eating-disorder concerns, pregnancy-specific questions, medication decisions, or emergencies.",
        "For signed-in users, use only the bounded server snapshot below. Never claim access to food names, notes, images, raw timelines, account identifiers, complete history, health-provider data, or any data that the snapshot does not contain.",
        "If the snapshot has no data, say so plainly. Do not invent meals, targets, nutrients, hydration, plans, or trends.",
        "You can explain Calora's local features generally, but do not imply an action was completed unless the user completed it in the app.",
        "Use whole numbers for nutrition, calories, health, weight, hydration, and percentage measurements in every response.",
        `SERVER_OWNED_SNAPSHOT: ${snapshotForPrompt(input.snapshot)}`,
      ].join("\n"),
    },
    ...input.history.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

async function optionalVerifiedUser(
  req: Request,
): Promise<VerifiedUser | null> {
  try {
    return await verifyBearerToken(req);
  } catch (error) {
    // An unconfigured verifier must not turn a guest-only Coach session into a
    // privileged path. Requests carrying a bearer token get an explicit server
    // failure instead of silently falling back to guest.
    if (req.headers.authorization) throw error;
    return null;
  }
}

async function withAccountDeletionReadLock<T>(
  externalUserId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  const lockKey = `calora-account-deletion:${externalUserId}`;
  try {
    await client.query(
      "SELECT pg_advisory_lock_shared(hashtextextended($1, 0))",
      [lockKey],
    );
    await assertAccountWritable(externalUserId);
    return await operation();
  } finally {
    await client
      .query("SELECT pg_advisory_unlock_shared(hashtextextended($1, 0))", [
        lockKey,
      ])
      .catch(() => undefined);
    client.release();
  }
}

async function enforceCoachV2RateLimit(
  key: string,
  limit: number,
  res: Response,
  accountRoute: boolean,
): Promise<boolean> {
  const rate = await checkRateLimit(key, limit, COACH_V2_RATE_WINDOW_SECS, {
    failClosed: true,
    rethrowAccountDeletionFence: accountRoute,
  });
  if (rate.allowed) return true;
  res.setHeader("Retry-After", String(rate.retryAfterSecs));
  res.status(rate.degraded ? 503 : 429).json({
    message: rate.degraded
      ? COACH_V2_PROVIDER_FAILURE
      : "Too many Coach messages. Please wait before trying again.",
    retryAfterSecs: rate.retryAfterSecs,
  });
  return false;
}

async function requestCoachReply(
  history: ProviderMessage[],
  snapshot: CoachV2Snapshot | null,
): Promise<string> {
  const completion = await withAiProviderDeadline(
    (signal) =>
      openai.chat.completions.create(
        {
          model: "gpt-5.4-mini",
          max_completion_tokens: 700,
          messages: buildCoachV2Messages({ history, snapshot }),
        },
        { signal },
      ),
    COACH_V2_PROVIDER_TIMEOUT_MS,
  );
  const reply = completion.choices[0]?.message?.content;
  if (!isSafeProviderReply(reply))
    throw new Error("Coach provider returned an invalid response");
  const normalized = normalizeCoachAssistantReply(reply);
  if (!normalized)
    throw new Error("Coach provider returned an invalid response");
  return normalized;
}

router.post("/v1/coach/v2/chat", async (req, res) => {
  const input = parseCoachV2ChatInput(req.body);
  if (!input) {
    res.status(400).json({
      message: "A Coach message between 1 and 1200 characters is required.",
    });
    return;
  }

  let verified: VerifiedUser | null;
  try {
    verified = await optionalVerifiedUser(req);
  } catch (error) {
    logger.error({ err: error }, "Coach authentication verifier unavailable");
    res.status(503).json({ message: COACH_V2_PROVIDER_FAILURE });
    return;
  }

  try {
    if (!verified) {
      const allowed = await enforceCoachV2RateLimit(
        `coach-v2:guest:${canonicalizeIp(req)}`,
        COACH_V2_GUEST_RATE_LIMIT,
        res,
        false,
      );
      if (!allowed) return;
      const message = await requestCoachReply(
        [{ role: "user", content: input.message }],
        null,
      );
      res.json({
        message,
        conversationMode: "guest",
        persisted: false,
        safetyNotice: "wellness_not_medical_care",
      });
      return;
    }

    const allowed = await enforceCoachV2RateLimit(
      `coach-v2:user:${verified.id}`,
      COACH_V2_ACCOUNT_RATE_LIMIT,
      res,
      true,
    );
    if (!allowed) return;

    const response = await withAccountDeletionReadLock(
      verified.id,
      async () => {
        const userId = await resolveCoachV2User(verified.id, verified.email);
        const settings = await getCoachV2Settings(userId);
        const turn = await startCoachV2Turn(userId, input.message);
        const snapshot = settings.personalizationEnabled
          ? await buildCoachV2Snapshot(userId)
          : null;
        try {
          const message = await requestCoachReply(turn.history, snapshot);
          await completeCoachV2Turn(turn.conversationId, turn.turnId, message);
          return { message, ok: true };
        } catch (error) {
          logger.error({ err: error }, "Coach provider request failed");
          await completeCoachV2Turn(
            turn.conversationId,
            turn.turnId,
            COACH_V2_PROVIDER_FAILURE,
          );
          return { message: COACH_V2_PROVIDER_FAILURE, ok: false };
        }
      },
    );

    if (!response.ok) {
      res.status(503).json({ message: response.message });
      return;
    }
    res.json({
      message: response.message,
      conversationMode: "account",
      persisted: true,
      safetyNotice: "wellness_not_medical_care",
    });
  } catch (error) {
    if (classifyAccountDeletionError(error)) {
      logger.warn(
        accountDeletionFenceSignal("/v1/coach/v2/chat"),
        "Account deletion fence rejected Coach request",
      );
      res.status(503).json({ message: COACH_V2_PROVIDER_FAILURE });
      return;
    }
    logger.error({ err: error }, "Coach V2 request failed");
    res.status(503).json({ message: COACH_V2_PROVIDER_FAILURE });
  }
});

router.get("/v1/coach/v2/conversation", async (req, res) => {
  const verified = await optionalVerifiedUser(req).catch(() => null);
  if (!verified) {
    res
      .status(401)
      .json({ message: "Please sign in to view your Coach history." });
    return;
  }
  try {
    const userId = await resolveCoachV2User(verified.id, verified.email);
    const [turns, settings] = await Promise.all([
      getCoachV2Conversation(userId),
      getCoachV2Settings(userId),
    ]);
    res.json({
      turns,
      personalizationEnabled: settings.personalizationEnabled,
    });
  } catch (error) {
    logger.error({ err: error }, "Unable to read Coach V2 conversation");
    res.status(503).json({ message: COACH_V2_PROVIDER_FAILURE });
  }
});

router.delete("/v1/coach/v2/conversation", async (req, res) => {
  const verified = await optionalVerifiedUser(req).catch(() => null);
  if (!verified) {
    res
      .status(401)
      .json({ message: "Please sign in to clear your Coach history." });
    return;
  }
  try {
    await withAccountDeletionReadLock(verified.id, async () => {
      const userId = await resolveCoachV2User(verified.id, verified.email);
      await clearCoachV2Conversation(userId);
    });
    res.status(204).send();
  } catch (error) {
    logger.error({ err: error }, "Unable to clear Coach V2 conversation");
    res.status(503).json({ message: COACH_V2_PROVIDER_FAILURE });
  }
});

router.get("/v1/coach/v2/conversations", async (req, res) => {
  const verified = await optionalVerifiedUser(req).catch(() => null);
  if (!verified) {
    res
      .status(401)
      .json({ message: "Please sign in to view saved Coach chats." });
    return;
  }
  try {
    const userId = await resolveCoachV2User(verified.id, verified.email);
    res.json({ conversations: await listCoachV2Conversations(userId) });
  } catch (error) {
    logger.error({ err: error }, "Unable to list Coach V2 conversations");
    res.status(503).json({ message: COACH_V2_PROVIDER_FAILURE });
  }
});

router.post("/v1/coach/v2/conversation/new", async (req, res) => {
  const verified = await optionalVerifiedUser(req).catch(() => null);
  if (!verified) {
    res
      .status(401)
      .json({ message: "Please sign in to start a saved Coach chat." });
    return;
  }
  try {
    const started = await withAccountDeletionReadLock(verified.id, async () => {
      const userId = await resolveCoachV2User(verified.id, verified.email);
      return startNewCoachV2Conversation(userId);
    });
    if (!started) {
      res
        .status(409)
        .json({ message: "Please wait for Coach to finish replying." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    logger.error({ err: error }, "Unable to start a new Coach V2 conversation");
    res.status(503).json({ message: COACH_V2_PROVIDER_FAILURE });
  }
});

router.post(
  "/v1/coach/v2/conversation/:conversationId/open",
  async (req, res) => {
    const conversationId = req.params.conversationId;
    if (!isUuid(conversationId)) {
      res
        .status(400)
        .json({ message: "A valid Coach conversation is required." });
      return;
    }
    const verified = await optionalVerifiedUser(req).catch(() => null);
    if (!verified) {
      res
        .status(401)
        .json({ message: "Please sign in to open a saved Coach chat." });
      return;
    }
    try {
      const conversation = await withAccountDeletionReadLock(
        verified.id,
        async () => {
          const userId = await resolveCoachV2User(verified.id, verified.email);
          const opened = await openCoachV2Conversation(userId, conversationId);
          if (!opened) return null;
          const [turns, settings] = await Promise.all([
            getCoachV2Conversation(userId),
            getCoachV2Settings(userId),
          ]);
          return {
            turns,
            personalizationEnabled: settings.personalizationEnabled,
          };
        },
      );
      if (!conversation) {
        res
          .status(409)
          .json({ message: "That Coach chat cannot be opened right now." });
        return;
      }
      res.json(conversation);
    } catch (error) {
      logger.error({ err: error }, "Unable to open Coach V2 conversation");
      res.status(503).json({ message: COACH_V2_PROVIDER_FAILURE });
    }
  },
);

router.get("/v1/coach/v2/settings", async (req, res) => {
  const verified = await optionalVerifiedUser(req).catch(() => null);
  if (!verified) {
    res.status(401).json({ message: "Please sign in to view Coach settings." });
    return;
  }
  try {
    const userId = await resolveCoachV2User(verified.id, verified.email);
    res.json(await getCoachV2Settings(userId));
  } catch (error) {
    logger.error({ err: error }, "Unable to read Coach V2 settings");
    res.status(503).json({ message: COACH_V2_PROVIDER_FAILURE });
  }
});

router.put("/v1/coach/v2/settings", async (req, res) => {
  const input = parseCoachV2SettingsInput(req.body);
  if (!input) {
    res.status(400).json({ message: "A valid Coach setting is required." });
    return;
  }
  const verified = await optionalVerifiedUser(req).catch(() => null);
  if (!verified) {
    res
      .status(401)
      .json({ message: "Please sign in to update Coach settings." });
    return;
  }
  try {
    const settings = await withAccountDeletionReadLock(
      verified.id,
      async () => {
        const userId = await resolveCoachV2User(verified.id, verified.email);
        return setCoachV2Settings(userId, input.personalizationEnabled);
      },
    );
    res.json(settings);
  } catch (error) {
    logger.error({ err: error }, "Unable to update Coach V2 settings");
    res.status(503).json({ message: COACH_V2_PROVIDER_FAILURE });
  }
});

export default router;
