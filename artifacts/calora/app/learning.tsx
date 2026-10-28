import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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
import {
  LEARNING_COLLECTIONS,
  LEARNING_LESSONS,
  LEARNING_TOPICS,
  type LearningIcon,
  type LearningLesson,
  type LearningTopic,
} from "@/content/learning";
import { useCalora } from "@/context/CaloraContext";
import {
  getFeaturedLearningLessons,
  getLearningJourneyProgress,
  groupLearningLessonsByCollection,
  searchLearningLessons,
} from "@/lib/learning";

function iconColor(
  accent: LearningLesson["accent"],
  colors: ReturnType<typeof useCalora>["colors"],
) {
  if (accent === "success") return colors.success;
  if (accent === "warning") return colors.warning;
  if (accent === "info") return colors.accentForeground;
  return colors.primary;
}

function LessonGlyph({
  icon,
  accent,
  colors,
  size = 18,
}: {
  icon: LearningIcon;
  accent: LearningLesson["accent"];
  colors: ReturnType<typeof useCalora>["colors"];
  size?: number;
}) {
  return (
    <View style={[styles.glyph, { backgroundColor: colors.muted }]}>
      <Feather
        name={icon as React.ComponentProps<typeof Feather>["name"]}
        size={size}
        color={iconColor(accent, colors)}
      />
    </View>
  );
}

function ProgressMark({
  lesson,
  saved,
  completed,
  colors,
  fontScale,
}: {
  lesson: LearningLesson;
  saved: boolean;
  completed: boolean;
  colors: ReturnType<typeof useCalora>["colors"];
  fontScale: number;
}) {
  if (completed) {
    return (
      <View
        accessible
        accessibilityLabel={`${lesson.title} completed`}
        style={[styles.statusPill, { backgroundColor: colors.accent }]}
      >
        <Feather name="check" size={12} color={colors.accentForeground} />
        <Text
          style={[
            styles.statusPillText,
            { color: colors.accentForeground, fontSize: 11 * fontScale },
          ]}
        >
          Done
        </Text>
      </View>
    );
  }
  if (saved) {
    return (
      <View
        accessible
        accessibilityLabel={`${lesson.title} saved`}
        style={[styles.savedMark, { backgroundColor: colors.muted }]}
      >
        <Feather name="bookmark" size={13} color={colors.foreground} />
      </View>
    );
  }
  return null;
}

function EditorialLessonCard({
  lesson,
  colors,
  fontScale,
  saved,
  completed,
  onOpen,
  onToggleSaved,
  compact = false,
}: {
  lesson: LearningLesson;
  colors: ReturnType<typeof useCalora>["colors"];
  fontScale: number;
  saved: boolean;
  completed: boolean;
  onOpen: () => void;
  onToggleSaved: () => void;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        compact ? styles.compactCard : styles.lessonCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open lesson: ${lesson.title}`}
        accessibilityHint={`${lesson.readingMinutes} minute read. ${lesson.dek}`}
        onPress={onOpen}
        style={styles.lessonMainPressable}
      >
        <LessonGlyph
          icon={lesson.icon}
          accent={lesson.accent}
          colors={colors}
        />
        <View style={styles.lessonCopy}>
          <View style={styles.lessonMetaRow}>
            <Text
              style={[
                styles.lessonTopic,
                {
                  color: iconColor(lesson.accent, colors),
                  fontSize: 10 * fontScale,
                },
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
              {lesson.readingMinutes} MIN READ
            </Text>
          </View>
          <Text
            style={[
              styles.lessonTitle,
              {
                color: colors.foreground,
                fontSize: (compact ? 15 : 16) * fontScale,
              },
            ]}
          >
            {lesson.title}
          </Text>
          {!compact ? (
            <Text
              numberOfLines={2}
              style={[
                styles.lessonDek,
                { color: colors.mutedForeground, fontSize: 13 * fontScale },
              ]}
            >
              {lesson.dek}
            </Text>
          ) : null}
        </View>
        <View style={styles.lessonEnd}>
          <ProgressMark
            lesson={lesson}
            saved={saved}
            completed={completed}
            colors={colors}
            fontScale={fontScale}
          />
          <Feather
            name="arrow-up-right"
            size={17}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${saved ? "Remove" : "Save"} ${lesson.title}`}
        accessibilityHint="Saves this lesson to your reader list"
        hitSlop={8}
        onPress={onToggleSaved}
        style={[
          styles.saveControl,
          { backgroundColor: saved ? colors.primary : colors.muted },
        ]}
      >
        <Feather
          name="bookmark"
          size={15}
          color={saved ? colors.primaryForeground : colors.foreground}
        />
      </Pressable>
    </View>
  );
}

export default function LearningScreen() {
  const {
    colors,
    fontScale,
    learningReaderState: readerState,
    toggleSavedLearningLesson,
  } = useCalora();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<LearningTopic>("All");

  const lessons = useMemo(
    () => searchLearningLessons({ query, topic }),
    [query, topic],
  );
  const collectionGroups = useMemo(
    () => groupLearningLessonsByCollection(lessons),
    [lessons],
  );
  const featured = useMemo(
    () => getFeaturedLearningLessons(LEARNING_LESSONS, 3),
    [],
  );
  const journey = useMemo(
    () => getLearningJourneyProgress(readerState),
    [readerState],
  );

  const openLesson = (lessonId: string) => {
    // Expo's generated route union refreshes with Expo tooling. Preserve the
    // canonical local route while that generated declaration catches up.
    router.push({
      pathname: "/learning/[lessonId]",
      params: { lessonId },
    } as never);
  };
  const toggleSaved = (lessonId: string) => {
    toggleSavedLearningLesson(lessonId);
  };
  const isSaved = (lessonId: string) =>
    readerState.savedLessonIds.includes(lessonId);
  const isCompleted = (lessonId: string) =>
    readerState.progressByLessonId[lessonId]?.completed === true;
  const isBrowsingAll = topic === "All" && !query.trim();

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader title="Learning" back leftAlignTitle />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 36 },
        ]}
      >
        <View style={[styles.hero, { backgroundColor: colors.hero }]}>
          <View style={styles.heroTopline}>
            <Text
              style={[
                styles.heroEyebrow,
                { color: colors.heroMuted, fontSize: 10 * fontScale },
              ]}
            >
              CALORA FIELD NOTES
            </Text>
            <View
              style={[styles.libraryPill, { borderColor: colors.heroMuted }]}
            >
              <Text
                style={[
                  styles.libraryPillText,
                  { color: colors.onHero, fontSize: 10 * fontScale },
                ]}
              >
                {LEARNING_LESSONS.length} LESSONS
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.heroTitle,
              { color: colors.onHero, fontSize: 26 * fontScale },
            ]}
          >
            Learn the why. Keep what works.
          </Text>
          <Text
            style={[
              styles.heroBody,
              { color: colors.heroMuted, fontSize: 14 * fontScale },
            ]}
          >
            Original, practical notes for everyday nourishment—read at your own
            pace.
          </Text>
          <View
            style={[styles.journeyRow, { borderTopColor: colors.heroMuted }]}
          >
            <View>
              <Text
                style={[
                  styles.journeyNumber,
                  { color: colors.onHero, fontSize: 17 * fontScale },
                ]}
              >
                {journey.completedLessons}
              </Text>
              <Text
                style={[
                  styles.journeyCaption,
                  { color: colors.heroMuted, fontSize: 10 * fontScale },
                ]}
              >
                FINISHED
              </Text>
            </View>
            <View
              style={[
                styles.journeyDivider,
                { backgroundColor: colors.heroMuted },
              ]}
            />
            <View>
              <Text
                style={[
                  styles.journeyNumber,
                  { color: colors.onHero, fontSize: 17 * fontScale },
                ]}
              >
                {journey.savedLessons}
              </Text>
              <Text
                style={[
                  styles.journeyCaption,
                  { color: colors.heroMuted, fontSize: 10 * fontScale },
                ]}
              >
                SAVED
              </Text>
            </View>
            <Text
              style={[
                styles.journeyPrompt,
                { color: colors.heroMuted, fontSize: 11 * fontScale },
              ]}
            >
              Your reader list can grow with you.
            </Text>
          </View>
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
            accessibilityHint="Search all learning lessons and collections"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search the library"
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          accessibilityLabel="Learning topics"
          contentContainerStyle={styles.topicList}
        >
          {LEARNING_TOPICS.map((item) => {
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
        </ScrollView>

        {isBrowsingAll ? (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text
                  style={[
                    styles.sectionEyebrow,
                    { color: colors.primary, fontSize: 10 * fontScale },
                  ]}
                >
                  EDITOR&apos;S STARTING POINTS
                </Text>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.foreground, fontSize: 19 * fontScale },
                  ]}
                >
                  Read this next
                </Text>
              </View>
              <Text
                style={[
                  styles.sectionCount,
                  { color: colors.mutedForeground, fontSize: 12 * fontScale },
                ]}
              >
                {journey.percentComplete}% complete
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredRail}
            >
              {featured.map((lesson, index) => (
                <ScalePressable
                  key={lesson.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open featured lesson: ${lesson.title}`}
                  accessibilityHint={`${lesson.readingMinutes} minute read. ${lesson.dek}`}
                  haptic="selection"
                  onPress={() => openLesson(lesson.id)}
                  style={[
                    styles.featuredCard,
                    {
                      backgroundColor:
                        index === 0 ? colors.accent : colors.card,
                      borderColor: index === 0 ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <View style={styles.featuredCardTopline}>
                    <LessonGlyph
                      icon={lesson.icon}
                      accent={lesson.accent}
                      colors={colors}
                    />
                    <ProgressMark
                      lesson={lesson}
                      saved={isSaved(lesson.id)}
                      completed={isCompleted(lesson.id)}
                      colors={colors}
                      fontScale={fontScale}
                    />
                  </View>
                  <Text
                    style={[
                      styles.featuredMeta,
                      {
                        color: iconColor(lesson.accent, colors),
                        fontSize: 10 * fontScale,
                      },
                    ]}
                  >
                    {lesson.topic.toUpperCase()} · {lesson.readingMinutes} MIN
                  </Text>
                  <Text
                    style={[
                      styles.featuredTitle,
                      { color: colors.foreground, fontSize: 17 * fontScale },
                    ]}
                  >
                    {lesson.title}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.featuredDek,
                      {
                        color: colors.mutedForeground,
                        fontSize: 12 * fontScale,
                      },
                    ]}
                  >
                    {lesson.dek}
                  </Text>
                </ScalePressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.libraryHeader}>
          <View>
            <Text
              style={[
                styles.sectionEyebrow,
                { color: colors.primary, fontSize: 10 * fontScale },
              ]}
            >
              {query.trim() ? "SEARCH RESULTS" : "THE LIBRARY"}
            </Text>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.foreground, fontSize: 19 * fontScale },
              ]}
            >
              {query.trim() ? "Lessons that match" : "Explore by collection"}
            </Text>
          </View>
          <Text
            accessibilityLiveRegion="polite"
            style={[
              styles.sectionCount,
              { color: colors.mutedForeground, fontSize: 12 * fontScale },
            ]}
          >
            {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
          </Text>
        </View>

        <View style={styles.collectionList}>
          {collectionGroups.map(({ collection, lessons: groupLessons }) => (
            <View key={collection.id} style={styles.collectionGroup}>
              <View style={styles.collectionHeading}>
                <View
                  style={[
                    styles.collectionGlyph,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={
                      collection.icon as React.ComponentProps<
                        typeof Feather
                      >["name"]
                    }
                    size={15}
                    color={colors.accentForeground}
                  />
                </View>
                <View style={styles.collectionHeadingCopy}>
                  <Text
                    style={[
                      styles.collectionEyebrow,
                      {
                        color: colors.mutedForeground,
                        fontSize: 10 * fontScale,
                      },
                    ]}
                  >
                    {collection.eyebrow}
                  </Text>
                  <Text
                    style={[
                      styles.collectionTitle,
                      { color: colors.foreground, fontSize: 16 * fontScale },
                    ]}
                  >
                    {collection.title}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.collectionDescription,
                  { color: colors.mutedForeground, fontSize: 12 * fontScale },
                ]}
              >
                {collection.description}
              </Text>
              <View style={styles.lessonList}>
                {groupLessons.map((lesson) => (
                  <EditorialLessonCard
                    key={lesson.id}
                    lesson={lesson}
                    colors={colors}
                    fontScale={fontScale}
                    saved={isSaved(lesson.id)}
                    completed={isCompleted(lesson.id)}
                    onOpen={() => openLesson(lesson.id)}
                    onToggleSaved={() => toggleSaved(lesson.id)}
                    compact={groupLessons.length > 2}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>

        {!lessons.length ? (
          <View
            accessible
            accessibilityLiveRegion="polite"
            style={[
              styles.emptyState,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.emptyGlyph, { backgroundColor: colors.muted }]}
            >
              <Feather name="search" size={19} color={colors.mutedForeground} />
            </View>
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
              Try another word or return to all topics to browse the full
              library.
            </Text>
          </View>
        ) : null}

        <Text
          style={[
            styles.educationNote,
            { color: colors.mutedForeground, fontSize: 11 * fontScale },
          ]}
        >
          Calora Learning offers general education, not individualized medical
          advice, diagnosis, or treatment.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18 },
  hero: { borderRadius: 24, overflow: "hidden", padding: 20 },
  heroTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroEyebrow: { fontFamily: "Inter_700Bold", letterSpacing: 1.15 },
  libraryPill: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  libraryPillText: { fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  heroTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.85,
    lineHeight: 31,
    marginTop: 13,
    maxWidth: 280,
  },
  heroBody: {
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 306,
  },
  journeyRow: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    paddingTop: 14,
  },
  journeyNumber: { fontFamily: "Inter_800ExtraBold", letterSpacing: -0.4 },
  journeyCaption: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.7,
    marginTop: 2,
  },
  journeyDivider: {
    height: 26,
    opacity: 0.45,
    width: StyleSheet.hairlineWidth,
  },
  journeyPrompt: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    lineHeight: 15,
    textAlign: "right",
  },
  searchField: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    minHeight: 48,
    paddingVertical: 0,
  },
  topicList: { gap: 8, paddingVertical: 13, paddingRight: 20 },
  topicChip: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 13,
  },
  topicChipText: { fontFamily: "Inter_600SemiBold" },
  featuredSection: { marginTop: 8 },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionEyebrow: { fontFamily: "Inter_700Bold", letterSpacing: 1.0 },
  sectionTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.45,
    marginTop: 3,
  },
  sectionCount: { fontFamily: "Inter_600SemiBold", paddingBottom: 2 },
  featuredRail: { gap: 10, paddingBottom: 3, paddingRight: 20, paddingTop: 12 },
  featuredCard: {
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 178,
    padding: 15,
    width: 230,
  },
  featuredCardTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  featuredMeta: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.75,
    marginTop: 15,
  },
  featuredTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.3,
    lineHeight: 21,
    marginTop: 4,
  },
  featuredDek: { fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 5 },
  glyph: {
    alignItems: "center",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  libraryHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 21,
  },
  collectionList: { gap: 25, marginTop: 15 },
  collectionGroup: { gap: 9 },
  collectionHeading: { alignItems: "center", flexDirection: "row", gap: 9 },
  collectionGlyph: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 31,
    justifyContent: "center",
    width: 31,
  },
  collectionHeadingCopy: { flex: 1 },
  collectionEyebrow: { fontFamily: "Inter_700Bold", letterSpacing: 0.75 },
  collectionTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.25,
    marginTop: 1,
  },
  collectionDescription: {
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginLeft: 40,
    maxWidth: 330,
  },
  lessonList: { gap: 9 },
  lessonCard: {
    borderRadius: 17,
    borderWidth: 1,
    minHeight: 105,
    overflow: "hidden",
  },
  compactCard: {
    borderRadius: 17,
    borderWidth: 1,
    minHeight: 80,
    overflow: "hidden",
  },
  lessonMainPressable: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    minHeight: 78,
    paddingHorizontal: 13,
    paddingRight: 50,
    paddingVertical: 12,
  },
  lessonCopy: { flex: 1 },
  lessonMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  lessonTopic: { fontFamily: "Inter_700Bold", letterSpacing: 0.75 },
  lessonDuration: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  lessonTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    lineHeight: 20,
    marginTop: 3,
  },
  lessonDek: { fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 4 },
  lessonEnd: { alignItems: "flex-end", gap: 7, justifyContent: "center" },
  statusPill: {
    alignItems: "center",
    borderRadius: 99,
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statusPillText: { fontFamily: "Inter_700Bold" },
  savedMark: {
    alignItems: "center",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  saveControl: {
    alignItems: "center",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 12,
    width: 30,
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 15,
    padding: 24,
  },
  emptyGlyph: {
    alignItems: "center",
    borderRadius: 15,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", marginTop: 10 },
  emptyText: {
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginTop: 4,
    maxWidth: 260,
    textAlign: "center",
  },
  educationNote: {
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginHorizontal: 4,
    marginTop: 26,
  },
});
