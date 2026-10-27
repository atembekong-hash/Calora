import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppChrome";
import { ScalePressable } from "@/components/ScalePressable";
import { useCalora } from "@/context/CaloraContext";

type LearningTopic = "All" | "Nutrition" | "Fasting" | "Recipes";

type Lesson = {
  id: string;
  topic: Exclude<LearningTopic, "All">;
  title: string;
  summary: string;
  duration: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  accent: "primary" | "success" | "warning";
  takeaways: readonly string[];
  practice: string;
  destination?: {
    label: string;
    route: "/fasting" | "/(tabs)/planner" | "/(tabs)/recipes";
  };
};

const TOPICS: readonly LearningTopic[] = [
  "All",
  "Nutrition",
  "Fasting",
  "Recipes",
];

/**
 * Keep lesson copy local and structured so this destination remains useful
 * offline and can grow without bringing in a content/network dependency.
 */
const LESSONS: readonly Lesson[] = [
  {
    id: "balanced-plate-basics",
    topic: "Nutrition",
    title: "Build a balanced plate",
    summary:
      "Use flexible building blocks to make an everyday meal feel more complete.",
    duration: "4 min read",
    icon: "circle",
    accent: "success",
    takeaways: [
      "Start with foods you enjoy and can access regularly.",
      "Add a protein source, a carbohydrate-rich food, and produce when that fits the meal.",
      "Portion needs vary with your preferences, activity, culture, and goals.",
    ],
    practice:
      "Look at one upcoming meal and write down one small addition that would make it more satisfying.",
    destination: { label: "Browse recipe ideas", route: "/(tabs)/recipes" },
  },
  {
    id: "reading-your-meal-patterns",
    topic: "Nutrition",
    title: "Notice your meal patterns",
    summary:
      "Use a short, non-judgmental check-in to spot what supports your day.",
    duration: "3 min read",
    icon: "bar-chart-2",
    accent: "primary",
    takeaways: [
      "A few days of notes can show timing, hunger, energy, and routine patterns.",
      "Patterns are information, not grades or rules.",
      "Choose one observation to test rather than changing everything at once.",
    ],
    practice:
      "After a meal, notice how hungry and energized you feel an hour or two later.",
    destination: { label: "Plan your next meal", route: "/(tabs)/planner" },
  },
  {
    id: "understand-fasting-patterns",
    topic: "Fasting",
    title: "Understand fasting patterns",
    summary:
      "A practical overview of meal timing, eating windows, and when to pause.",
    duration: "5 min read",
    icon: "clock",
    accent: "warning",
    takeaways: [
      "Fasting describes time without caloric intake; approaches and schedules differ.",
      "Regular meals, hydration, sleep, and energy needs still matter when considering meal timing.",
      "A routine should be adjusted or stopped if it does not feel sustainable or safe for you.",
    ],
    practice:
      "If meal timing is a goal, plan the next day’s meals first so you have a realistic option available.",
    destination: { label: "Open Fasting", route: "/fasting" },
  },
  {
    id: "recipe-flexibility",
    topic: "Recipes",
    title: "Make recipes work for you",
    summary:
      "Adapt a recipe around your preferences, ingredients, and time without chasing perfection.",
    duration: "4 min read",
    icon: "sliders",
    accent: "primary",
    takeaways: [
      "Use a recipe as a starting point, not a pass-or-fail instruction.",
      "Substitute familiar ingredients when a swap still makes sense for the dish.",
      "Choose a simple next step: save an idea, add ingredients, or plan one meal.",
    ],
    practice:
      "Pick one recipe and name a substitution you would genuinely enjoy making.",
    destination: { label: "Explore recipes", route: "/(tabs)/recipes" },
  },
  {
    id: "plan-for-the-busy-days",
    topic: "Recipes",
    title: "Plan for busy days",
    summary:
      "Create a small fallback plan so a full schedule does not require a perfect food routine.",
    duration: "3 min read",
    icon: "calendar",
    accent: "success",
    takeaways: [
      "A repeatable meal or snack can reduce decisions when time is short.",
      "Planning can be as simple as choosing one meal ahead of time.",
      "Leave room to change the plan when your day changes.",
    ],
    practice:
      "Add one low-effort meal or snack idea to a day that tends to get busy.",
    destination: { label: "Open Weekly Planner", route: "/(tabs)/planner" },
  },
];

function accentColor(
  accent: Lesson["accent"],
  colors: ReturnType<typeof useCalora>["colors"],
) {
  if (accent === "success") return colors.success;
  if (accent === "warning") return colors.warning;
  return colors.primary;
}

function LessonCard({
  lesson,
  colors,
  fontScale,
  onPress,
}: {
  lesson: Lesson;
  colors: ReturnType<typeof useCalora>["colors"];
  fontScale: number;
  onPress: () => void;
}) {
  const accent = accentColor(lesson.accent, colors);

  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel={`Open lesson: ${lesson.title}`}
      accessibilityHint={`${lesson.duration}. ${lesson.summary}`}
      testID={`learning-lesson-${lesson.id}`}
      haptic="selection"
      scale={0.985}
      onPress={onPress}
      style={[
        styles.lessonCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.lessonIcon, { backgroundColor: colors.muted }]}>
        <Feather name={lesson.icon} size={19} color={accent} />
      </View>
      <View style={styles.lessonCopy}>
        <View style={styles.lessonMetaRow}>
          <Text
            style={[
              styles.lessonTopic,
              { color: accent, fontSize: 11 * fontScale },
            ]}
          >
            {lesson.topic.toUpperCase()}
          </Text>
          <Text
            style={[
              styles.lessonDuration,
              { color: colors.mutedForeground, fontSize: 11 * fontScale },
            ]}
          >
            {lesson.duration}
          </Text>
        </View>
        <Text
          style={[
            styles.lessonTitle,
            { color: colors.foreground, fontSize: 16 * fontScale },
          ]}
        >
          {lesson.title}
        </Text>
        <Text
          style={[
            styles.lessonSummary,
            { color: colors.mutedForeground, fontSize: 13 * fontScale },
          ]}
        >
          {lesson.summary}
        </Text>
      </View>
      <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
    </ScalePressable>
  );
}

function LessonDetail({
  lesson,
  colors,
  fontScale,
  bottomInset,
  onClose,
}: {
  lesson: Lesson;
  colors: ReturnType<typeof useCalora>["colors"];
  fontScale: number;
  bottomInset: number;
  onClose: () => void;
}) {
  const accent = accentColor(lesson.accent, colors);
  const openDestination = () => {
    onClose();
    if (lesson.destination) router.push(lesson.destination.route);
  };

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close lesson details"
          onPress={onClose}
          style={styles.modalBackdrop}
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel={`${lesson.title} lesson details`}
          style={[
            styles.detailSheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(bottomInset, 18),
            },
          ]}
        >
          <View
            style={[styles.modalHandle, { backgroundColor: colors.border }]}
          />
          <View style={styles.detailHeader}>
            <View
              style={[styles.detailIcon, { backgroundColor: colors.muted }]}
            >
              <Feather name={lesson.icon} size={22} color={accent} />
            </View>
            <View style={styles.detailHeaderCopy}>
              <Text
                style={[
                  styles.lessonTopic,
                  { color: accent, fontSize: 11 * fontScale },
                ]}
              >
                {lesson.topic.toUpperCase()} · {lesson.duration.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.detailTitle,
                  { color: colors.foreground, fontSize: 23 * fontScale },
                ]}
              >
                {lesson.title}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Close ${lesson.title}`}
              onPress={onClose}
              hitSlop={10}
              style={[styles.closeButton, { backgroundColor: colors.muted }]}
            >
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailContent}
          >
            <Text
              style={[
                styles.detailSummary,
                { color: colors.mutedForeground, fontSize: 15 * fontScale },
              ]}
            >
              {lesson.summary}
            </Text>
            <View
              style={[
                styles.takeawayCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.detailEyebrow,
                  { color: colors.primary, fontSize: 11 * fontScale },
                ]}
              >
                KEY IDEAS
              </Text>
              {lesson.takeaways.map((takeaway) => (
                <View key={takeaway} style={styles.takeawayRow}>
                  <View
                    style={[styles.takeawayDot, { backgroundColor: accent }]}
                  />
                  <Text
                    style={[
                      styles.takeawayText,
                      { color: colors.foreground, fontSize: 14 * fontScale },
                    ]}
                  >
                    {takeaway}
                  </Text>
                </View>
              ))}
            </View>
            <View
              style={[styles.practiceCard, { backgroundColor: colors.accent }]}
            >
              <Feather
                name="compass"
                size={18}
                color={colors.accentForeground}
              />
              <View style={styles.practiceCopy}>
                <Text
                  style={[
                    styles.practiceTitle,
                    {
                      color: colors.accentForeground,
                      fontSize: 13 * fontScale,
                    },
                  ]}
                >
                  TRY THIS
                </Text>
                <Text
                  style={[
                    styles.practiceText,
                    { color: colors.foreground, fontSize: 14 * fontScale },
                  ]}
                >
                  {lesson.practice}
                </Text>
              </View>
            </View>

            {lesson.topic === "Fasting" ? (
              <View
                accessible
                accessibilityRole="alert"
                style={[
                  styles.safetyCard,
                  { backgroundColor: colors.card, borderColor: colors.warning },
                ]}
              >
                <Feather name="info" size={18} color={colors.warning} />
                <View style={styles.safetyCopy}>
                  <Text
                    style={[
                      styles.safetyTitle,
                      { color: colors.foreground, fontSize: 13 * fontScale },
                    ]}
                  >
                    A note about fasting
                  </Text>
                  <Text
                    style={[
                      styles.safetyText,
                      {
                        color: colors.mutedForeground,
                        fontSize: 13 * fontScale,
                      },
                    ]}
                  >
                    Fasting is not appropriate for everyone. If you are pregnant
                    or breastfeeding, under 18, have a history of disordered
                    eating, manage a medical condition, or take medication
                    affected by food timing, consider talking with a qualified
                    health professional before changing your eating routine.
                  </Text>
                </View>
              </View>
            ) : null}

            <Text
              style={[
                styles.educationNote,
                { color: colors.mutedForeground, fontSize: 12 * fontScale },
              ]}
            >
              Calora learning content is for general education and does not
              replace individualized medical advice, diagnosis, or treatment.
            </Text>

            {lesson.destination ? (
              <ScalePressable
                accessibilityRole="button"
                accessibilityLabel={lesson.destination.label}
                haptic="none"
                onPress={openDestination}
                style={[
                  styles.destinationButton,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.destinationButtonText,
                    {
                      color: colors.primaryForeground,
                      fontSize: 14 * fontScale,
                    },
                  ]}
                >
                  {lesson.destination.label}
                </Text>
                <Feather
                  name="arrow-up-right"
                  size={16}
                  color={colors.primaryForeground}
                />
              </ScalePressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function LearningScreen() {
  const { colors, fontScale } = useCalora();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<LearningTopic>("All");
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const matchingLessons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return LESSONS.filter((lesson) => {
      const matchesTopic = topic === "All" || lesson.topic === topic;
      const searchable =
        `${lesson.title} ${lesson.summary} ${lesson.topic} ${lesson.takeaways.join(" ")}`.toLowerCase();
      return (
        matchesTopic &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [query, topic]);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader title="Learning" leftAlignTitle />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 34 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.introCard, { backgroundColor: colors.hero }]}>
          <Text
            style={[
              styles.introEyebrow,
              { color: colors.heroMuted, fontSize: 11 * fontScale },
            ]}
          >
            LEARN AT YOUR PACE
          </Text>
          <Text
            style={[
              styles.introTitle,
              { color: colors.onHero, fontSize: 24 * fontScale },
            ]}
          >
            Small ideas for everyday nourishment.
          </Text>
          <Text
            style={[
              styles.introBody,
              { color: colors.heroMuted, fontSize: 14 * fontScale },
            ]}
          >
            Explore practical starting points, then choose what fits your
            routine.
          </Text>
        </View>

        <View
          style={[
            styles.searchField,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            accessibilityLabel="Search learning topics"
            accessibilityHint="Search nutrition, fasting, and recipe lessons"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search lessons"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            value={query}
            style={[
              styles.searchInput,
              { color: colors.foreground, fontSize: 15 * fontScale },
            ]}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear learning search"
              hitSlop={10}
              onPress={() => setQuery("")}
            >
              <Feather
                name="x-circle"
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          ) : null}
        </View>

        <View
          accessibilityRole="tablist"
          accessibilityLabel="Learning topics"
          style={styles.topicList}
        >
          {TOPICS.map((item) => {
            const selected = item === topic;
            return (
              <ScalePressable
                key={item}
                accessibilityRole="tab"
                accessibilityLabel={`${item} learning topic`}
                accessibilityState={{ selected }}
                haptic="none"
                onPress={() => setTopic(item)}
                scale={0.97}
                style={[
                  styles.topicChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.topicChipText,
                    {
                      color: selected
                        ? colors.primaryForeground
                        : colors.foreground,
                      fontSize: 13 * fontScale,
                    },
                  ]}
                >
                  {item}
                </Text>
              </ScalePressable>
            );
          })}
        </View>

        <View style={styles.resultsHeading}>
          <Text
            style={[
              styles.resultsTitle,
              { color: colors.foreground, fontSize: 17 * fontScale },
            ]}
          >
            Explore lessons
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.resultsCount,
              { color: colors.mutedForeground, fontSize: 12 * fontScale },
            ]}
          >
            {matchingLessons.length}{" "}
            {matchingLessons.length === 1 ? "lesson" : "lessons"}
          </Text>
        </View>

        <View style={styles.lessonList}>
          {matchingLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              colors={colors}
              fontScale={fontScale}
              lesson={lesson}
              onPress={() => setSelectedLesson(lesson)}
            />
          ))}
        </View>

        {!matchingLessons.length ? (
          <View
            accessible
            accessibilityLiveRegion="polite"
            style={[
              styles.emptyState,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="search" size={20} color={colors.mutedForeground} />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.foreground, fontSize: 15 * fontScale },
              ]}
            >
              No lessons found
            </Text>
            <Text
              style={[
                styles.emptyText,
                { color: colors.mutedForeground, fontSize: 13 * fontScale },
              ]}
            >
              Try another word or switch to All topics.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {selectedLesson ? (
        <LessonDetail
          bottomInset={insets.bottom}
          colors={colors}
          fontScale={fontScale}
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  introCard: { borderRadius: 22, padding: 20 },
  introEyebrow: { fontFamily: "Inter_700Bold", letterSpacing: 1.05 },
  introTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.7,
    lineHeight: 30,
    marginTop: 7,
    maxWidth: 310,
  },
  introBody: {
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginTop: 9,
    maxWidth: 310,
  },
  searchField: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    minHeight: 48,
    paddingVertical: 0,
  },
  topicList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  topicChip: {
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  topicChipText: { fontFamily: "Inter_600SemiBold" },
  resultsHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  resultsTitle: { fontFamily: "Inter_700Bold", letterSpacing: -0.25 },
  resultsCount: { fontFamily: "Inter_500Medium" },
  lessonList: { gap: 10, marginTop: 12 },
  lessonCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    minHeight: 108,
    padding: 14,
  },
  lessonIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  lessonCopy: { flex: 1 },
  lessonMetaRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  lessonTopic: { fontFamily: "Inter_700Bold", letterSpacing: 0.75 },
  lessonDuration: { fontFamily: "Inter_500Medium" },
  lessonTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    lineHeight: 21,
    marginTop: 3,
  },
  lessonSummary: {
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    padding: 24,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", marginTop: 9 },
  emptyText: {
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    textAlign: "center",
  },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 16, 12, 0.58)",
  },
  detailSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "88%",
    paddingHorizontal: 20,
  },
  modalHandle: {
    alignSelf: "center",
    borderRadius: 3,
    height: 5,
    marginBottom: 16,
    marginTop: 10,
    width: 42,
  },
  detailHeader: { alignItems: "flex-start", flexDirection: "row", gap: 11 },
  detailIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  detailHeaderCopy: { flex: 1, paddingTop: 1 },
  detailTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.7,
    lineHeight: 29,
    marginTop: 4,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  detailContent: { paddingBottom: 6, paddingTop: 18 },
  detailSummary: { fontFamily: "Inter_400Regular", lineHeight: 22 },
  takeawayCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  detailEyebrow: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.9,
    marginBottom: 12,
  },
  takeawayRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 9,
    marginTop: 10,
  },
  takeawayDot: { borderRadius: 4, height: 7, marginTop: 6, width: 7 },
  takeawayText: { flex: 1, fontFamily: "Inter_400Regular", lineHeight: 20 },
  practiceCard: {
    alignItems: "flex-start",
    borderRadius: 18,
    flexDirection: "row",
    gap: 11,
    marginTop: 12,
    padding: 16,
  },
  practiceCopy: { flex: 1 },
  practiceTitle: { fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  practiceText: {
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginTop: 4,
  },
  safetyCard: {
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    marginTop: 12,
    padding: 16,
  },
  safetyCopy: { flex: 1 },
  safetyTitle: { fontFamily: "Inter_700Bold" },
  safetyText: { fontFamily: "Inter_400Regular", lineHeight: 19, marginTop: 4 },
  educationNote: {
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginHorizontal: 3,
    marginTop: 14,
  },
  destinationButton: {
    alignItems: "center",
    borderRadius: 15,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  destinationButtonText: { fontFamily: "Inter_700Bold" },
});
