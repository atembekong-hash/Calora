import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { useCalora } from '@/context/CaloraContext';

type Colors = ReturnType<typeof useCalora>["colors"];

export function SaveAsMealButton({
  colors,
  onPress,
  label = "Save as meal",
  accessibilityLabel = label,
  disabled = false,
  compact = false,
}: {
  colors: Colors;
  onPress: () => void;
  label?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.compact : styles.button,
        { backgroundColor: colors.card, borderColor: colors.primary, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 },
      ]}
    >
      <Feather name="bookmark" size={compact ? 16 : 15} color={colors.primary} />
      {!compact ? <Text style={[styles.text, { color: colors.primary }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 38, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  compact: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 11, fontWeight: '800' },
});
