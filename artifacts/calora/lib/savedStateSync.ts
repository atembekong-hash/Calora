import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/lib/api-config';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/withTimeout';
import type { SavedMeal } from '@/context/CaloraContext';

export type SavedState = {
  savedMeals: SavedMeal[];
  savedRecipeIds: string[];
  deletedMealIds: string[];
  deletedRecipeIds: string[];
  clientUpdatedAt: string;
};
export const SAVED_STATE_TOMBSTONE_PREFIX = 'calora.saved-state.tombstones.v1:';
export type SavedStateTombstones = { mealIds: string[]; recipeIds: string[] };

export async function readSavedStateTombstones(accountId: string): Promise<SavedStateTombstones> {
  const raw = await AsyncStorage.getItem(`${SAVED_STATE_TOMBSTONE_PREFIX}${accountId}`);
  if (!raw) return { mealIds: [], recipeIds: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<SavedStateTombstones>;
    return { mealIds: Array.isArray(parsed.mealIds) ? parsed.mealIds : [], recipeIds: Array.isArray(parsed.recipeIds) ? parsed.recipeIds : [] };
  } catch { return { mealIds: [], recipeIds: [] }; }
}
export async function writeSavedStateTombstones(accountId: string, value: SavedStateTombstones): Promise<void> {
  await AsyncStorage.setItem(`${SAVED_STATE_TOMBSTONE_PREFIX}${accountId}`, JSON.stringify({ mealIds: [...new Set(value.mealIds)], recipeIds: [...new Set(value.recipeIds)] }));
}
async function request(accountId: string, accessToken: string, init: RequestInit): Promise<unknown> {
  const session = await withTimeout(supabase.auth.getSession(), 12000, 'Saved-state session read');
  if (session.data.session?.user.id !== accountId || session.data.session.access_token !== accessToken) throw new Error('Saved-state account changed.');
  const response = await withTimeout(fetch(`${getApiBaseUrl()}/api/v1/saved-state`, { ...init, headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(init.headers ?? {}) } }), 12000, 'Saved-state request');
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Saved-state sync failed.');
  return body;
}
export async function fetchSavedState(accountId: string, accessToken: string): Promise<{ savedMeals: SavedMeal[]; savedRecipeIds: string[]; updatedAt: string }> {
  return (await request(accountId, accessToken, { method: 'GET' })) as { savedMeals: SavedMeal[]; savedRecipeIds: string[]; updatedAt: string };
}
export async function pushSavedState(accountId: string, accessToken: string, state: SavedState): Promise<{ savedMeals: SavedMeal[]; savedRecipeIds: string[]; updatedAt: string }> {
  return (await request(accountId, accessToken, { method: 'PUT', body: JSON.stringify(state) })) as { savedMeals: SavedMeal[]; savedRecipeIds: string[]; updatedAt: string };
}
