import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
  'utf8',
);

describe('Recipes Discover layout contracts', () => {
  it('keeps adjacent section panes directly under the gesture track', () => {
    expect(source).toContain('testID="recipes-section-content"');
    expect(source).toContain('renderItem={renderRecipeSection}');
    expect(source).toContain('renderWindow={1}');
    expect(source).toContain('nativePaging');
    expect(source).toContain('fillViewport');
    expect(source).not.toContain('disableAnimation');
  });

  it('keeps Recipes tab presses outside the horizontal pan responder', () => {
    const tabStart = source.indexOf('testID="recipes-section-tabs"');
    const tabSurface = source.slice(Math.max(0, tabStart - 600), tabStart + 1_000);

    expect(tabStart).toBeGreaterThan(-1);
    expect(source).toContain("import { SwipeGestureExclusion, SwipeMenuHighlight, SwipeMenuHighlightProvider, SwipeableSectionPager } from '@/components/SwipeableTabList'");
    expect(source).not.toContain('<SwipeableTabList');
    expect(tabSurface).toContain('accessibilityRole="tablist"');
    expect(tabSurface).toContain('onPress={() => changeSection(section)}');
  });

  it('removes nonessential motion from Discover, Plus, and Create surfaces', () => {
    expect(source).not.toContain('FadeInDown');
    expect(source).toContain('transition={0}');
    expect(source).toContain('animationType="none"');
    expect(source).toContain('const mountedRef = useRef(true)');
    expect(source).toContain('abortRef.current?.abort();');
  });

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

  it('omits an empty optional request so pantry ingredients reach the authenticated concept API', () => {
    expect(source).toContain('const optionalRequest = generatedRequest.trim();');
    expect(source).toContain('...(optionalRequest ? { request: optionalRequest } : {}),');
    expect(source).not.toContain('request: generatedRequest,');
  });

  it('removes the Discover cookbook widget and ingredient-search guidance while preserving search and categories', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).not.toContain('THE {BRAND.name.toUpperCase()} COOKBOOK');
    expect(source).not.toContain('RECIPES YOU CAN TRUST');
    expect(source).not.toContain('Find a recipe for your next meal.');
    expect(source).not.toContain('For ingredient matches, separate up to four ingredients with commas.');
    expect(source).not.toContain('useHourlyHeaderImage');
    expect(source).toContain('accessibilityLabel="Search recipes"');
    expect(source).toContain('accessibilityLabel={`Recipe category ${item}`}');
  });

  it('labels the premium section as Plus and never presents a paid recipe gate', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain("section === 'premium' ? 'Plus'");
    expect(source).toContain('Search Plus recipes');
    expect(source).toContain('Plus filters');
    expect(source).not.toContain('Plus required');
    expect(source).not.toContain('active Calora Plus membership');
    expect(source).not.toContain('View membership');
    expect(source).not.toContain('Plus membership needed');
    expect(source).not.toContain('membershipRequired');
  });

  it('removes goal-fit and Calora-original badges without leaving badge containers', () => {
    expect(source).not.toContain('FITS YOUR GOAL');
    expect(source).not.toContain('CALORA ORIGINAL');
    expect(source).not.toContain('fitsBadge');
    expect(source).not.toContain('localBadge');
    expect(source).not.toContain('remainingCalories');
  });

  it('exposes a dedicated saved-recipes header action', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('title="Recipes"');
    expect(source).toContain('testID="saved-recipes-header-button"');
    expect(source).toContain("router.push('/saved-recipes')");
    expect(source).toContain('testID="shopping-list-header-button"');
    expect(source).toContain('Open shopping list');
    expect(source).toContain('<ShoppingListSheet');
    expect(source).not.toContain('Create personalized recipe ideas');
  });

  it('keeps the Discover saved-recipe rail independently swipeable inside the vertical pane on native', () => {
    const savedStart = source.indexOf('Saved recipes');
    const savedRailEnd = source.indexOf('</SwipeGestureExclusion>', savedStart);
    const savedRail = source.slice(savedStart, savedRailEnd);
    expect(savedStart).toBeGreaterThan(-1);
    expect(savedRail).toContain('<ScrollView horizontal nestedScrollEnabled directionalLockEnabled');
  });

  it('recovers failed remote recipe photos without allowing recycled rows to keep stale imagery', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('const [imageFailed, setImageFailed] = useState(false)');
    expect(source).toContain('onError={() => {');
    expect(source).toContain('if (!localRecipe || !acceptedGeneratedImage) {');
    expect(source).toContain('handleGeneratedRecipeImageError({');
    expect(source).toContain("import { normalizeGeneratedRecipeImageUrl } from '@/lib/foodImageMetadata'");
    expect(source).toContain('normalizeGeneratedRecipeImageUrl(localRecipe?.image, localRecipe?.imageId, user?.id)');
    expect(source).toContain('inspectDiscoverRecipeImage(recipe)');
    expect(source).toContain('imagePreviewUrl: null');
    expect(source).toContain('recyclingKey={`${recipe.id}:${recipeImageKey}:${imageRetryNonce}`}');
    expect(source).toContain('setImageFailed(false)');
  });

  it('keeps the selected Plus card image when its matching detail payload omits a photo', () => {
    expect(source).toContain("import { resolvePremiumRecipeDetailImage } from '@/lib/premiumRecipeDetailImage'");
    expect(source).toContain('const selectedPremiumRecipe = premium && recipe ? recipe as PremiumRecipe : null;');
    expect(source).toContain('resolvePremiumRecipeDetailImage(premiumDetailQuery.data, selectedPremiumRecipe)');
  });

  it('keeps third-party source attribution inside opened recipe details without card badges', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('cardImageFrame');
    expect(source).not.toContain('const localLabel');
    expect(source).not.toContain('const sourceBadge');
    expect(source).not.toContain('{recipeSourceLabel(recipe)}</Text>');
    expect(source).not.toContain('Open recipe discovery is provided by TheMealDB');
    expect(source).toContain('Source: {sourceName}');
  });

  it('hides the View original link for Discover recipes while preserving attribution', () => {
    expect(source).toContain("sourceUrl && provenance.sourceType !== 'open'");
    expect(source).toContain('Source: {sourceName}');
  });

  it('renders up to forty related recipes in two independently swipeable twenty-card rows', () => {
    expect(source).toContain('const RECIPE_SUGGESTION_ROW_COUNT = 2');
    expect(source).toContain('const RECIPE_SUGGESTIONS_PER_ROW = 20');
    expect(source).toContain('const RECIPE_SUGGESTION_LIMIT = RECIPE_SUGGESTION_ROW_COUNT * RECIPE_SUGGESTIONS_PER_ROW');
    expect(source).toContain('suggestedRecipes.slice(');
    expect(source).toContain('rowIndex * RECIPE_SUGGESTIONS_PER_ROW');
    expect(source).toContain('(rowIndex + 1) * RECIPE_SUGGESTIONS_PER_ROW');
    expect(source).toContain('testID={`recipe-suggestions-row-${rowIndex + 1}`}');
    expect(source).toContain('accessibilityLabel={`Recipe suggestions row ${rowIndex + 1} of ${suggestionRows.length}`}');
    expect(source).toContain('const allOpenRecipeSuggestions = useMemo(');
    expect(source).toContain('() => [...localRecipes, ...caloraOriginalRecipes, ...freshRemoteRecipes]');
  });

  it('loads extra Plus pages only after a Plus recipe needs a complete suggestion pool', () => {
    expect(source).toContain('suggestionMinimumRecipeCount = 0');
    expect(source).toContain('mergeRecipePages(loadedRecipes, data?.recipes ?? []).length');
    expect(source).toContain('availableRecipeCount >= suggestionMinimumRecipeCount');
    expect(source).toContain("suggestionMinimumRecipeCount={selectedRecipe && recipeProvenance(selectedRecipe).sourceType === 'premium' ? RECIPE_SUGGESTION_LIMIT + 1 : 0}");
    expect(source).toContain('never manufacture repeated cards or prefetch this volume while browsing');
  });

  it('uses the shared source-free compact card in the Plus catalogue', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('savedRecipes.map((recipe) => (');
    expect(source).toContain('displayRecipes.map((recipe) => (');
    expect(source).not.toContain('{recipeSourceLabel(recipe)}</Text>');
  });

  it('keeps Discover and Plus grid cards fixed while giving the photo more height', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('const GRID_RECIPE_CARD_HEIGHT = 224');
    expect(source).toContain('const GRID_RECIPE_IMAGE_HEIGHT = 140');
    expect(source).toContain('imageHeight={GRID_RECIPE_IMAGE_HEIGHT}');
    expect(source).toContain('fixedHeight={GRID_RECIPE_CARD_HEIGHT}');
    expect(source).toContain('compact');
    expect(source).toContain('compactCardContent');
    expect(source).toContain('compactCardFooter');
  });

  it('keeps Plus cards mounted while pagination loads, retries failures, and deduplicates appended pages', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('placeholderData: offset > 0 ? (previousData) => previousData : undefined');
    expect(source).toContain('const recipes = useMemo(() => freshnessSession.order(loadedRecipes, freshnessVisit)');
    expect(source).toContain('mergeRecipePages([], data.recipes)');
    expect(source).toContain('mergeRecipePages(current, data.recipes)');
    expect(source).toContain('clearDuplicatePremiumRecipeImages(recipes)');
    expect(source).toContain('testID="plus-recipe-grid"');
    expect(source).toContain('testID="plus-recipe-content"');
    const premiumCatalogue = source.slice(
      source.indexOf('function PremiumCatalogue'),
      source.indexOf('function ReviewComponent'),
    );
    expect(premiumCatalogue).not.toContain('testID="plus-recipe-scroll"');
    expect(premiumCatalogue).not.toContain('handlePremiumScroll');
    expect(source).toContain('testID="plus-recipe-pagination-loading"');
    expect(source).toContain('testID="plus-recipe-pagination-error"');
    expect(source).toContain('testID="plus-recipe-pagination-retry"');
    expect(source).toContain('query.isError && recipes.length > 0');
    expect(source).toContain('onPress={() => query.refetch()}');
    expect(source).toContain('testID="plus-recipe-terminal"');
    expect(source).toContain("'All available Plus recipes are shown.'");
    expect(source).not.toContain('catalogueCycle');
    expect(source).not.toContain('continuousCatalogueEntries');
    expect(source).toContain('const loadMorePremiumRecipesIfAtEnd = (section: RecipeSection) => {');
    expect(source).toContain('onContentSizeChange={(_, contentHeight) => {');
    expect(source).toContain("if (section === 'premium') {");
    expect(source).toContain("if (section === 'discover') return renderDiscoverSection();");
    expect(source).toContain('loadMorePremiumRecipesIfAtEnd(section);');
    expect(source).toContain('loadMoreDiscoverRecipesIfAtEnd(section);');
    expect(source).toContain('shouldLoadMorePremiumRecipes({ section, activeSection');
    expect(source).toContain('onMomentumScrollEnd={(event) => handleRecipeScroll(section, event)}');
    expect(source).toContain('const premiumScrollYRef = useRef(0)');
    expect(source).toContain('premiumScrollYRef.current = contentOffset.y');
    expect(source).toContain('const premiumRecipeScrollMetricsRef = useRef');
    expect(source).toContain("section === 'premium' ? (");
    expect(source).not.toContain('<PremiumCatalogue visible=');
    expect(source).toContain("active={activeSection === 'premium'}");
    expect(premiumCatalogue).toContain('if (!active) return;');
    expect(source).toContain('renderItem={renderRecipeSection}');
    expect(source).toContain("import { PREMIUM_RECIPE_REQUEST_OPTIONS, premiumRecipeErrorStatus } from '@/lib/premiumRecipeRequest'");
    expect(source).toContain('request: PREMIUM_RECIPE_REQUEST_OPTIONS');
    expect(source).toContain('...PREMIUM_RECIPE_REQUEST_OPTIONS, signal');
    expect(source).toContain('const requestedOffsetRef = useRef<number | null>(null);');
    expect(source).toContain('const failedOffsetRef = useRef<number | null>(null);');
    expect(source).toContain('if (!query.isError) return;');
    expect(source).toContain('failedOffsetRef.current = requestedOffsetRef.current ?? (offset > 0 ? offset : null);');
    expect(source).toContain('if (query.isError && failedOffsetRef.current === nextOffset)');
    expect(source).toContain('void query.refetch().finally(() =>');
    expect(source).toContain("if (activeSection === 'discover') loadMoreDiscoverRecipesIfAtEnd('discover');");
    expect(source).toContain("if (activeSection === 'premium') loadMorePremiumRecipesIfAtEnd('premium');");
  });

  it('shows a loading state rather than a false empty result while a new Plus search is resolving', () => {
    expect(source).toContain('displayRecipes.length === 0 && query.isFetching');
    expect(source).toContain('testID="plus-recipe-search-loading"');
    expect(source).toContain('Finding Plus recipes…');
    expect(source).toContain('No Plus recipes found');
  });

  it('does not disguise a pending or failed generated recipe image as a food-photo fallback', () => {
    expect(source).toContain('isGeneratedRecipeImageCandidate(localRecipe)');
    expect(source).toContain('Creating recipe photo…');
    expect(source).toContain('Retry recipe photo');
    expect(source).toContain('generatedImageState');
    expect(source).toContain('isGeneratedRecipeImageCandidate(detail)');
  });

  it('keeps owner-signed generated image capabilities in memory rather than Expo Image disk cache', () => {
    expect(source).toContain("cachePolicy={generatedImage ? 'memory' : 'memory-disk'}");
  });

  it('fails closed to an explicit unavailable state when a recipe image is absent or rejected', () => {
    expect(source).toContain('Photo unavailable');
    expect(source).toContain('accessibilityLabel={`${recipe.name} photo unavailable`}');
    expect(source).not.toContain('RECIPE_FALLBACK_IMAGES');
    expect(source).not.toContain('recipeFallbackImage');
    expect(source).not.toContain('food photo fallback');
    expect(source).not.toContain("placeholder={require('../../assets/images/calora-recipes-header.jpg')}");
  });

  it('does not create an unattached generated-photo request for a manual personal recipe', () => {
    const manualRecipeForm = source.slice(source.indexOf('function PersonalRecipeFormModal'));
    expect(manualRecipeForm).toContain("imageStatus: 'not_requested'");
    expect(manualRecipeForm).not.toContain("imageStatus: 'pending'");
  });

  it('gives only media-free personal recipes a confirmed local edit and deletion lifecycle', () => {
    expect(source).toContain("import { isEditablePersonalRecipe, recipeNutritionLabel, recipeProvenance } from '@/lib/recipeModel'");
    expect(source).toContain('const editablePersonalRecipe = isEditablePersonalRecipe(detail);');
    expect(source).toContain('accessibilityLabel="Edit personal recipe"');
    expect(source).toContain('accessibilityLabel="Delete personal recipe"');
    expect(source).toContain('accessibilityLabel="Confirm recipe deletion"');
    expect(source).toContain('This removes this personal recipe from this device. This cannot be undone.');
    expect(source).toContain('updatePersonalRecipe(recipe.id, patch)');
    expect(source).toContain('deletePersonalRecipe(detail.id)');
    expect(source).toContain('Recipe could not be deleted on this device. Check storage and try again.');
  });

  it('keeps routed and saved Plus failures explicit, scoped, and actionable', () => {
    expect(source).toContain("enabled: recipeSource === 'plus' && Boolean(recipeId && user?.id)");
    expect(source).toContain('request: PREMIUM_RECIPE_REQUEST_OPTIONS');
    expect(source).toContain('const linkedPremiumRouteState = premiumRecipeRouteState({');
    expect(source).toContain('Sign in to open this recipe');
    expect(source).toContain('Retry opening Plus recipe');
    expect(source).toContain('testID="plus-saved-restoration-state"');
    expect(source).toContain('Some saved Plus recipes are temporarily unavailable.');
    expect(source).toContain('Sign in again to restore your saved Plus recipes.');
    expect(source).toContain("if (state === 'active' && premium && session?.user.id)");
  });

  it('keeps routed Discover failures actionable instead of silently retaining a failed route', () => {
    expect(source).toContain('const [linkedDiscoverRouteError, setLinkedDiscoverRouteError] = useState(false)');
    expect(source).toContain('if (linkedDiscoverRecipeQuery.isError) {');
    expect(source).toContain('Retry opening Discover recipe');
    expect(source).toContain('Close Discover recipe route');
    expect(source).toContain('void linkedDiscoverRecipeQuery.refetch();');
    expect(source).toContain("if (recipeSource !== 'discover') setLinkedDiscoverRouteError(false);");
  });

  it('does not disguise an authenticated recipe-creation failure as offline starter ideas', () => {
    expect(source).toContain("import { RecipeAuthError, requestGeneratedRecipe, requestGuestRecipeConcepts, requestRecipeConcepts } from '@/lib/recipeGeneration'");
    expect(source).toContain('const [needsRecipeSignIn, setNeedsRecipeSignIn] = useState(false)');
    expect(source).toContain('} else if (cause instanceof RecipeAuthError) {');
    expect(source).toContain("accessibilityLabel={needsRecipeSignIn ? 'Sign in to generate recipe ideas' : 'Retry recipe idea generation'}");
    expect(source).toContain("needsRecipeSignIn ? 'Sign in' : 'Retry'");
  });

  it('keeps blank user-entered macros unknown and renders partial nutrition explicitly', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('proteinG: parseWholeNumberInput(protein)');
    expect(source).toContain('carbsG: parseWholeNumberInput(carbs)');
    expect(source).toContain('fatG: parseWholeNumberInput(fat)');
    expect(source).toContain('Calories must be a whole number from 1 to 100,000.');
    expect(source).toContain('must be a whole number from 0 to 100,000.');
    expect(source).toContain('const nutritionIncomplete = nutritionState === \'available\' && !hasCompleteNutrition(detail)');
    expect(source).toContain('Some nutrition values are unavailable from this recipe source.');
    expect(source).toContain('formatRecipeNutrition(scaledProtein');
  });

  it('persists and renders the server-authored AI nutrition disclosure', () => {
    expect(source).toContain('nutritionNote: generated.nutritionNote');
    expect(source).toContain('const aiNutritionNote = isLocalRecipe(detail)');
    expect(source).toContain('accessibilityLabel="Estimated nutrition disclosure"');
  });

  it('awaits durable local recipe creation before opening a recipe or reporting success', () => {
    expect(source).toContain('const saved = await saveRecipe(recipe);');
    expect(source).toContain(': await saveRecipe({');
    expect(source).toContain('Recipe could not be saved on this device. Check storage and try again.');
    expect(source).toContain('disabled={saving}');
    expect(source).toContain("editing ? 'Save changes' : 'Save recipe'");
  });

  it('keeps nutrition portions explicit without guessing ingredient quantities', () => {
    expect(source).toContain("import { scaleRecipeNutritionForDiary } from '@/lib/recipeDiaryServing'");
    expect(source).toContain("import { formatRecipePortions, nextRecipePortions, recipePortionLabel, sourceRecipeYield } from '@/lib/recipeServing'");
    expect(source).toContain('const sourceYield = sourceRecipeYield(detail);');
    expect(source).toContain('scaleRecipeNutritionForDiary(detail, diaryServings)');
    expect(source).toContain('setDiaryServings(servingCount);');
    expect(source).toContain('...scaleRecipeNutritionForDiary(detail, servingCount)');
    expect(source).toContain('servingLabel: `${servingLabel} ${recipePortionLabel(servingCount)}`');
    expect(source).not.toContain('scaleIngredient(');
    expect(source).toContain('addIngredientsToShopping(ingredients, detail.id);');
    expect(source).toContain('ingredients: detail.ingredients ?? []');
    expect(source).toContain('serving: `${servingLabel} ${recipePortionLabel(servingCount)}`');
    expect(source).toContain('Ingredient quantities are listed as supplied; adjust them for your portions.');
    expect(source).toContain('const canLog = hasCompleteNutrition(detail);');
  });

  it('reconciles Discover pages by generation, offset, and stable provider identity', () => {
    expect(source).toContain("import { applyDiscoverCataloguePage, createDiscoverCatalogueState, discoverCatalogueEntries, nextDiscoverPaginationOffset, resetDiscoverCatalogueState } from '@/lib/discoverCatalogueState'");
    expect(source).toContain('createDiscoverCatalogueState<Recipe>');
    expect(source).toContain('applyDiscoverCataloguePage(current, {');
    expect(source).toContain('resetDiscoverCatalogueState(current, discoverFilterKey)');
    expect(source).toContain('discoverCatalogueEntries(discoverCatalogue)');
    expect(source).toContain('nextDiscoverPaginationOffset({');
    expect(source).not.toContain('appendDiscoverFeedPage');
    expect(source).toContain('orderDiscoverFeedRecipes(remoteRecipes, discoverFreshnessSession, discoverFreshnessVisit)');
    expect(source).toContain('visibleRemote.map((recipe) => ({ recipe, entryKey: `discover:${discoverFeedEntryKey(recipe)}` }))');
    expect(source).toContain('keyExtractor={(entry) => entry.entryKey}');
    expect(source).toContain('continuousBrowse: response?.continuousBrowse === true');
    expect(source).toContain('browseCycle: response?.browseCycle ?? 0');
  });

  it('uses a virtualized feed for explicit continuous Discover browsing and retains a truthful terminal refresh for finite filters', () => {
    expect(source).toContain('<FlatList');
    expect(source).toContain('testID="discover-recipe-feed"');
    expect(source).toContain('onEndReached={loadMoreRecipes}');
    expect(source).toContain('windowSize={7}');
    expect(source).toContain('testID="discover-recipe-terminal"');
    expect(source).toContain('accessibilityLabel="Refresh Discover recipes"');
    expect(source).toContain('onPress={refreshDiscoverCatalogue}');
  });
  it('rechecks the end-of-feed continuation after each page and offset reconciliation', () => {
    const effectStart = source.indexOf("if (activeSection === 'discover') loadMoreDiscoverRecipesIfAtEnd('discover');");
    const effectEnd = source.indexOf('const handleRecipeScroll', effectStart);
    const continuationEffect = source.slice(effectStart, effectEnd);
    expect(effectStart).toBeGreaterThan(-1);
    expect(continuationEffect).toContain('discoverCatalogue.pages.length');
    expect(continuationEffect).toContain('remoteNextOffset');
    expect(continuationEffect).toContain('remoteOffset');
    expect(continuationEffect).toContain('remoteRecipes.length');
  });

  it('rechecks Discover after the final rendered grid grows on web', () => {
    const renderedGridStart = source.indexOf('const discoverGridEntries = useMemo');
    const renderStart = source.indexOf('const renderDiscoverSection = () =>', renderedGridStart);
    const renderedGridBlock = source.slice(renderedGridStart, renderStart);
    expect(renderedGridBlock).toContain('discoverGridEntries.length');
    expect(renderedGridBlock).toContain("loadMoreDiscoverRecipesIfAtEnd('discover')");
    expect(renderedGridBlock).toContain('remoteNextOffset');
    expect(renderedGridBlock).toContain('recipesQuery.isFetching');
  });

  it('starts a new deterministic Discover visit whenever the Recipes tab regains focus and keeps an already-read visit prefix stable while loading later pages', () => {
    expect(source).toContain("import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'");
    expect(source).toContain('useFocusEffect(');
    expect(source).toContain('beginDiscoverVisit');
    expect(source).toContain('reconcileDiscoverVisitComposition({');
    expect(source).not.toContain('...caloraOriginalMatches,\n    ...(category === \'Quick\'');
  });

  it('keeps the strict image-integrity fallback but offers a retry after an individual Discover image delivery failure', () => {
    expect(source).toContain('const [imageRetryNonce, setImageRetryNonce] = useState(0);');
    expect(source).toContain('const retryRemoteImage =');
    expect(source).toContain('accessibilityLabel={`Retry ${recipe.name} photo`}');
    expect(source).toContain('Retry photo');
    expect(source).toContain('recyclingKey={`${recipe.id}:${recipeImageKey}:${imageRetryNonce}`}');
    expect(source).toContain('setImageFailureReason(');
  });

  it('gives an initial Discover outage a bounded request policy and an actionable retry', () => {
    expect(source).toContain("import { DISCOVER_RECIPE_REFRESH_POLICY, DISCOVER_RECIPE_REQUEST_OPTIONS } from '@/lib/discoverRecipeRequest'");
    expect(source).toContain('...DISCOVER_RECIPE_REFRESH_POLICY');
    expect(source).toContain('request: DISCOVER_RECIPE_REQUEST_OPTIONS');
    expect(source).toContain('Recipes are offline');
    expect(source).toContain('testID="discover-recipe-initial-retry"');
    expect(source).toContain('accessibilityLabel="Retry loading Discover recipes"');
  });

  it('clears both list and detail cache boundaries for any 401 or 403 Plus denial', () => {
    expect(source).toContain('queryErrorStatus === 401 || queryErrorStatus === 403');
    expect(source).toContain('clearPremiumAccountBoundaryState({');
    expect(source).toContain("queryKey: ['premium-recipes', userId]");
    expect(source).toContain("queryKey: ['premium-recipe', userId]");
    expect(source).toContain('applyPremiumDetailDenial(premiumDetailErrorStatus, onPremiumAccessDenied)');
  });

  it('keeps Quick curated to recipes with known preparation times without remote pagination', () => {
    expect(source).toContain("const discoverRemoteEnabled = category !== 'My recipes' && category !== 'Quick'");
    expect(source).toContain("category === 'Quick'");
    expect(source).toContain("category === 'Quick'\n      ? []");
    expect(source).toContain('curated quick recipes with known preparation times');
    expect(source).not.toContain('freshRemoteRecipes.filter((r) => r.prepMinutes != null');
  });

  it('sends the UTC freshness day through unfiltered Plus params, keys, and prefetches only', () => {
    expect(source).toContain("const unfilteredFreshnessDay = !search && !category ? freshnessDay : undefined");
    expect(source).toContain('...(unfilteredFreshnessDay ? { freshnessDay: unfilteredFreshnessDay } : {})');
    expect(source).toContain('getListPremiumRecipesQueryKey(premiumParams)');
    expect(source).toContain('getListPremiumRecipesQueryKey(nextParams)');
    expect(source).toContain('const today = utcFreshnessDay()');
    expect(source).toContain('setFreshnessDay(today)');
    expect(source).toContain('const nextUtcDay = Date.UTC(');
  });

  it('keeps every recipe submenu inside a bounded vertical scroll viewport', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/(tabs)/recipes.tsx'),
      'utf8',
    );

    expect(source).toContain('style={styles.recipeScroll}');
    expect(source).toContain('recipeScroll: { flex: 1, minHeight: 0 }');
    expect(source).toContain('nestedScrollEnabled');
    expect(source).toContain('onScrollEndDrag={(event) => handleRecipeScroll(section, event)}');
  });

  it('replaces the legacy provider-fact widget with the upper AI nutrition widget', () => {
    expect(source).toContain("import { RecipeAiNutritionWidget } from '@/components/RecipeAiNutritionWidget'");
    expect(source).toContain('<RecipeAiNutritionWidget');
    expect(source).toContain('recipeId={detail.id}');
    expect(source).toContain('ingredients={detail.ingredients ?? []}');
    expect(source).toContain('sourceYield={sourceYield}');
    expect(source).toContain('servingCount={servingCount}');
    expect(source).not.toContain('RecipeNutritionDetails');
  });
});
