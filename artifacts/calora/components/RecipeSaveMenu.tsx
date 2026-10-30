import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import type { useCalora } from '@/context/CaloraContext';

type Colors = ReturnType<typeof useCalora>['colors'];

type RecipeSaveMenuProps = {
  colors: Colors;
  recipeName: string;
  recipeSaved: boolean;
  mealSaved?: boolean;
  mealSaveAvailable?: boolean;
  onSaveRecipe: () => void;
  onSaveMeal: () => void;
  onRemoveMeal?: () => void;
  compact?: boolean;
};

export function RecipeSaveMenu({
  colors,
  recipeName,
  recipeSaved,
  mealSaved = false,
  mealSaveAvailable = true,
  onSaveRecipe,
  onSaveMeal,
  onRemoveMeal,
  compact = false,
}: RecipeSaveMenuProps) {
  const [visible, setVisible] = useState(false);
  const close = () => setVisible(false);
  const chooseRecipe = () => {
    close();
    onSaveRecipe();
  };
  const chooseMeal = () => {
    close();
    if (mealSaved && onRemoveMeal) onRemoveMeal();
    else onSaveMeal();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${recipeSaved ? 'Manage' : 'Save'} ${recipeName} recipe and meal options`}
        accessibilityHint="Choose whether to save this item as a recipe, a meal, or both"
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          compact ? styles.compactTrigger : styles.trigger,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.72 : 1 },
        ]}
      >
        <Feather name="bookmark" size={compact ? 16 : 15} color={recipeSaved ? colors.primary : colors.foreground} />
        {mealSaved ? <Feather name="coffee" size={compact ? 14 : 13} color={colors.primary} /> : null}
        {!compact ? <Text style={[styles.triggerText, { color: colors.foreground }]}>{recipeSaved || mealSaved ? 'Saved' : 'Save'}</Text> : null}
      </Pressable>

      <BottomSheet visible={visible} onRequestClose={close} onBackdropPress={close} animationType="slide">
        <View style={styles.sheetContent}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>SAVE OPTIONS</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Save {recipeName}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Choose either option, or save both independently.</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${recipeSaved ? 'Remove' : 'Save'} ${recipeName} recipe`}
            onPress={chooseRecipe}
            style={[styles.option, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <View style={[styles.icon, { backgroundColor: colors.accent }]}>
              <Feather name="bookmark" size={18} color={colors.accentForeground} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={[styles.optionTitle, { color: colors.foreground }]}>{recipeSaved ? 'Recipe saved' : 'Save recipe'}</Text>
              <Text style={[styles.optionBody, { color: colors.mutedForeground }]}>{recipeSaved ? 'Remove it from Saved Recipes' : 'Keep the full recipe for later'}</Text>
            </View>
            {recipeSaved ? <Feather name="check" size={18} color={colors.primary} /> : <Feather name="chevron-right" size={18} color={colors.mutedForeground} />}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mealSaveAvailable ? `${mealSaved ? 'Remove' : 'Save'} ${recipeName} as meal` : `Save ${recipeName} as meal unavailable`}
            accessibilityState={{ disabled: !mealSaveAvailable }}
            disabled={!mealSaveAvailable}
            onPress={chooseMeal}
            style={[styles.option, { backgroundColor: colors.muted, borderColor: colors.border, opacity: mealSaveAvailable ? 1 : 0.5 }]}
          >
            <View style={[styles.icon, { backgroundColor: colors.primary }]}>
              <Feather name="coffee" size={18} color={colors.primaryForeground} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={[styles.optionTitle, { color: colors.foreground }]}>{mealSaved ? 'Meal saved' : 'Save as meal'}</Text>
              <Text style={[styles.optionBody, { color: colors.mutedForeground }]}>{mealSaveAvailable ? (mealSaved ? 'Remove it from Saved Meals' : 'Create a quick-log nutrition template') : 'Complete nutrition information is required'}</Text>
            </View>
            {mealSaved ? <Feather name="check" size={18} color={colors.primary} /> : <Feather name="chevron-right" size={18} color={colors.mutedForeground} />}
          </Pressable>

          <Pressable accessibilityRole="button" accessibilityLabel="Cancel save options" onPress={close} style={[styles.cancel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  compactTrigger: { minWidth: 42, height: 36, paddingHorizontal: 8, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  trigger: { minHeight: 38, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  triggerText: { fontSize: 11, fontWeight: '800' },
  sheetContent: { paddingHorizontal: 18, paddingBottom: 4 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 5 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  option: { minHeight: 72, borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 3 },
  optionBody: { fontSize: 12, lineHeight: 17 },
  cancel: { minHeight: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelText: { fontSize: 13, fontWeight: '900' },
});
