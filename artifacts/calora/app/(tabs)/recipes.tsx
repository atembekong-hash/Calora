import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetRecipe, useListRecipes, type Recipe } from '@workspace/api-client-react';
import { CaloraRecipe, useCalora } from '@/context/CaloraContext';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

const categories = ['For you', 'Vegetarian', 'Chicken', 'Seafood', 'Dessert'];

function recipeKey(recipe: Recipe | CaloraRecipe) {
  return recipe.id;
}

function isLocalRecipe(recipe: Recipe | CaloraRecipe): recipe is CaloraRecipe {
  return 'isLocal' in recipe && recipe.isLocal === true;
}

function RecipeImage({ recipe, height = 160 }: { recipe: Recipe | CaloraRecipe; height?: number }) {
  return recipe.image ? (
    <Image source={{ uri: recipe.image }} contentFit="cover" transition={180} style={[styles.recipeImage, { height }]} />
  ) : (
    <View style={[styles.recipeImage, styles.imageFallback, { height }]}>
      <Feather name="book-open" size={26} color="#9dd7bd" />
      <Text style={styles.imageFallbackText}>Calora recipe</Text>
    </View>
  );
}

function RecipeMeta({ recipe, colors }: { recipe: Recipe | CaloraRecipe; colors: ReturnType<typeof useCalora>['colors'] }) {
  const nutrition = recipe.calories ? `${Math.round(recipe.calories)} kcal` : 'Nutrition review needed';
  return (
    <View style={styles.recipeMeta}>
      <Text style={[styles.recipeKcal, { color: recipe.calories ? colors.foreground : colors.warning }]}>{nutrition}</Text>
      {recipe.prepMinutes ? <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{recipe.prepMinutes} min</Text> : null}
      {recipe.area ? <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>{recipe.area}</Text> : null}
    </View>
  );
}

function RecipeCard({ recipe, colors, saved, onPress, onSave }: { recipe: Recipe | CaloraRecipe; colors: ReturnType<typeof useCalora>['colors']; saved: boolean; onPress: () => void; onSave: () => void }) {
  const local = isLocalRecipe(recipe);
  return (
    <Pressable accessibilityLabel={`Open ${recipe.name}`} onPress={onPress} style={({ pressed }) => [styles.recipeCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.82 : 1 }]}>
      <View>
        <RecipeImage recipe={recipe} />
        <Pressable accessibilityLabel={`${saved ? 'Remove' : 'Save'} ${recipe.name}`} onPress={onSave} style={[styles.saveButton, { backgroundColor: colors.card }]}>
          <Feather name={saved ? 'bookmark' : 'bookmark'} size={16} color={saved ? colors.primary : colors.foreground} />
        </Pressable>
        {local && <View style={[styles.localBadge, { backgroundColor: colors.primary }]}><Text style={[styles.localBadgeText, { color: colors.primaryForeground }]}>MY RECIPE</Text></View>}
      </View>
      <View style={styles.cardContent}>
        <Text numberOfLines={2} style={[styles.recipeName, { color: colors.foreground }]}>{recipe.name}</Text>
        <RecipeMeta recipe={recipe} colors={colors} />
        <View style={styles.cardFooter}>
          <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>{local ? 'Created in Calora' : `Open source · ${recipe.source}`}</Text>
          <Feather name="arrow-up-right" size={13} color={colors.mutedForeground} />
        </View>
      </View>
    </Pressable>
  );
}

function RecipeDetailModal({ recipe, onClose }: { recipe: Recipe | CaloraRecipe | null; onClose: () => void }) {
  const { colors, profile, addLog, savedRecipeIds, toggleSavedRecipe } = useCalora();
  const local = recipe ? isLocalRecipe(recipe) : false;
  const remoteRecipeId = recipe && !local ? recipe.id : '';
  const detailQuery = useGetRecipe(remoteRecipeId, { query: { queryKey: ['recipe', remoteRecipeId], enabled: Boolean(remoteRecipeId), staleTime: 1000 * 60 * 30 } });
  const detail = detailQuery.data ?? recipe;
  if (!detail) return null;
  const canLog = Boolean(detail.calories && detail.calories > 0);
  const saveToDiary = () => {
    if (!canLog) return;
    addLog({
      name: detail.name,
      date: new Date().toISOString().slice(0, 10),
      meal: 'Dinner',
      calories: detail.calories ?? 0,
      protein: detail.proteinG ?? 0,
      carbs: detail.carbsG ?? 0,
      fat: detail.fatG ?? 0,
      source: 'Recipe',
      confidence: local ? 92 : 68,
      time: 'Just now',
      serving: '1 recipe serving',
      notes: local ? 'Created in Calora' : `Source: ${detail.source}`,
    });
    onClose();
  };
  return (
    <Modal visible={recipe !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
        <View style={[styles.detailSheet, { backgroundColor: colors.background }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={styles.detailTop}>
              <Pressable accessibilityLabel="Close recipe details" onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable>
              <Pressable accessibilityLabel={`${savedRecipeIds.includes(detail.id) ? 'Remove' : 'Save'} recipe`} onPress={() => toggleSavedRecipe(detail.id)} style={[styles.closeButton, { backgroundColor: colors.muted }]}><Feather name="bookmark" size={17} color={savedRecipeIds.includes(detail.id) ? colors.primary : colors.foreground} /></Pressable>
            </View>
            <RecipeImage recipe={detail} height={210} />
            <View style={styles.detailCopy}>
              <Text style={[styles.detailEyebrow, { color: colors.primary }]}>{local ? 'YOUR RECIPE' : `${detail.source.toUpperCase()} RECIPE`}</Text>
              <Text style={[styles.detailTitle, { color: colors.foreground }]}>{detail.name}</Text>
              <Text style={[styles.detailSubtitle, { color: colors.mutedForeground }]}>{detail.area ? `${detail.area} cuisine` : 'A recipe for your collection'}{detail.category ? ` · ${detail.category}` : ''}</Text>
              <View style={[styles.nutritionStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View><Text style={[styles.nutritionValue, { color: detail.calories ? colors.foreground : colors.warning }]}>{detail.calories ? `${Math.round(detail.calories)}` : '—'}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>kcal / serving</Text></View>
                <View><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{detail.proteinG ? `${Math.round(detail.proteinG)}g` : '—'}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>protein</Text></View>
                <View><Text style={[styles.nutritionValue, { color: colors.foreground }]}>{detail.prepMinutes ? `${detail.prepMinutes}m` : '—'}</Text><Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>prep</Text></View>
              </View>
              {!canLog && <View style={[styles.notice, { backgroundColor: colors.accent }]}><Feather name="info" size={16} color={colors.accentForeground} /><Text style={[styles.noticeText, { color: colors.foreground }]}>This open-source recipe does not include verified nutrition yet. You can save it, then add your own nutrition before logging.</Text></View>}
              {detail.ingredients?.length ? <><Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>Ingredients</Text>{detail.ingredients.map((ingredient) => <View key={ingredient} style={styles.ingredientRow}><View style={[styles.ingredientDot, { backgroundColor: colors.primary }]} /><Text style={[styles.ingredientText, { color: colors.foreground }]}>{ingredient}</Text></View>)}</> : null}
              {detail.instructions ? <><Text style={[styles.detailSectionTitle, { color: colors.foreground }]}>Method</Text><Text style={[styles.instructions, { color: colors.mutedForeground }]}>{detail.instructions}</Text></> : null}
              <Text style={[styles.attribution, { color: colors.mutedForeground }]}>Recipe source: {detail.source}. Calora does not claim third-party recipe content as its own.</Text>
              <Pressable accessibilityLabel={canLog ? 'Add recipe to diary' : 'Save recipe for nutrition review'} onPress={canLog ? saveToDiary : () => { toggleSavedRecipe(detail.id); onClose(); }} style={[styles.primaryAction, { backgroundColor: colors.primary }]}><Feather name={canLog ? 'plus-circle' : 'bookmark'} size={16} color={colors.primaryForeground} /><Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>{canLog ? `Add to ${profile?.name ? 'today’s diary' : 'diary'}` : 'Save for later'}</Text></Pressable>
              <Pressable accessibilityLabel="Open recipe source" onPress={() => Linking.openURL(detail.sourceUrl)} style={styles.sourceAction}><Text style={[styles.sourceActionText, { color: colors.primary }]}>View source attribution</Text><Feather name="external-link" size={13} color={colors.primary} /></Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CreateRecipeModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const { colors, saveRecipe } = useCalora();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [error, setError] = useState('');
  const create = () => {
    if (!name.trim()) {
      setError('Add a name for your recipe.');
      return;
    }
    if (!Number.isFinite(Number(calories)) || Number(calories) <= 0) {
      setError('Add calories greater than zero so this recipe can be logged.');
      return;
    }
    Keyboard.dismiss();
    saveRecipe({
      name: name.trim(),
      ingredients: ingredients.split('\n').map((item) => item.trim()).filter(Boolean),
      tags: ['My recipes'],
      source: 'Created in Calora',
      sourceUrl: 'https://calora.app/',
      calories: Number(calories),
      proteinG: Number(protein) || 0,
      carbsG: Number(carbs) || 0,
      fatG: Number(fat) || 0,
      category: 'Personal',
      area: null,
      image: null,
      instructions: null,
      description: null,
      prepMinutes: null,
    });
    setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setIngredients('');
    setError('');
    onClose();
    onCreated();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.46)' }]}>
        <KeyboardAwareScrollViewCompat
          style={[styles.createSheet, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.createFormContent}
          bottomOffset={24}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.detailTitle, { color: colors.foreground }]}>Create your recipe</Text>
          <Text style={[styles.detailSubtitle, { color: colors.mutedForeground }]}>Your recipes stay separate from open-source content and can be edited later.</Text>
          <TextInput accessibilityLabel="Recipe name" returnKeyType="next" value={name} onChangeText={(value) => { setName(value); setError(''); }} placeholder="Recipe name" placeholderTextColor={colors.mutedForeground} style={[styles.createInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
          <View style={styles.numberGrid}>{[['Calories', calories, setCalories], ['Protein g', protein, setProtein], ['Carbs g', carbs, setCarbs], ['Fat g', fat, setFat]].map(([label, value, setter]) => <View key={label as string} style={{ flex: 1 }}><Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{label as string}</Text><TextInput accessibilityLabel={label as string} value={value as string} onChangeText={(text) => { (setter as (next: string) => void)(text); setError(''); }} keyboardType="decimal-pad" returnKeyType="next" placeholder="0" placeholderTextColor={colors.mutedForeground} style={[styles.createInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} /></View>)}</View>
          <TextInput accessibilityLabel="Recipe ingredients" value={ingredients} onChangeText={(value) => { setIngredients(value); setError(''); }} multiline placeholder="Ingredients, one per line" placeholderTextColor={colors.mutedForeground} style={[styles.ingredientsInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} />
          {error ? <View style={[styles.formError, { backgroundColor: colors.destructive + '18' }]}><Feather name="alert-circle" size={15} color={colors.destructive} /><Text style={[styles.formErrorText, { color: colors.destructive }]}>{error}</Text></View> : null}
          <Pressable accessibilityLabel="Save your recipe" onPress={create} style={[styles.primaryAction, { backgroundColor: colors.primary }]}><Feather name="check" size={16} color={colors.primaryForeground} /><Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>Save recipe</Text></Pressable>
          <Pressable accessibilityLabel="Cancel recipe creation" onPress={onClose} style={styles.sourceAction}><Text style={[styles.sourceActionText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

export default function RecipesScreen() {
  const { colors, profile, logs, localRecipes, savedRecipeIds, toggleSavedRecipe } = useCalora();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('For you');
  const [selected, setSelected] = useState<Recipe | CaloraRecipe | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const remainingCalories = Math.max((profile?.calorieTarget ?? 2000) - logs.filter((log) => log.date === new Date().toISOString().slice(0, 10)).reduce((sum, log) => sum + log.calories, 0), 0);
  const localMatches = useMemo(() => localRecipes.filter((recipe) => {
    const haystack = `${recipe.name} ${recipe.category ?? ''} ${recipe.tags.join(' ')} ${recipe.ingredients.join(' ')}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (category === 'For you' || category === 'My recipes' || recipe.category === category);
  }), [category, localRecipes, search]);
  const recipesQuery = useListRecipes({ query: search || undefined, category: category === 'For you' || category === 'My recipes' ? undefined : category, limit: 18 }, { query: { queryKey: ['recipes', search, category], staleTime: 1000 * 60 * 10 } });
  const remoteRecipes = recipesQuery.data?.recipes ?? [];
  const visibleRemote = category === 'My recipes' ? [] : remoteRecipes;
  const savedRecipes = [...localRecipes, ...remoteRecipes].filter((recipe, index, list) => savedRecipeIds.includes(recipeKey(recipe)) && list.findIndex((item) => recipeKey(item) === recipeKey(recipe)) === index);
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: insets.bottom + 104 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View><Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>THE CALORA COOKBOOK</Text><Text style={[styles.title, { color: colors.foreground }]}>Recipes</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Good food, with enough context to trust it.</Text></View>
          <Pressable accessibilityLabel="Create your own recipe" onPress={() => setShowCreate(true)} style={[styles.createButton, { backgroundColor: colors.primary }]}><Feather name="plus" size={15} color={colors.primaryForeground} /><Text style={[styles.createButtonText, { color: colors.primaryForeground }]}>Create</Text></Pressable>
        </View>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.input }]}><Feather name="search" size={17} color={colors.mutedForeground} /><TextInput accessibilityLabel="Search recipes" value={search} onChangeText={setSearch} placeholder="Search recipes, ingredients, cuisines" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} />{search ? <Pressable accessibilityLabel="Clear recipe search" onPress={() => setSearch('')}><Feather name="x-circle" size={16} color={colors.mutedForeground} /></Pressable> : null}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>{categories.map((item) => <Pressable key={item} accessibilityLabel={`Recipe category ${item}`} onPress={() => setCategory(item)} style={[styles.categoryChip, { backgroundColor: category === item ? colors.primary : colors.card, borderColor: category === item ? colors.primary : colors.border }]}><Text style={[styles.categoryText, { color: category === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text></Pressable>)}<Pressable accessibilityLabel="Recipe category My recipes" onPress={() => setCategory('My recipes')} style={[styles.categoryChip, { backgroundColor: category === 'My recipes' ? colors.primary : colors.card, borderColor: category === 'My recipes' ? colors.primary : colors.border }]}><Text style={[styles.categoryText, { color: category === 'My recipes' ? colors.primaryForeground : colors.mutedForeground }]}>My recipes</Text></Pressable></ScrollView>

        <View style={[styles.fitCard, { backgroundColor: colors.hero }]}>
          <View style={[styles.fitIcon, { backgroundColor: 'rgba(157,215,189,0.15)' }]}><Feather name="target" size={18} color={colors.heroMuted} /></View>
          <Text style={[styles.fitEyebrow, { color: colors.heroMuted }]}>MADE FOR YOUR DAY</Text>
          <Text style={[styles.fitTitle, { color: colors.onHero }]}>{remainingCalories.toLocaleString()} kcal left to work with</Text>
          <Text style={[styles.fitBody, { color: colors.heroMuted }]}>Browse by mood and cuisine. When a recipe has nutrition data, Calora will show exactly how it fits your target.</Text>
        </View>

        {savedRecipes.length > 0 && <><View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saved recipes</Text><Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>Your shortlist, ready when you are.</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>{savedRecipes.slice(0, 6).map((recipe) => <View key={recipeKey(recipe)} style={{ width: 220 }}><RecipeCard recipe={recipe} colors={colors} saved onPress={() => setSelected(recipe)} onSave={() => toggleSavedRecipe(recipeKey(recipe))} /></View>)}</ScrollView></>}

        <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{category === 'For you' ? 'Explore open recipes' : category === 'My recipes' ? 'Your recipes' : category}</Text><Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>{recipesQuery.isFetching ? 'Refreshing the cookbook…' : `${visibleRemote.length + localMatches.length} recipes to explore`}</Text></View><Feather name="book-open" size={18} color={colors.mutedForeground} /></View>
        {recipesQuery.isLoading ? <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Finding recipes from open sources…</Text></View> : recipesQuery.isError ? <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="wifi-off" size={20} color={colors.warning} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>The cookbook is offline</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Your saved and personal recipes remain available. Try again when a connection is available.</Text></View> : <View style={styles.recipeGrid}>{localMatches.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} colors={colors} saved={savedRecipeIds.includes(recipe.id)} onPress={() => setSelected(recipe)} onSave={() => toggleSavedRecipe(recipe.id)} />)}{visibleRemote.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} colors={colors} saved={savedRecipeIds.includes(recipe.id)} onPress={() => setSelected(recipe)} onSave={() => toggleSavedRecipe(recipe.id)} />)}</View>}
        <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>Open recipe discovery is provided by TheMealDB. Recipes remain attributed to their source; Calora’s nutrition confidence is shown separately.</Text>
      </ScrollView>
      <RecipeDetailModal recipe={selected} onClose={() => setSelected(null)} />
      <CreateRecipeModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setSearch('');
          setCategory('My recipes');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 235 },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, marginTop: 6 },
  createButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  searchBox: { height: 48, borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12 },
  categoryRow: { gap: 8, paddingVertical: 14, paddingRight: 20 },
  categoryChip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  categoryText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  fitCard: { borderRadius: 24, padding: 18, marginBottom: 25 },
  fitIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  fitEyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.2, marginBottom: 6 },
  fitTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, letterSpacing: -0.3 },
  fitBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, marginTop: 7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  sectionCaption: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  horizontalCards: { gap: 11, paddingBottom: 25 },
  recipeGrid: { gap: 12 },
  recipeCard: { borderWidth: 1, borderRadius: 19, overflow: 'hidden' },
  recipeImage: { width: '100%', backgroundColor: '#1d4539' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { color: '#9dd7bd', fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 6 },
  saveButton: { position: 'absolute', right: 10, top: 10, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  localBadge: { position: 'absolute', left: 10, bottom: 10, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  localBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.7 },
  cardContent: { padding: 13 },
  recipeName: { fontFamily: 'Inter_700Bold', fontSize: 14, lineHeight: 18, minHeight: 36 },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  recipeKcal: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  recipeMetaText: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(120,120,120,0.12)' },
  sourceText: { fontFamily: 'Inter_400Regular', fontSize: 9 },
  loadingState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  emptyState: { borderWidth: 1, borderRadius: 18, padding: 18, alignItems: 'center' },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 10 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 6 },
  footerNote: { fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 22 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  detailSheet: { maxHeight: '94%', borderTopLeftRadius: 27, borderTopRightRadius: 27, overflow: 'hidden' },
  detailTop: { position: 'absolute', zIndex: 2, top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  detailCopy: { padding: 20 },
  detailEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, marginTop: 17 },
  detailTitle: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.6, marginTop: 6 },
  detailSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 6 },
  nutritionStrip: { flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderRadius: 16, padding: 13, marginTop: 17 },
  nutritionValue: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  nutritionLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 3 },
  notice: { flexDirection: 'row', gap: 9, borderRadius: 14, padding: 12, marginTop: 12 },
  noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  detailSectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 23, marginBottom: 9 },
  ingredientRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  ingredientDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  ingredientText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  instructions: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 19 },
  attribution: { fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 14, marginTop: 22 },
  primaryAction: { minHeight: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16, marginTop: 17 },
  primaryActionText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  sourceAction: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 13 },
  sourceActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  createSheet: { borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 20, paddingBottom: 28 },
  createFormContent: { paddingBottom: 30 },
  formError: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 11, padding: 10, marginTop: 10 },
  formErrorText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14 },
  numberGrid: { flexDirection: 'row', gap: 7, marginTop: 11 },
  inputLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, marginBottom: 5 },
  createInput: { height: 45, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, fontFamily: 'Inter_400Regular', fontSize: 12 },
  ingredientsInput: { height: 100, borderWidth: 1, borderRadius: 12, padding: 11, textAlignVertical: 'top', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 11 },
});