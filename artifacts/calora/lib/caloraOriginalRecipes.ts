import type { CaloraRecipe } from '@/context/CaloraContext';
import { plannerCatalog } from '@/data/planner';

/**
 * Planner meals are also first-class recipes. Keeping this projection next to
 * the shared planner catalog gives both surfaces the same stable identity,
 * ingredients, and nutrition values without creating a second recipe source.
 */
export const caloraOriginalRecipes: CaloraRecipe[] = plannerCatalog.map((meal) => ({
  id: `calora-original:${meal.id}`,
  name: meal.name,
  image: meal.image,
  category: meal.meal,
  area: 'Calora',
  description: meal.description,
  instructions: null,
  ingredients: meal.ingredients,
  tags: ['Calora original', meal.meal],
  prepMinutes: meal.prepMinutes,
  servings: 1,
  calories: meal.calories,
  proteinG: meal.proteinG,
  carbsG: meal.carbsG,
  fatG: meal.fatG,
  source: 'Calora',
  sourceUrl: '',
  isLocal: false,
  sourceType: 'calora_catalog',
  sourceProvider: 'Calora',
  sourceId: meal.id,
  nutritionConfidence: 'estimated',
  nutritionSource: 'Calora planner nutrition',
}));