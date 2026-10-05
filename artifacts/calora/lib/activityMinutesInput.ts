import { parseWholeNumberInput } from './formatters';

export const INVALID_ACTIVITY_MINUTES_MESSAGE = 'Enter a whole number of active minutes.';

export type ActivityMinutesInputDecision =
  | { kind: 'save'; minutes: number }
  | { kind: 'clear' }
  | { kind: 'invalid'; message: string }
  | { kind: 'noop' };

/**
 * Resolves the editable active-minutes field without silently converting or
 * discarding a user's numeric intent. The caller owns the actual persistence
 * mutation and the visible feedback.
 */
export function resolveActivityMinutesInput(
  input: string,
  hasSavedValue: boolean,
): ActivityMinutesInputDecision {
  const minutes = parseWholeNumberInput(input);
  if (minutes !== null) return { kind: 'save', minutes };

  if (input.trim() === '') return hasSavedValue ? { kind: 'clear' } : { kind: 'noop' };

  return { kind: 'invalid', message: INVALID_ACTIVITY_MINUTES_MESSAGE };
}
