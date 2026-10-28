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

type CaloraColors = ReturnType<typeof useCalora>["colors"];

type EditorialTone = {
  background: string;
  foreground: string;
  shape: string;
  icon: string;
};

function iconColor(accent: LearningLesson["accent"], colors: CaloraColors) {
  if (accent === "success") return colors.successForeground;
  if (accent === "warning") return colors.warningForeground;
  if (accent === "info") return colors.accentForeground;
  return colors.primaryForeground;
}

function editorialTone(
  accent: LearningLesson["accent"],
  colors: CaloraColors,
): EditorialTone {
  if (accent === "success") {
    return {
      background: colors.successTint,
      foreground: colors.successForeground,
      shape: colors.success,
      icon: colors.successForeground,
    };
  }
  if (accent === "warning") {
    return {
      background: colors.warningTint,
      foreground: colors.warningForeground,
      shape: colors.warning,
      icon: colors.warningForeground,
    };
  }
  if (accent === "info") {
    return {
      background: colors.accent,
      foreground: colors.accentForeground,
      shape: colors.accentForeground,
      icon: colors.accentForeground,
    };
  }
  return {
    background: colors.destructiveTint,
    foreground: colors.primary,
    shape: colors.primary,
    icon: colors.primary,
  };
}

function TopicIcon({
  icon,
  color,
  size = 18,
}: {
  icon: LearningIcon;
  color: string;
  size?: number;
}) {
  return (
    <Feather
      name={icon as React.ComponentProps<typeof Feather>["name"]}
      size={size}
      color={color}
    />
  );
}

function LessonArtwork({
  lesson,
  colors,
  compact = false,
}: {
  lesson: LearningLesson;
  colors: CaloraColors;
  compact?: boolean;
}) {
  const tone = editorialTone(lesson.accent, colors);
  const artSize = compact ? 120 : 152;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.artwork, { backgroundColor: tone.background }]}
    >
      <View
        style={[
          styles.artRing,
          {
            borderColor: tone.shape,
            height: artSize,
            width: artSize,
          },
        ]}
      />
      <View
        style={[
          styles.artOrb,
          {
            backgroundColor: tone.shape,
            height: compact ? 44 : 54,
            width: compact ? 44 : 54,
          },
        ]}
      />
      <View
        style={[
          styles.artIcon,
          {
            backgroundColor: colors.card,
            borderColor: `${tone.shape}33`,
            height: compact ? 52 : 64,
            width: compact ? 52 : 64,
          },
        ]}
      >
        <TopicIcon
          icon={lesson.icon}
          color={tone.icon}
          size={compact ? 22 : 27}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[styles.artTopic, { color: tone.foreground }]}
      >
        {lesson.topic.toUpperCase()}
      </Text>
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
  colors: CaloraColors;
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
  colors: CaloraColors;
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
        styles.lessonCard,
        compact && styles.lessonCardCompact,
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
        <LessonArtwork lesson={lesson} colors={colors} compact={compact} />
        <View style={styles.lessonCopy}>
          <View style={styles.lessonMetaRow}>
            <Text
              style={[
                styles.lessonDuration,
                { color: colors.mutedForeground, fontSize: 11 * fontScale },
              ]}
            >
              {lesson.readingMinutes} MIN READ
            </Text>
            <ProgressMark
              lesson={lesson}
              saved={saved}
              completed={completed}
              colors={colors}
              fontScale={fontScale}
            />
          </View>
          <Text
            numberOfLines={compact ? 3 : 2}
            style={[
              styles.lessonTitle,
              {
                color: colors.foreground,
                fontSize: (compact ? 16 : 17) * fontScale,
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
          name={saved ? "bookmark" : "bookmark"}
          size={15}
          color={saved ? colors.primaryForeground : colors.foreground}
        />
      </Pressable>
    </View>
  );
}

function FeaturedLessonCard({
  lesson,
  index,
  colors,
  fontScale,
  saved,
  completed,
  onOpen,
}: {
  lesson: LearningLesson;
  index: number;
  colors: CaloraColors;
  fontScale: number;
  saved: boolean;
  completed: boolean;
  onOpen: () => void;
}) {
  const tone = editorialTone(lesson.accent, colors);
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel={`Open featured lesson: ${lesson.title}`}
      accessibilityHint={`${lesson.readingMinutes} minute read. ${lesson.dek}`}
      haptic="selection"
      onPress={onOpen}
      style={[
        styles.featuredCard,
        {
          backgroundColor: index % 2 === 0 ? tone.background : colors.hero,
          borderColor: index % 2 === 0 ? `${tone.shape}55` : colors.hero,
        },
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.featuredShapeLarge,
          {
            backgroundColor: index % 2 === 0 ? tone.shape : colors.accent,
            opacity: index % 2 === 0 ? 0.18 : 0.22,
          },
        ]}
      />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.featuredShapeSmall,
          { backgroundColor: index % 2 === 0 ? tone.shape : colors.heroMuted },
        ]}
      />
      <View style={styles.featuredTopline}>
        <View
          style={[
            styles.featuredIcon,
            {
              backgroundColor: index % 2 === 0 ? colors.card : colors.accent,
              borderColor: index % 2 === 0 ? `${tone.shape}55` : colors.accent,
            },
          ]}
        >
          <TopicIcon
            icon={lesson.icon}
            color={index % 2 === 0 ? tone.icon : colors.accentForeground}
            size={21}
          />
        </View>
        <ProgressMark
          lesson={lesson}
          saved={saved}
          completed={completed}
          colors={colors}
          fontScale={fontScale}
        />
      </View>
      <Text
        style={[
          styles.featuredMeta,
          {
            color: index % 2 === 0 ? tone.foreground : colors.heroMuted,
            fontSize: 10 * fontScale,
          },
        ]}
      >
        {lesson.topic.toUpperCase()} · {lesson.readingMinutes} MIN
      </Text>
      <Text
        numberOfLines={3}
        style={[
          styles.featuredTitle,
          {
            color: index % 2 === 0 ? colors.foreground : colors.onHero,
            fontSize: 22 * fontScale,
          },
        ]}
      >
        {lesson.title}
      </Text>
      <Text
        numberOfLines={2}
        style={[
          styles.featuredDek,
          {
            color: index % 2 === 0 ? colors.mutedForeground : colors.heroMuted,
            fontSize: 13 * fontScale,
          },
        ]}
      >
        {lesson.dek}
      </Text>
    </ScalePressable>
  );
}

function SectionHeader({
  title,
  eyebrow,
  colors,
  fontScale,
  onSeeAll,
}: {
  title: string;
  eyebrow?: string;
  colors: CaloraColors;
  fontScale: number;
  onSeeAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        {eyebrow ? (
          <Text
            style={[
              styles.sectionEyebrow,
              { color: colors.accentForeground, fontSize: 10 * fontScale },
            ]}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.foreground, fontSize: 23 * fontScale },
          ]}
        >
          {title}
        </Text>
      </View>
      {onSeeAll ? (
        <ScalePressable
          accessibilityRole="button"
          accessibilityLabel={`See all ${title}`}
          accessibilityHint="Filters the learning library to this topic"
          haptic="none"
          onPress={onSeeAll}
          scale={0.98}
          style={styles.seeAllControl}
        >
          <Text
            style={[
              styles.seeAllText,
              { color: colors.link, fontSize: 14 * fontScale },
            ]}
          >
            See all
          </Text>
          <Feather name="chevron-right" size={17} color={colors.link} />
        </ScalePressable>
      ) : null}
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
  const [savedOnly, setSavedOnly] = useState(false);

  const searchedLessons = useMemo(
    () => searchLearningLessons({ query, topic }),
    [query, topic],
  );
  const lessons = useMemo(
    () =>
      savedOnly
        ? searchedLessons.filter((lesson) =>
            readerState.savedLessonIds.includes(lesson.id),
          )
        : searchedLessons,
    [readerState.savedLessonIds, savedOnly, searchedLessons],
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
    router.push({
      pathname: "/learning/[lessonId]",
      params: { lessonId },
    } as never);
  };
  const isSaved = (lessonId: string) =>
    readerState.savedLessonIds.includes(lessonId);
  const isCompleted = (lessonId: string) =>
    readerState.progressByLessonId[lessonId]?.completed === true;
  const isBrowsingAll = topic === "All" && !query.trim() && !savedOnly;
  const chooseTopic = (nextTopic: LearningTopic) => {
    setTopic(nextTopic);
    setQuery("");
    setSavedOnly(false);
  };

  const headerAction = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        savedOnly ? "Show all learning lessons" : "Show saved learning lessons"
      }
      accessibilityHint="Filters the Learning library"
      hitSlop={10}
      onPress={() => setSavedOnly((current) => !current)}
      style={[
        styles.headerBookmark,
        { backgroundColor: savedOnly ? colors.primary : colors.muted },
      ]}
    >
      <Feather
        name="bookmark"
        size={18}
        color={savedOnly ? colors.primaryForeground : colors.foreground}
      />
    </Pressable>
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader title="Learning" back leftAlignTitle action={headerAction} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 36 },
        ]}
      >
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
            onChangeText={(value) => {
              setQuery(value);
              if (value) setSavedOnly(false);
            }}
            placeholder="Search tips, guides, and topics"
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
            const selected = item === topic && !savedOnly;
            const icon =
              item === "All"
                ? "layers"
                : (LEARNING_COLLECTIONS.find(
                    (collection) => collection.topic === item,
                  )?.icon ?? "book-open");
            return (
              <ScalePressable
                key={item}
                accessibilityRole="tab"
                accessibilityLabel={`${item} learning topic`}
                accessibilityState={{ selected }}
                haptic="none"
                onPress={() => chooseTopic(item)}
                scale={0.97}
                style={[
                  styles.topicChip,
                  {
                    backgroundColor: selected ? colors.accent : colors.card,
                    borderColor: selected ? colors.accent : colors.border,
                  },
                ]}
              >
                <TopicIcon
                  icon={icon}
                  color={
                    selected ? colors.accentForeground : colors.mutedForeground
                  }
                  size={15}
                />
                <Text
                  style={[
                    styles.topicChipText,
                    {
                      color: selected
                        ? colors.accentForeground
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
          <>
            <View style={styles.heroIntro}>
              <Text
                style={[
                  styles.heroTitle,
                  { color: colors.foreground, fontSize: 28 * fontScale },
                ]}
              >
                Make health feel more understandable.
              </Text>
              <Text
                style={[
                  styles.heroBody,
                  { color: colors.mutedForeground, fontSize: 14 * fontScale },
                ]}
              >
                Practical, original notes for everyday food, planning, habits,
                and optional fasting education.
              </Text>
            </View>

            <ScrollView
              horizontal
              pagingEnabled
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              snapToInterval={280}
              contentContainerStyle={styles.featuredRail}
            >
              {featured.map((lesson, index) => (
                <FeaturedLessonCard
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  colors={colors}
                  fontScale={fontScale}
                  saved={isSaved(lesson.id)}
                  completed={isCompleted(lesson.id)}
                  onOpen={() => openLesson(lesson.id)}
                />
              ))}
            </ScrollView>
            <View style={styles.heroCaptionRow}>
              <Text
                style={[
                  styles.heroCaption,
                  { color: colors.mutedForeground, fontSize: 12 * fontScale },
                ]}
              >
                Start with a short guide, then keep what helps.
              </Text>
              <Text
                style={[
                  styles.progressCaption,
                  { color: colors.accentForeground, fontSize: 12 * fontScale },
                ]}
              >
                {journey.completedLessons}/{LEARNING_LESSONS.length} read
              </Text>
            </View>
          </>
        ) : (
          <View
            style={[
              styles.filterSummary,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.filterSummaryIcon,
                { backgroundColor: colors.card },
              ]}
            >
              <Feather
                name={savedOnly ? "bookmark" : "filter"}
                size={17}
                color={colors.accentForeground}
              />
            </View>
            <View style={styles.filterSummaryCopy}>
              <Text
                style={[
                  styles.filterSummaryTitle,
                  { color: colors.foreground, fontSize: 14 * fontScale },
                ]}
              >
                {savedOnly
                  ? "Saved lessons"
                  : query.trim()
                    ? "Search results"
                    : `${topic} guides`}
              </Text>
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.filterSummaryBody,
                  { color: colors.mutedForeground, fontSize: 12 * fontScale },
                ]}
              >
                {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}{" "}
                to explore
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear Learning filters"
              onPress={() => {
                setQuery("");
                setTopic("All");
                setSavedOnly(false);
              }}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.clearFilterText,
                  { color: colors.link, fontSize: 12 * fontScale },
                ]}
              >
                Clear
              </Text>
            </Pressable>
          </View>
        )}

        {collectionGroups.length ? (
          <View style={styles.collectionList}>
            {collectionGroups.map(({ collection, lessons: groupLessons }) => {
              const collectionLesson = groupLessons[0];
              const tone = editorialTone(
                collectionLesson?.accent ?? "info",
                colors,
              );
              return (
                <View key={collection.id} style={styles.collectionGroup}>
                  <SectionHeader
                    title={collection.title}
                    eyebrow={isBrowsingAll ? collection.eyebrow : undefined}
                    colors={colors}
                    fontScale={fontScale}
                    onSeeAll={
                      isBrowsingAll
                        ? () => chooseTopic(collection.topic)
                        : undefined
                    }
                  />
                  {isBrowsingAll ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.lessonRail}
                    >
                      {groupLessons.map((lesson) => (
                        <EditorialLessonCard
                          key={lesson.id}
                          lesson={lesson}
                          colors={colors}
                          fontScale={fontScale}
                          saved={isSaved(lesson.id)}
                          completed={isCompleted(lesson.id)}
                          onOpen={() => openLesson(lesson.id)}
                          onToggleSaved={() =>
                            toggleSavedLearningLesson(lesson.id)
                          }
                          compact
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.filteredList}>
                      {groupLessons.map((lesson) => (
                        <EditorialLessonCard
                          key={lesson.id}
                          lesson={lesson}
                          colors={colors}
                          fontScale={fontScale}
                          saved={isSaved(lesson.id)}
                          completed={isCompleted(lesson.id)}
                          onOpen={() => openLesson(lesson.id)}
                          onToggleSaved={() =>
                            toggleSavedLearningLesson(lesson.id)
                          }
                        />
                      ))}
                    </View>
                  )}
                  <View
                    pointerEvents="none"
                    style={[
                      styles.collectionAccentLine,
                      { backgroundColor: tone.shape },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        ) : (
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
                { color: colors.foreground, fontSize: 16 * fontScale },
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
              Try another word, browse a topic, or clear the saved-only filter.
            </Text>
            <ScalePressable
              accessibilityRole="button"
              accessibilityLabel="Browse all Learning lessons"
              haptic="none"
              onPress={() => {
                setQuery("");
                setTopic("All");
                setSavedOnly(false);
              }}
              style={[styles.emptyAction, { backgroundColor: colors.accent }]}
            >
              <Text
                style={[
                  styles.emptyActionText,
                  { color: colors.accentForeground, fontSize: 13 * fontScale },
                ]}
              >
                Browse the library
              </Text>
            </ScalePressable>
          </View>
        )}

        <View
          style={[
            styles.educationNote,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Feather name="info" size={15} color={colors.accentForeground} />
          <Text
            style={[
              styles.educationNoteText,
              { color: colors.mutedForeground, fontSize: 11 * fontScale },
            ]}
          >
            Calora Learning is general education—not individualized medical
            advice, diagnosis, or treatment.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  headerBookmark: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  searchField: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    minHeight: 48,
    paddingVertical: 0,
  },
  topicList: { gap: 8, paddingBottom: 14, paddingRight: 20, paddingTop: 14 },
  topicChip: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 13,
  },
  topicChipText: { fontFamily: "Inter_600SemiBold" },
  heroIntro: { marginTop: 8 },
  heroTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.85,
    lineHeight: 33,
    maxWidth: 330,
  },
  heroBody: {
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginTop: 7,
    maxWidth: 340,
  },
  featuredRail: { gap: 12, paddingBottom: 6, paddingRight: 20, paddingTop: 17 },
  featuredCard: {
    borderRadius: 24,
    borderWidth: 1,
    height: 250,
    overflow: "hidden",
    padding: 18,
    width: 268,
  },
  featuredShapeLarge: {
    borderRadius: 180,
    height: 260,
    position: "absolute",
    right: -105,
    top: -80,
    width: 260,
  },
  featuredShapeSmall: {
    borderRadius: 40,
    bottom: -24,
    height: 80,
    position: "absolute",
    right: 28,
    transform: [{ rotate: "-22deg" }],
    width: 80,
  },
  featuredTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  featuredIcon: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  featuredMeta: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    marginTop: 25,
  },
  featuredTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.65,
    lineHeight: 26,
    marginTop: 6,
    maxWidth: 218,
  },
  featuredDek: {
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 7,
    maxWidth: 220,
  },
  heroCaptionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 17,
  },
  heroCaption: { flex: 1, fontFamily: "Inter_400Regular", lineHeight: 16 },
  progressCaption: { fontFamily: "Inter_700Bold" },
  filterSummary: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    marginTop: 5,
    padding: 12,
  },
  filterSummaryIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  filterSummaryCopy: { flex: 1 },
  filterSummaryTitle: { fontFamily: "Inter_700Bold" },
  filterSummaryBody: { fontFamily: "Inter_400Regular", marginTop: 1 },
  clearFilterText: { fontFamily: "Inter_700Bold" },
  collectionList: { gap: 31 },
  collectionGroup: { position: "relative" },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitleWrap: { flex: 1, paddingRight: 10 },
  sectionEyebrow: { fontFamily: "Inter_700Bold", letterSpacing: 1 },
  sectionTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.65,
    marginTop: 2,
  },
  seeAllControl: {
    alignItems: "center",
    flexDirection: "row",
    gap: 1,
    minHeight: 38,
    paddingLeft: 8,
  },
  seeAllText: { fontFamily: "Inter_700Bold" },
  lessonRail: { gap: 12, paddingRight: 20, paddingTop: 13 },
  filteredList: { gap: 10, marginTop: 13 },
  lessonCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
  },
  lessonCardCompact: { width: 194 },
  lessonMainPressable: { minHeight: 110 },
  artwork: {
    alignItems: "center",
    height: 116,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  artRing: {
    borderRadius: 100,
    borderWidth: 14,
    opacity: 0.16,
    position: "absolute",
    right: -28,
    top: -35,
  },
  artOrb: {
    borderRadius: 99,
    bottom: -18,
    left: -10,
    opacity: 0.18,
    position: "absolute",
  },
  artIcon: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
  },
  artTopic: {
    bottom: 9,
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.8,
    position: "absolute",
  },
  lessonCopy: { minHeight: 115, padding: 13, paddingRight: 42 },
  lessonMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  lessonDuration: { fontFamily: "Inter_700Bold", letterSpacing: 0.55 },
  lessonTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.28,
    lineHeight: 21,
    marginTop: 7,
  },
  lessonDek: { fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 5 },
  saveControl: {
    alignItems: "center",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 128,
    width: 30,
  },
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
  collectionAccentLine: {
    borderRadius: 99,
    bottom: -15,
    height: 3,
    left: 0,
    opacity: 0.45,
    position: "absolute",
    width: 38,
  },
  emptyState: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
    padding: 25,
  },
  emptyGlyph: {
    alignItems: "center",
    borderRadius: 15,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", marginTop: 11 },
  emptyText: {
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginTop: 4,
    maxWidth: 260,
    textAlign: "center",
  },
  emptyAction: {
    borderRadius: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyActionText: { fontFamily: "Inter_700Bold" },
  educationNote: {
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 31,
    padding: 13,
  },
  educationNoteText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
});
