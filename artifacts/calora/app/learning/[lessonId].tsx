import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppChrome";
import { ScalePressable } from "@/components/ScalePressable";
import { type LearningIcon, type LearningLesson } from "@/content/learning";
import { useCalora } from "@/context/CaloraContext";
import {
  getLearningLesson,
  getLearningReviewMetadata,
  getRelatedLearningLessons,
  hasLearningSafetyMetadata,
} from "@/lib/learning";
import { getLearningEditorialImage } from "@/lib/learningImages";

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
}: {
  icon: LearningIcon;
  accent: LearningLesson["accent"];
  colors: ReturnType<typeof useCalora>["colors"];
}) {
  return (
    <View style={[styles.glyph, { backgroundColor: colors.muted }]}>
      <Feather
        name={icon as React.ComponentProps<typeof Feather>["name"]}
        size={21}
        color={iconColor(accent, colors)}
      />
    </View>
  );
}

function LessonEditorialHero({
  lesson,
  colors,
}: {
  lesson: LearningLesson;
  colors: ReturnType<typeof useCalora>["colors"];
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.articlePhoto}
    >
      <Image
        accessible={false}
        cachePolicy="memory-disk"
        contentFit="cover"
        priority="high"
        source={getLearningEditorialImage(lesson)}
        style={StyleSheet.absoluteFillObject}
        testID="learning-reader-editorial-photo"
        transition={120}
      />
      <View
        pointerEvents="none"
        style={[styles.articlePhotoShade, { backgroundColor: colors.hero }]}
      />
    </View>
  );
}

export default function LearningLessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId?: string | string[] }>();
  const resolvedLessonId = Array.isArray(lessonId) ? lessonId[0] : lessonId;
  const lesson = getLearningLesson(resolvedLessonId);
  const {
    colors,
    fontScale,
    learningReaderState: readerState,
    markLearningLessonCompleted,
    toggleSavedLearningLesson,
  } = useCalora();
  const insets = useSafeAreaInsets();
  const related = useMemo(
    () => (lesson ? getRelatedLearningLessons(lesson) : []),
    [lesson],
  );

  if (!lesson) {
    return (
      <View
        style={[
          styles.page,
          styles.missingPage,
          { backgroundColor: colors.background },
        ]}
      >
        <AppHeader title="Learning" back leftAlignTitle />
        <View
          accessible
          accessibilityRole="alert"
          style={[
            styles.missingCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.missingGlyph, { backgroundColor: colors.muted }]}
          >
            <Feather
              name="book-open"
              size={21}
              color={colors.mutedForeground}
            />
          </View>
          <Text
            style={[
              styles.missingTitle,
              { color: colors.foreground, fontSize: 17 * fontScale },
            ]}
          >
            Lesson unavailable
          </Text>
          <Text
            style={[
              styles.missingBody,
              { color: colors.mutedForeground, fontSize: 12 * fontScale },
            ]}
          >
            This lesson may have moved. Browse the Learning library to choose
            another note.
          </Text>
          <ScalePressable
            accessibilityRole="button"
            accessibilityLabel="Browse Learning library"
            onPress={() => router.replace("/learning")}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.primaryForeground, fontSize: 12 * fontScale },
              ]}
            >
              Browse Learning
            </Text>
          </ScalePressable>
        </View>
      </View>
    );
  }

  const saved = readerState.savedLessonIds.includes(lesson.id);
  const completed =
    readerState.progressByLessonId[lesson.id]?.completed === true;
  const review = getLearningReviewMetadata(lesson);
  const openCta = () => router.push(lesson.cta.route);
  const toggleSaved = () => toggleSavedLearningLesson(lesson.id);
  const markCompleted = () => markLearningLessonCompleted(lesson.id);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <AppHeader title="Learning" back leftAlignTitle />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 36 },
        ]}
      >
        <View
          style={[
            styles.articleHeroStage,
            { backgroundColor: colors.destructiveTint },
          ]}
        >
          <LessonEditorialHero lesson={lesson} colors={colors} />
        </View>
        <View
          style={[
            styles.articleHeader,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.articleTopline}>
            <LessonGlyph
              icon={lesson.icon}
              accent={lesson.accent}
              colors={colors}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${saved ? "Remove" : "Save"} ${lesson.title}`}
              accessibilityState={{ selected: saved }}
              onPress={toggleSaved}
              style={[
                styles.bookmarkButton,
                { backgroundColor: saved ? colors.primary : colors.muted },
              ]}
            >
              <Feather
                name="bookmark"
                size={17}
                color={saved ? colors.primaryForeground : colors.foreground}
              />
              <Text
                style={[
                  styles.bookmarkText,
                  {
                    color: saved ? colors.primaryForeground : colors.foreground,
                    fontSize: 11 * fontScale,
                  },
                ]}
              >
                {saved ? "Saved" : "Save"}
              </Text>
            </Pressable>
          </View>
          <Text
            style={[
              styles.articleEyebrow,
              {
                color: iconColor(lesson.accent, colors),
                fontSize: 10 * fontScale,
              },
            ]}
          >
            {lesson.topic.toUpperCase()} · {lesson.readingMinutes} MINUTE READ
          </Text>
          <Text
            accessibilityRole="header"
            style={[
              styles.articleTitle,
              { color: colors.foreground, fontSize: 22 * fontScale },
            ]}
          >
            {lesson.title}
          </Text>
          <Text
            style={[
              styles.articleDek,
              { color: colors.mutedForeground, fontSize: 12 * fontScale },
            ]}
          >
            {lesson.dek}
          </Text>
          {completed ? (
            <View
              accessible
              accessibilityLabel="Lesson completed"
              style={[styles.completedPill, { backgroundColor: colors.accent }]}
            >
              <Feather name="check" size={14} color={colors.accentForeground} />
              <Text
                style={[
                  styles.completedPillText,
                  { color: colors.accentForeground, fontSize: 10 * fontScale },
                ]}
              >
                Marked complete
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.articleBody}>
          {lesson.sections.map((section, index) => (
            <View key={section.heading} style={styles.section}>
              <Text
                accessibilityRole="header"
                style={[
                  styles.sectionHeading,
                  { color: colors.foreground, fontSize: 16 * fontScale },
                ]}
              >
                {section.heading}
              </Text>
              {section.paragraphs.map((paragraph) => (
                <Text
                  key={paragraph}
                  style={[
                    styles.paragraph,
                    { color: colors.foreground, fontSize: 12 * fontScale },
                  ]}
                >
                  {paragraph}
                </Text>
              ))}
              {section.bullets?.length ? (
                <View style={styles.bulletList}>
                  {section.bullets.map((bullet) => (
                    <View key={bullet} style={styles.bulletRow}>
                      <View
                        style={[
                          styles.bulletDot,
                          { backgroundColor: iconColor(lesson.accent, colors) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.bulletText,
                          {
                            color: colors.foreground,
                            fontSize: 11 * fontScale,
                          },
                        ]}
                      >
                        {bullet}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {index < lesson.sections.length - 1 ? (
                <View
                  style={[
                    styles.sectionRule,
                    { backgroundColor: colors.border },
                  ]}
                />
              ) : null}
            </View>
          ))}

          <View style={[styles.tryCard, { backgroundColor: colors.accent }]}>
            <View style={[styles.tryGlyph, { backgroundColor: colors.card }]}>
              <Feather
                name="compass"
                size={18}
                color={colors.accentForeground}
              />
            </View>
            <View style={styles.tryCopy}>
              <Text
                style={[
                  styles.tryEyebrow,
                  { color: colors.accentForeground, fontSize: 10 * fontScale },
                ]}
              >
                TRY THIS
              </Text>
              <Text
                style={[
                  styles.tryText,
                  { color: colors.foreground, fontSize: 12 * fontScale },
                ]}
              >
                {lesson.tryThis}
              </Text>
            </View>
          </View>

          {hasLearningSafetyMetadata(lesson) ? (
            <View
              accessible
              accessibilityRole="alert"
              accessibilityLabel={lesson.safety.heading}
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
                    { color: colors.foreground, fontSize: 12 * fontScale },
                  ]}
                >
                  {lesson.safety.heading}
                </Text>
                <Text
                  style={[
                    styles.safetyText,
                    { color: colors.mutedForeground, fontSize: 12 * fontScale },
                  ]}
                >
                  {lesson.safety.body}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={[styles.reviewCard, { backgroundColor: colors.muted }]}>
            <Feather name="shield" size={15} color={colors.mutedForeground} />
            <View style={styles.reviewCopy}>
              <Text
                style={[
                  styles.reviewTitle,
                  { color: colors.foreground, fontSize: 11 * fontScale },
                ]}
              >
                Editorial review
              </Text>
              <Text
                style={[
                  styles.reviewText,
                  { color: colors.mutedForeground, fontSize: 10 * fontScale },
                ]}
              >
                Reviewed {review.reviewedAt} · {review.reviewedBy}.{" "}
                {review.sourceNote}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.educationNote,
              { color: colors.mutedForeground, fontSize: 10 * fontScale },
            ]}
          >
            Calora Learning is for general education and does not replace
            individualized medical advice, diagnosis, or treatment.
          </Text>

          <ScalePressable
            accessibilityRole="button"
            accessibilityLabel={lesson.cta.label}
            accessibilityHint="Opens the related Calora feature"
            onPress={openCta}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.primaryForeground, fontSize: 12 * fontScale },
              ]}
            >
              {lesson.cta.label}
            </Text>
            <Feather
              name="arrow-up-right"
              size={16}
              color={colors.primaryForeground}
            />
          </ScalePressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              completed ? "Lesson marked complete" : "Mark lesson complete"
            }
            accessibilityState={{ selected: completed }}
            disabled={completed}
            onPress={markCompleted}
            style={[
              styles.completeButton,
              {
                backgroundColor: completed ? colors.accent : colors.card,
                borderColor: completed ? colors.accent : colors.border,
              },
            ]}
          >
            <Feather
              name={completed ? "check-circle" : "check"}
              size={17}
              color={completed ? colors.accentForeground : colors.foreground}
            />
            <Text
              style={[
                styles.completeButtonText,
                {
                  color: completed
                    ? colors.accentForeground
                    : colors.foreground,
                  fontSize: 12 * fontScale,
                },
              ]}
            >
              {completed ? "Marked complete" : "Mark as complete"}
            </Text>
          </Pressable>
        </View>

        {related.length ? (
          <View style={styles.relatedSection}>
            <Text
              style={[
                styles.relatedEyebrow,
                { color: colors.primary, fontSize: 10 * fontScale },
              ]}
            >
              CONTINUE EXPLORING
            </Text>
            <Text
              accessibilityRole="header"
              style={[
                styles.relatedTitle,
                { color: colors.foreground, fontSize: 17 * fontScale },
              ]}
            >
              Related notes
            </Text>
            <View style={styles.relatedList}>
              {related.map((relatedLesson) => (
                <Pressable
                  key={relatedLesson.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open related lesson: ${relatedLesson.title}`}
                  onPress={() =>
                    router.replace({
                      pathname: "/learning/[lessonId]",
                      params: { lessonId: relatedLesson.id },
                    } as never)
                  }
                  style={[
                    styles.relatedCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={styles.relatedPhoto}
                  >
                    <Image
                      accessible={false}
                      cachePolicy="memory-disk"
                      contentFit="cover"
                      priority="normal"
                      source={getLearningEditorialImage(relatedLesson)}
                      style={StyleSheet.absoluteFillObject}
                      testID="learning-related-editorial-photo"
                      transition={120}
                    />
                    <View
                      pointerEvents="none"
                      style={[
                        styles.relatedPhotoShade,
                        { backgroundColor: colors.hero },
                      ]}
                    />
                  </View>
                  <View style={styles.relatedCopy}>
                    <Text
                      style={[
                        styles.relatedMeta,
                        {
                          color: colors.mutedForeground,
                          fontSize: 10 * fontScale,
                        },
                      ]}
                    >
                      {relatedLesson.topic.toUpperCase()} ·{" "}
                      {relatedLesson.readingMinutes} MIN
                    </Text>
                    <Text
                      style={[
                        styles.relatedLessonTitle,
                        { color: colors.foreground, fontSize: 12 * fontScale },
                      ]}
                    >
                      {relatedLesson.title}
                    </Text>
                  </View>
                  <Feather
                    name="arrow-up-right"
                    size={16}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingBottom: 32 },
  articleHeroStage: { height: 254, justifyContent: "center" },
  articlePhoto: {
    alignSelf: "center",
    borderRadius: 118,
    height: 236,
    marginTop: 10,
    overflow: "hidden",
    width: 236,
  },
  articlePhotoShade: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  articleHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -15,
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 22,
  },
  articleTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  glyph: {
    alignItems: "center",
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  bookmarkButton: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  bookmarkText: { fontFamily: "Inter_700Bold" },
  articleEyebrow: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.85,
    marginTop: 14,
  },
  articleTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.7,
    lineHeight: 27,
    marginTop: 5,
  },
  articleDek: {
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 350,
  },
  completedPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 99,
    flexDirection: "row",
    gap: 5,
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  completedPillText: { fontFamily: "Inter_700Bold" },
  articleBody: { paddingHorizontal: 18, paddingTop: 19 },
  section: { marginBottom: 19 },
  sectionHeading: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.35,
    lineHeight: 21,
    marginBottom: 7,
  },
  paragraph: { fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 8 },
  bulletList: { gap: 8, marginTop: 11 },
  bulletRow: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  bulletDot: { borderRadius: 3, height: 6, marginTop: 6, width: 6 },
  bulletText: { flex: 1, fontFamily: "Inter_400Regular", lineHeight: 17 },
  sectionRule: { height: StyleSheet.hairlineWidth, marginTop: 19 },
  tryCard: {
    alignItems: "flex-start",
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
    padding: 13,
  },
  tryGlyph: {
    alignItems: "center",
    borderRadius: 11,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  tryCopy: { flex: 1 },
  tryEyebrow: { fontFamily: "Inter_700Bold", letterSpacing: 0.9 },
  tryText: { fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 4 },
  safetyCard: {
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 11,
    padding: 13,
  },
  safetyCopy: { flex: 1 },
  safetyTitle: { fontFamily: "Inter_700Bold" },
  safetyText: { fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 3 },
  reviewCard: {
    alignItems: "flex-start",
    borderRadius: 15,
    flexDirection: "row",
    gap: 9,
    marginTop: 13,
    padding: 13,
  },
  reviewCopy: { flex: 1 },
  reviewTitle: { fontFamily: "Inter_700Bold" },
  reviewText: { fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 2 },
  educationNote: {
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginHorizontal: 3,
    marginTop: 15,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  primaryButtonText: { fontFamily: "Inter_700Bold" },
  completeButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 9,
    minHeight: 45,
    paddingHorizontal: 14,
  },
  completeButtonText: { fontFamily: "Inter_700Bold" },
  relatedSection: { marginTop: 23, paddingHorizontal: 18 },
  relatedEyebrow: { fontFamily: "Inter_700Bold", letterSpacing: 0.85 },
  relatedTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.35,
    marginTop: 2,
  },
  relatedList: { gap: 8, marginTop: 10 },
  relatedCard: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 61,
    padding: 9,
  },
  relatedPhoto: {
    borderRadius: 10,
    height: 42,
    overflow: "hidden",
    width: 42,
  },
  relatedPhotoShade: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  relatedCopy: { flex: 1 },
  relatedMeta: { fontFamily: "Inter_700Bold", letterSpacing: 0.65 },
  relatedLessonTitle: {
    fontFamily: "Inter_700Bold",
    lineHeight: 16,
    marginTop: 2,
  },
  missingPage: { flex: 1 },
  missingCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    margin: 20,
    padding: 24,
  },
  missingGlyph: {
    alignItems: "center",
    borderRadius: 15,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  missingTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.4,
    marginTop: 13,
  },
  missingBody: {
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
});
