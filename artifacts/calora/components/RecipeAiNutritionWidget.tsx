import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEstimateRecipeNutrition } from "@workspace/api-client-react";
import {
  RecipeNutritionBreakdown,
  type RecipeNutritionPalette,
} from "@/components/RecipeNutritionBreakdown";
import { formatWhole } from "@/lib/formatters";

export function RecipeAiNutritionWidget({
  recipeId,
  title,
  ingredients,
  sourceYield,
  servingCount,
  colors,
}: {
  recipeId: string;
  title: string;
  ingredients: string[];
  sourceYield: number | null;
  servingCount: number;
  colors: RecipeNutritionPalette & { card: string; primary: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const ingredientSignature = useMemo(
    () => ingredients.map((ingredient) => ingredient.trim()).join("\u0001"),
    [ingredients],
  );
  const estimateSourceYield =
    sourceYield != null && sourceYield >= 0.25 && sourceYield <= 100
      ? sourceYield
      : null;
  const estimate = useEstimateRecipeNutrition();
  const available = title.trim().length > 0 && ingredients.length > 0;

  useEffect(() => {
    setExpanded(false);
    estimate.reset();
    // Reset only when the actual recipe contract changes, never while a user is
    // adjusting displayed portions inside the open detail sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId, title, ingredientSignature, estimateSourceYield]);

  if (!available) return null;

  const requestEstimate = () => {
    estimate.mutate({
      data: {
        recipeId,
        title,
        ingredients,
        ...(estimateSourceYield == null
          ? {}
          : { sourceYield: estimateSourceYield }),
      },
    });
  };

  const toggle = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!estimate.data && !estimate.isPending) requestEstimate();
  };

  const errorMessage =
    estimate.error &&
    typeof estimate.error === "object" &&
    "message" in estimate.error
      ? String((estimate.error as { message?: unknown }).message ?? "")
      : "";

  return (
    <View
      style={[
        styles.container,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        accessibilityLabel={
          expanded
            ? "Show less AI nutrition information"
            : "Show more AI nutrition information"
        }
        onPress={toggle}
        style={({ pressed }) => [
          styles.toggle,
          { opacity: pressed ? 0.78 : 1 },
        ]}
      >
        <View style={styles.toggleText}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Nutrition details
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            AI-generated ingredient estimate · openly visible
          </Text>
        </View>
        <Text style={[styles.action, { color: colors.primary }]}>
          {expanded ? "Show less" : "Show more"}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={[styles.expanded, { borderTopColor: colors.border }]}>
          {estimate.isPending ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.mutedForeground }]}
              >
                Creating an ingredient-based estimate…
              </Text>
            </View>
          ) : estimate.data ? (
            <>
              <Text style={[styles.basis, { color: colors.mutedForeground }]}>
                {estimate.data.servingBasis}
                {servingCount !== 1
                  ? ` · shown for ${formatWhole(servingCount)} portions`
                  : ""}
              </Text>
              <RecipeNutritionBreakdown
                nutrition={estimate.data}
                servingCount={servingCount}
                colors={colors}
              />
              <Text style={[styles.note, { color: colors.mutedForeground }]}>
                {estimate.data.nutritionNote}
              </Text>
            </>
          ) : (
            <View style={styles.failure}>
              <Text
                style={[styles.failureText, { color: colors.mutedForeground }]}
              >
                {errorMessage ||
                  "Detailed nutrition could not be estimated right now."}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry AI nutrition estimate"
                onPress={requestEstimate}
                style={[styles.retry, { borderColor: colors.border }]}
              >
                <Text style={[styles.retryText, { color: colors.foreground }]}>
                  Retry estimate
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    overflow: "hidden",
  },
  toggle: {
    minHeight: 62,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleText: { flex: 1 },
  title: { fontFamily: "Inter_700Bold", fontSize: 13 },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  action: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  expanded: {
    paddingHorizontal: 13,
    paddingBottom: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loading: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 11 },
  basis: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 13,
  },
  note: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 9,
  },
  failure: { paddingTop: 13 },
  failureText: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
  retry: {
    alignSelf: "flex-start",
    marginTop: 10,
    minHeight: 34,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  retryText: { fontFamily: "Inter_700Bold", fontSize: 11 },
});
