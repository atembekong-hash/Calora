import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCalora, type SavedMeal } from '@/context/CaloraContext';
import { fetchSavedState, pushSavedState, readSavedStateTombstones, writeSavedStateTombstones } from '@/lib/savedStateSync';

export function useSavedStateSync() {
  const { user, session } = useAuth();
  const { savedMeals, savedRecipeIds, hydrated, applySyncedSavedState } = useCalora();
  const [generation, setGeneration] = useState(0);
  const running = useRef(false);
  const lastScope = useRef<string | null>(null);
  const mealsRef = useRef(savedMeals);
  const recipesRef = useRef(savedRecipeIds);
  const previousMealsRef = useRef(savedMeals);
  const previousRecipesRef = useRef(savedRecipeIds);
  mealsRef.current = savedMeals;
  recipesRef.current = savedRecipeIds;
  useEffect(() => {
    if (!user || !session?.access_token || !hydrated || running.current) return;
    const accountId = user.id;
    const token = session.access_token;
    const scope = `${accountId}:${token}`;
    if (lastScope.current === scope && generation === 0) return;
    running.current = true;
    let active = true;
    const run = async () => {
      try {
        const tombstones = await readSavedStateTombstones(accountId);
        const remote = await fetchSavedState(accountId, token);
        if (!active) return;
        const deletedMeals = new Set(tombstones.mealIds);
        const deletedRecipes = new Set(tombstones.recipeIds);
        const mergedMeals = new Map<string, SavedMeal>(remote.savedMeals.filter((m) => !deletedMeals.has(m.id)).map((m) => [m.id, m]));
        for (const meal of mealsRef.current) if (!deletedMeals.has(meal.id)) mergedMeals.set(meal.id, meal);
        const mergedRecipes = new Set(remote.savedRecipeIds.filter((id) => !deletedRecipes.has(id)));
        for (const id of recipesRef.current) if (!deletedRecipes.has(id)) mergedRecipes.add(id);
        applySyncedSavedState([...mergedMeals.values()], [...mergedRecipes]);
        lastScope.current = scope;
        await pushSavedState(accountId, token, {
          savedMeals: [...mergedMeals.values()], savedRecipeIds: [...mergedRecipes],
          deletedMealIds: tombstones.mealIds, deletedRecipeIds: tombstones.recipeIds,
          clientUpdatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('[saved-state-sync] deferred:', error);
        if (active) setTimeout(() => setGeneration((value) => value + 1), 5000);
      } finally { running.current = false; }
    };
    void run();
    return () => { active = false; };
  }, [user?.id, session?.access_token, hydrated, generation, applySyncedSavedState]);
  useEffect(() => {
    if (!user || !session?.access_token || !hydrated || !lastScope.current) return;
    const accountId = user.id;
    const previousMeals = previousMealsRef.current;
    const currentMealIds = new Set(savedMeals.map((meal) => meal.id));
    const removedMeals = previousMeals.filter((meal) => !currentMealIds.has(meal.id)).map((meal) => meal.id);
    const previousRecipeIds = previousRecipesRef.current;
    const currentRecipeIds = new Set(savedRecipeIds);
    const removedRecipes = previousRecipeIds.filter((id) => !currentRecipeIds.has(id));
    previousMealsRef.current = savedMeals;
    previousRecipesRef.current = savedRecipeIds;
    let cancelled = false;
    void readSavedStateTombstones(accountId)
      .then(async (tombstones) => {
        const nextTombstones = { mealIds: [...tombstones.mealIds, ...removedMeals], recipeIds: [...tombstones.recipeIds, ...removedRecipes] };
        await writeSavedStateTombstones(accountId, nextTombstones);
        if (cancelled || !session?.access_token) return;
        await pushSavedState(accountId, session.access_token, {
          savedMeals,
          savedRecipeIds,
          deletedMealIds: nextTombstones.mealIds,
          deletedRecipeIds: nextTombstones.recipeIds,
          clientUpdatedAt: new Date().toISOString(),
        });
      })
      .catch((error) => console.warn('[saved-state-sync] push deferred:', error));
    return () => { cancelled = true; };
  }, [savedMeals, savedRecipeIds, user?.id, session?.access_token, hydrated]);
}
