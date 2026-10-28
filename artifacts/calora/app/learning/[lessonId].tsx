import { Feather } from "@expo/vector-icons";
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
              { color: colors.foreground, fontSize: 19 * fontScale },
            ]}
          >
            Lesson unavailable
          </Text>
          <Text
            style={[
              styles.missingBody,
              { color: colors.mutedForeground, fontSize: 14 * fontScale },
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
                { color: colors.primaryForeground, fontSize: 14 * fontScale },
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
          style={[styles.articleHeader, { borderBottomColor: colors.border }]}
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
                    fontSize: 12 * fontScale,
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
              { color: colors.foreground, fontSize: 29 * fontScale },
            ]}
          >
            {lesson.title}
          </Text>
          <Text
            style={[
              styles.articleDek,
              { color: colors.mutedForeground, fontSize: 16 * fontScale },
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
                  { color: colors.accentForeground, fontSize: 12 * fontScale },
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
                  { color: colors.foreground, fontSize: 20 * fontScale },
                ]}
              >
                {section.heading}
              </Text>
              {section.paragraphs.map((paragraph) => (
                <Text
                  key={paragraph}
                  style={[
                    styles.paragraph,
                    { color: colors.foreground, fontSize: 15 * fontScale },
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
                            fontSize: 14 * fontScale,
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
                  { color: colors.foreground, fontSize: 14 * fontScale },
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
                    { color: colors.foreground, fontSize: 14 * fontScale },
                  ]}
                >
                  {lesson.safety.heading}
                </Text>
                <Text
                  style={[
                    styles.safetyText,
                    { color: colors.mutedForeground, fontSize: 13 * fontScale },
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
                  { color: colors.foreground, fontSize: 12 * fontScale },
                ]}
              >
                Editorial review
              </Text>
              <Text
                style={[
                  styles.reviewText,
                  { color: colors.mutedForeground, fontSize: 11 * fontScale },
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
              { color: colors.mutedForeground, fontSize: 11 * fontScale },
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
                { color: colors.primaryForeground, fontSize: 14 * fontScale },
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
                  fontSize: 14 * fontScale,
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
                { color: colors.foreground, fontSize: 20 * fontScale },
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
                    style={[
                      styles.relatedGlyph,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <Feather
                      name={
                        relatedLesson.icon as React.ComponentProps<
                          typeof Feather
                        >["name"]
                      }
                      size={16}
                      color={iconColor(relatedLesson.accent, colors)}
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
                        { color: colors.foreground, fontSize: 14 * fontScale },
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
  content: { paddingBottom: 36 },
  articleHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: 23,
    paddingTop: 19,
  },
  articleTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  glyph: {
    alignItems: "center",
    borderRadius: 15,
    height: 48,
    justifyContent: "center",
    width: 48,
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
    letterSpacing: 1,
    marginTop: 18,
  },
  articleTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.95,
    lineHeight: 35,
    marginTop: 6,
  },
  articleDek: {
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
    marginTop: 8,
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
  articleBody: { paddingHorizontal: 20, paddingTop: 24 },
  section: { marginBottom: 23 },
  sectionHeading: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.45,
    lineHeight: 25,
    marginBottom: 9,
  },
  paragraph: { fontFamily: "Inter_400Regular", lineHeight: 23, marginTop: 10 },
  bulletList: { gap: 10, marginTop: 14 },
  bulletRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  bulletDot: { borderRadius: 4, height: 7, marginTop: 7, width: 7 },
  bulletText: { flex: 1, fontFamily: "Inter_400Regular", lineHeight: 20 },
  sectionRule: { height: StyleSheet.hairlineWidth, marginTop: 23 },
  tryCard: {
    alignItems: "flex-start",
    borderRadius: 19,
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
    padding: 16,
  },
  tryGlyph: {
    alignItems: "center",
    borderRadius: 13,
    height: 39,
    justifyContent: "center",
    width: 39,
  },
  tryCopy: { flex: 1 },
  tryEyebrow: { fontFamily: "Inter_700Bold", letterSpacing: 0.9 },
  tryText: { fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: 5 },
  safetyCard: {
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    marginTop: 13,
    padding: 16,
  },
  safetyCopy: { flex: 1 },
  safetyTitle: { fontFamily: "Inter_700Bold" },
  safetyText: { fontFamily: "Inter_400Regular", lineHeight: 19, marginTop: 4 },
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
    borderRadius: 15,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 51,
    paddingHorizontal: 16,
  },
  primaryButtonText: { fontFamily: "Inter_700Bold" },
  completeButton: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 49,
    paddingHorizontal: 16,
  },
  completeButtonText: { fontFamily: "Inter_700Bold" },
  relatedSection: { marginTop: 28, paddingHorizontal: 20 },
  relatedEyebrow: { fontFamily: "Inter_700Bold", letterSpacing: 1 },
  relatedTitle: {
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.45,
    marginTop: 3,
  },
  relatedList: { gap: 9, marginTop: 13 },
  relatedCard: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 67,
    padding: 11,
  },
  relatedGlyph: {
    alignItems: "center",
    borderRadius: 11,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  relatedCopy: { flex: 1 },
  relatedMeta: { fontFamily: "Inter_700Bold", letterSpacing: 0.65 },
  relatedLessonTitle: {
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
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
