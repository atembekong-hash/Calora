import {
  GetCoachV2ConversationResponse,
  GetCoachV2SettingsResponse,
  SendCoachV2MessageBody,
  SendCoachV2MessageResponse,
  UpdateCoachV2SettingsBody,
  UpdateCoachV2SettingsResponse,
} from "./generated/api";

export type ParsedCoachV2ChatInput = {
  message: string;
};

export type ParsedCoachV2SettingsInput = {
  personalizationEnabled: boolean;
};

export function parseCoachV2ChatInput(
  value: unknown,
): ParsedCoachV2ChatInput | null {
  const parsed = SendCoachV2MessageBody.safeParse(value);
  if (!parsed.success) return null;
  const message = parsed.data.message.trim();
  return message ? { message } : null;
}

export function parseCoachV2SettingsInput(
  value: unknown,
): ParsedCoachV2SettingsInput | null {
  const parsed = UpdateCoachV2SettingsBody.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const CoachV2ChatResponseSchema = SendCoachV2MessageResponse;
export const CoachV2ConversationSchema = GetCoachV2ConversationResponse;
export const CoachV2SettingsSchema = GetCoachV2SettingsResponse;
export const CoachV2UpdatedSettingsSchema = UpdateCoachV2SettingsResponse;
