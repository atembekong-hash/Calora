import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Recipes Discover layout contracts', () => {
  it('gives every recipe-creation starting point a visible option tray', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain("const CREATOR_STYLE_OPTIONS = ['Balanced', 'High protein', 'Vegetarian', 'Vegan', 'Quick & light']");
    expect(source).toContain("const CREATOR_SURPRISE_OPTIONS = ['Fresh & light', 'Comforting', 'High protein', 'Pantry-friendly']");
    expect(source).toContain("GUEST_INGREDIENT_OPTIONS = ['Eggs', 'Chicken', 'Lentils'");
    expect(source).toContain("Choose ingredients");
    expect(source).toContain("Start with a prompt");
    expect(source).toContain("Pick the kind of surprise");
    expect(source).toContain("Selected ingredients");
    expect(source).toContain("const pantryIngredients = [ingredients, ingredientDraft].filter(Boolean).join(', ')");
    expect(source).toContain("accessibilityLabel={`Choose ${option} prompt`}");
  });

  it('reduces the Discover hero widget by 40% while preserving its content layer', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('recipeHeader: { height: 114');
    expect(source).toContain('recipeHeaderContent: { height: 114');
    expect(source).toContain('paddingBottom: 14, justifyContent: \'flex-end\'');
  });

  it('labels the premium section as Plus without changing its internal section key', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain("section === 'premium' ? 'Plus'");
    expect(source).toContain('Search Plus recipes');
    expect(source).toContain('Plus filters');
    expect(source).toContain('Calora Plus membership');
  });

  it('exposes a dedicated saved-recipes header action', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('title="Recipes"');
    expect(source).toContain('testID="saved-recipes-header-button"');
    expect(source).toContain("router.push('/saved-recipes')");
    expect(source).not.toContain('Create personalized recipe ideas');
  });

  it('recovers failed remote recipe photos without allowing recycled rows to keep stale imagery', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('const [imageFailed, setImageFailed] = useState(false)');
    expect(source).toContain('onError={() => setImageFailed(true)}');
    expect(source).toContain('recyclingKey={`${recipe.id}:${recipe.image}`}');
    expect(source).toContain('setImageFailed(false)');
  });

  it('keeps source attribution inside opened recipe details and prevents AI card labels from overlapping', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('cardImageFrame');
    expect(source).toContain('const localLabel = provenance.sourceType === \'calora_ai\' ? \'CALORA AI\' : \'MY RECIPE\'');
    expect(source).not.toContain('{recipeSourceLabel(recipe)}</Text>');
    expect(source).not.toContain('Open recipe discovery is provided by TheMealDB');
    expect(source).toContain('Source: {sourceName}');
  });

  it('uses the shared source-free compact card in the Plus catalogue', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('savedRecipes.map((recipe) => (');
    expect(source).toContain('recipes.map((recipe) => (');
    expect(source).not.toContain('{recipeSourceLabel(recipe)}</Text>');
  });

  it('keeps Discover and Plus grid cards fixed while giving the photo more height', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('const GRID_RECIPE_CARD_HEIGHT = 224');
    expect(source).toContain('const GRID_RECIPE_IMAGE_HEIGHT = 140');
    expect(source).toContain('imageHeight={GRID_RECIPE_IMAGE_HEIGHT} fixedHeight={GRID_RECIPE_CARD_HEIGHT} compact');
    expect(source).toContain('compactCardContent');
    expect(source).toContain('compactCardFooter');
  });

  it('keeps Plus cards mounted while pagination loads, retries failures, and deduplicates appended pages', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('placeholderData: offset > 0 ? (previousData) => previousData : undefined');
    expect(source).toContain('const recipes = loadedRecipes');
    expect(source).toContain('data.recipes : [...current, ...data.recipes.filter((recipe) => !current.some((item) => item.id === recipe.id))]');
    expect(source).toContain('testID="plus-recipe-grid"');
    expect(source).toContain('testID="plus-recipe-pagination-loading"');
    expect(source).toContain('testID="plus-recipe-pagination-error"');
    expect(source).toContain('testID="plus-recipe-pagination-retry"');
    expect(source).toContain('query.isError && recipes.length > 0');
    expect(source).toContain('onPress={() => query.refetch()}');
    expect(source).toContain('if (data?.nextOffset == null || query.isFetching || loadingMoreRef.current) return;');
    expect(source).toContain('onMomentumScrollEnd={handleRecipeScroll}');
    expect(source).toContain('recipesScrollRef.current?.scrollTo({ y: section === \'discover\' ? discoverScrollYRef.current : 0, animated: false })');
  });
});