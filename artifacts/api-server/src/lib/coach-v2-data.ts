import { pool } from "@workspace/db";
import type { PoolClient } from "pg";
import { ensureUserRow } from "./user-rows.js";

export type CoachV2Role = "user" | "assistant";
export type CoachV2Turn = {
  id: string;
  role: CoachV2Role;
  content: string;
  createdAt: string;
};
export type CoachV2Settings = { personalizationEnabled: boolean };
export type CoachV2Snapshot = {
  profile: {
    goal: string;
    activityLevel: string;
    dietPreference: string;
    calorieTarget: number;
  } | null;
  today: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    entries: number;
  };
  recentDaysLogged: number;
  latestWeightKg: number | null;
};

type ConversationRow = { id: string };
type TurnRow = {
  id: string;
  user_message: string;
  assistant_message: string | null;
  created_at: Date;
  completed_at: Date | null;
};

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function resolveCoachV2User(
  externalId: string,
  email: string | null,
): Promise<string> {
  return ensureUserRow(externalId, email);
}

export async function getCoachV2Settings(
  userId: string,
): Promise<CoachV2Settings> {
  const result = await pool.query<{ personalization_enabled: boolean }>(
    `SELECT personalization_enabled
       FROM calora_coach_v2_settings
      WHERE user_id = $1::uuid`,
    [userId],
  );
  return {
    personalizationEnabled: result.rows[0]?.personalization_enabled ?? true,
  };
}

export async function setCoachV2Settings(
  userId: string,
  personalizationEnabled: boolean,
): Promise<CoachV2Settings> {
  await pool.query(
    `INSERT INTO calora_coach_v2_settings (user_id, personalization_enabled, updated_at)
     VALUES ($1::uuid, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       personalization_enabled = EXCLUDED.personalization_enabled,
       updated_at = NOW()`,
    [userId, personalizationEnabled],
  );
  return { personalizationEnabled };
}

async function getOrCreateActiveConversation(
  client: PoolClient,
  userId: string,
): Promise<ConversationRow> {
  const existing = await client.query<ConversationRow>(
    `SELECT id FROM calora_coach_v2_conversations
      WHERE user_id = $1::uuid AND archived_at IS NULL
      LIMIT 1`,
    [userId],
  );
  if (existing.rows[0]) return existing.rows[0];

  const inserted = await client.query<ConversationRow>(
    `INSERT INTO calora_coach_v2_conversations (user_id)
     VALUES ($1::uuid)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [userId],
  );
  if (inserted.rows[0]) return inserted.rows[0];

  const concurrent = await client.query<ConversationRow>(
    `SELECT id FROM calora_coach_v2_conversations
      WHERE user_id = $1::uuid AND archived_at IS NULL
      LIMIT 1`,
    [userId],
  );
  if (!concurrent.rows[0])
    throw new Error("Unable to create Coach conversation");
  return concurrent.rows[0];
}

function rowsToTurns(rows: TurnRow[]): CoachV2Turn[] {
  return rows.flatMap((row) => {
    const createdAt = row.created_at.toISOString();
    const turns: CoachV2Turn[] = [
      {
        id: `${row.id}:user`,
        role: "user",
        content: row.user_message,
        createdAt,
      },
    ];
    if (row.assistant_message && row.completed_at) {
      turns.push({
        id: `${row.id}:assistant`,
        role: "assistant",
        content: row.assistant_message,
        createdAt: row.completed_at.toISOString(),
      });
    }
    return turns;
  });
}

export async function getCoachV2Conversation(
  userId: string,
): Promise<CoachV2Turn[]> {
  const result = await pool.query<TurnRow>(
    `SELECT id, user_message, assistant_message, created_at, completed_at
       FROM calora_coach_v2_turns
      WHERE conversation_id = (
        SELECT id FROM calora_coach_v2_conversations
         WHERE user_id = $1::uuid AND archived_at IS NULL
         LIMIT 1
      )
        AND assistant_message IS NOT NULL
      ORDER BY ordinal DESC
      LIMIT 50`,
    [userId],
  );
  return rowsToTurns(result.rows.reverse());
}

export async function clearCoachV2Conversation(userId: string): Promise<void> {
  await pool.query(
    `DELETE FROM calora_coach_v2_conversations WHERE user_id = $1::uuid`,
    [userId],
  );
}

export async function startCoachV2Turn(
  userId: string,
  message: string,
): Promise<{
  turnId: string;
  conversationId: string;
  history: Array<{ role: CoachV2Role; content: string }>;
}> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const conversation = await getOrCreateActiveConversation(client, userId);
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO calora_coach_v2_turns (conversation_id, ordinal, user_message)
       SELECT $1::uuid, COALESCE(MAX(ordinal), 0) + 1, $2
       FROM calora_coach_v2_turns
       WHERE conversation_id = $1::uuid
       RETURNING id`,
      [conversation.id, message],
    );
    const turnId = inserted.rows[0]?.id;
    if (!turnId) throw new Error("Unable to start Coach turn");
    await client.query(
      `UPDATE calora_coach_v2_conversations SET updated_at = NOW() WHERE id = $1::uuid`,
      [conversation.id],
    );
    const previous = await client.query<TurnRow>(
      `SELECT id, user_message, assistant_message, created_at, completed_at
         FROM calora_coach_v2_turns
        WHERE conversation_id = $1::uuid AND id <> $2::uuid AND assistant_message IS NOT NULL
        ORDER BY ordinal DESC LIMIT 6`,
      [conversation.id, turnId],
    );
    await client.query("COMMIT");
    return {
      turnId,
      conversationId: conversation.id,
      history: [
        ...rowsToTurns(previous.rows.reverse()).map(({ role, content }) => ({
          role,
          content,
        })),
        { role: "user", content: message },
      ],
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function completeCoachV2Turn(
  conversationId: string,
  turnId: string,
  message: string,
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE calora_coach_v2_turns AS turns
        SET assistant_message = $3, completed_at = NOW()
       FROM calora_coach_v2_conversations AS conversations
      WHERE turns.id = $2::uuid
        AND turns.conversation_id = $1::uuid
        AND turns.assistant_message IS NULL
        AND conversations.id = turns.conversation_id
        AND conversations.archived_at IS NULL`,
    [conversationId, turnId, message],
  );
  return result.rowCount === 1;
}

export async function buildCoachV2Snapshot(
  userId: string,
): Promise<CoachV2Snapshot> {
  const [profileResult, todayResult, coverageResult, weightResult] =
    await Promise.all([
      pool.query<{
        goal: string;
        activity_level: string;
        diet_preference: string;
        calorie_target: number;
      }>(
        `SELECT goal, activity_level, diet_preference, calorie_target
         FROM calora_profiles WHERE user_id = $1::uuid LIMIT 1`,
        [userId],
      ),
      pool.query<{
        calories: unknown;
        protein_g: unknown;
        carbs_g: unknown;
        fat_g: unknown;
        entries: unknown;
      }>(
        `SELECT COALESCE(SUM(calories), 0) AS calories,
              COALESCE(SUM(protein_g), 0) AS protein_g,
              COALESCE(SUM(carbs_g), 0) AS carbs_g,
              COALESCE(SUM(fat_g), 0) AS fat_g,
              COUNT(*) AS entries
         FROM calora_diary_entries
        WHERE user_id = $1::uuid AND entry_date = CURRENT_DATE`,
        [userId],
      ),
      pool.query<{ days: unknown }>(
        `SELECT COUNT(DISTINCT entry_date) AS days
         FROM calora_diary_entries
        WHERE user_id = $1::uuid AND entry_date >= CURRENT_DATE - INTERVAL '6 days'`,
        [userId],
      ),
      pool.query<{ weight_kg: unknown }>(
        `SELECT weight_kg FROM calora_weight_entries
        WHERE user_id = $1::uuid
        ORDER BY entry_date DESC, created_at DESC LIMIT 1`,
        [userId],
      ),
    ]);
  const profile = profileResult.rows[0];
  const today = todayResult.rows[0];
  return {
    profile: profile
      ? {
          goal: profile.goal,
          activityLevel: profile.activity_level,
          dietPreference: profile.diet_preference,
          calorieTarget: profile.calorie_target,
        }
      : null,
    today: {
      calories: toFiniteNumber(today?.calories),
      proteinG: toFiniteNumber(today?.protein_g),
      carbsG: toFiniteNumber(today?.carbs_g),
      fatG: toFiniteNumber(today?.fat_g),
      entries: Math.trunc(toFiniteNumber(today?.entries)),
    },
    recentDaysLogged: Math.trunc(toFiniteNumber(coverageResult.rows[0]?.days)),
    latestWeightKg: weightResult.rows[0]
      ? toFiniteNumber(weightResult.rows[0].weight_kg)
      : null,
  };
}
