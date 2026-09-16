import { Feather } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { useCalora } from '@/context/CaloraContext';

const QUOTES: ReadonlyArray<{ text: string; author: string }> = [
  { text: "Small steps, consistently taken, change everything.", author: "" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Progress is built one honest choice at a time.", author: "" },
  { text: "What you do consistently matters more than what you do occasionally.", author: "" },
  { text: "Health is not about the weight you lose, but the life you gain.", author: "" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  { text: "Discipline is choosing what you want most over what you want now.", author: "" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Eat food. Not too much. Mostly plants.", author: "Michael Pollan" },
  { text: "Every day is a fresh start.", author: "" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "Strive for progress, not perfection.", author: "" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Fall in love with taking care of yourself.", author: "" },
  { text: "You don't have to go fast. You just have to go.", author: "" },
  { text: "A little progress each day adds up to big results.", author: "" },
  { text: "Your best is enough.", author: "" },
  { text: "The body achieves what the mind believes.", author: "" },
  { text: "Nourish to flourish.", author: "" },
  { text: "Strength comes from overcoming what you once thought you couldn't.", author: "" },
  { text: "Good habits built today are the foundation of a better tomorrow.", author: "" },
  { text: "You are what you repeatedly do.", author: "Aristotle" },
  { text: "Real change happens one good decision at a time.", author: "" },
];

type Colors = ReturnType<typeof useCalora>['colors'];

interface Props {
  colors: Colors;
  style?: StyleProp<ViewStyle>;
}

export function MotivationalQuote({ colors, style }: Props) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  const refresh = useCallback(() => {
    setIndex((current) => {
      let next = Math.floor(Math.random() * QUOTES.length);
      // Guarantee a different quote when pool has more than one entry
      let attempts = 0;
      while (next === current && QUOTES.length > 1 && attempts < 20) {
        next = Math.floor(Math.random() * QUOTES.length);
        attempts++;
      }
      return next;
    });
  }, []);

  const quote = QUOTES[index]!;

  return (
    <View
      accessibilityLabel={`Motivational quote: ${quote.text}${quote.author ? ` — ${quote.author}` : ''}`}
      style={[styles.container, { backgroundColor: colors.muted }, style]}
    >
      {/* Left accent strip */}
      <View style={[styles.accent, { backgroundColor: colors.primary }]} />

      {/* Quote body */}
      <View style={styles.body}>
        <Text style={[styles.quoteText, { color: colors.mutedForeground }]}>
          "{quote.text}"
        </Text>
        {quote.author ? (
          <Text style={[styles.author, { color: colors.mutedForeground }]}>
            — {quote.author}
          </Text>
        ) : null}
      </View>

      {/* Refresh button */}
      <Pressable
        accessibilityLabel="Show a new motivational quote"
        accessibilityRole="button"
        onPress={refresh}
        hitSlop={12}
        style={({ pressed }) => [styles.refreshButton, { opacity: pressed ? 0.45 : 0.65 }]}
      >
        <Feather name="refresh-cw" size={12} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    paddingRight: 14,
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    paddingVertical: 13,
    marginLeft: 13,
    gap: 5,
  },
  quoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  author: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.4,
  },
  refreshButton: {
    marginLeft: 8,
    padding: 4,
  },
});
