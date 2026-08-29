/**
 * PlannerPeek — home screen bridge between the Planner tab and Today's diary.
 *
 * Shows this week's planned meals for the selected date as a horizontal
 * scrollable strip of chips. Renders nothing when no meals are planned for
 * that day so it never creates visual noise on empty plans.
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScalePressable } from '@/components/ScalePressable';
import { useCalora } from '@/context/CaloraContext';
import type { MealType } from '@/context/CaloraContext';

// ─── Meal-type metadata ────────────────────────────────────────────────────

type MealMeta = {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  bg: string;
};

const MEAL_META: Record<string, MealMeta> = {
  Breakfast: { icon: 'sunrise', color: '#c4762a', bg: '#fff4e0' },
  Lunch:     { icon: 'sun',     color: '#2a7c5c', bg: '#dff2e7' },
  Dinner:    { icon: 'moon',    color: '#4a5faf', bg: '#eaecf9' },
  Snack:     { icon: 'coffee',  color: '#8a4db5', bg: '#f2eafd' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Component ────────────────────────────────────────────────────────────

interface PlannerPeekProps {
  /** The diary date currently selected on the home screen (YYYY-MM-DD). */
  selectedDate: string;
}

export function PlannerPeek({ selectedDate }: PlannerPeekProps) {
  const { plannerMeals, colors, fontScale: f } = useCalora();

  const todayMeals = useMemo(
    () => (plannerMeals ?? []).filter((m) => m.day === selectedDate),
    [plannerMeals, selectedDate],
  );

  // Only render when at least one meal is planned for the selected day.
  if (!todayMeals.length) return null;

  const styles = makeStyles(f);

  const goToPlanner = () => router.navigate('/(tabs)/planner');

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}>
            <Feather name="calendar" size={14} color={colors.accentForeground} />
          </View>
          <View>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
              {selectedDate === todayKey() ? "PLANNED FOR TODAY" : "PLANNED FOR THIS DAY"}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {todayMeals.length === 1 ? '1 planned' : `${todayMeals.length} planned`}
            </Text>
          </View>
        </View>
        <ScalePressable
          accessibilityLabel="Go to Planner tab"
          onPress={goToPlanner}
          scale={0.96}
          haptic="none"
          style={[styles.seeAll, { backgroundColor: colors.muted }]}
        >
          <Text style={[styles.seeAllText, { color: colors.mutedForeground }]}>See plan</Text>
          <Feather name="arrow-right" size={12} color={colors.mutedForeground} />
        </ScalePressable>
      </View>

      {/* Meal chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        bounces={false}
      >
        {todayMeals.map((meal) => {
          const meta: MealMeta = MEAL_META[meal.meal] ?? MEAL_META['Snack'];
          return (
            <ScalePressable
              key={meal.id}
              accessibilityLabel={`${meal.meal}: ${meal.name}${meal.calories ? `, ${Math.round(meal.calories)} kcal` : ''} — tap to open planner`}
              onPress={goToPlanner}
              scale={0.97}
              haptic="none"
              style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <View style={[styles.chipBadge, { backgroundColor: meta.bg }]}>
                <Feather name={meta.icon} size={12} color={meta.color} />
                <Text style={[styles.chipMealType, { color: meta.color }]}>{meal.meal}</Text>
              </View>
              <Text numberOfLines={1} style={[styles.chipName, { color: colors.foreground }]}>
                {meal.name}
              </Text>
              {meal.calories && meal.calories > 0 ? (
                <Text style={[styles.chipKcal, { color: colors.mutedForeground }]}>
                  {Math.round(meal.calories)} kcal
                </Text>
              ) : null}
            </ScalePressable>
          );
        })}

      </ScrollView>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

function makeStyles(f: number) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: 22,
      paddingTop: 12,
      marginBottom: 16,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 13,
      marginBottom: 9,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrow: {
      fontFamily: 'Inter_700Bold',
      fontSize: 8 * f,
      letterSpacing: 1,
      marginBottom: 2,
    },
    title: {
      fontFamily: 'Inter_700Bold',
      fontSize: 13 * f,
      letterSpacing: -0.2,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 6,
    },
    seeAllText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 10 * f,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: 7,
      paddingHorizontal: 13,
      paddingBottom: 9,
    },
    chip: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 8,
      minWidth: 118,
      maxWidth: 165,
      gap: 4,
    },
    chipBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    chipMealType: {
      fontFamily: 'Inter_700Bold',
      fontSize: 8 * f,
      letterSpacing: 0.2,
    },
    chipName: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11 * f,
      letterSpacing: -0.1,
    },
    chipKcal: {
      fontFamily: 'Inter_400Regular',
      fontSize: 9 * f,
    },
  });
}
