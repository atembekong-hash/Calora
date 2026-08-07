import { Feather } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Pressable, Text, StyleSheet, View } from 'react-native';

type SaveNoticeColors = {
  card: string;
  border: string;
  foreground: string;
  mutedForeground: string;
  success: string;
};

export function LocalSaveNotice({
  visible,
  message,
  colors,
  actionLabel,
  onAction,
  countdownDuration,
}: {
  visible: boolean;
  message: string;
  colors: SaveNoticeColors;
  actionLabel?: string;
  onAction?: () => void;
  /** When set, renders a shrinking countdown bar for that many ms. Only use for removal notices. */
  countdownDuration?: number;
}) {
  const progress = useSharedValue(0);
  const countdown = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 260 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, visible]);

  useEffect(() => {
    if (visible && countdownDuration) {
      // Starting a fresh countdown: reset to full before animating.
      countdown.value = 1;
      countdown.value = withTiming(0, {
        duration: countdownDuration,
        easing: Easing.linear,
      });
    } else {
      // Either the notice is hiding (fade-out in progress) or Undo was tapped and
      // countdownDuration became undefined mid-animation. In both cases, stop the
      // bar exactly where it is so it doesn't snap to full/empty before the notice
      // fades out. The next removal will reset it to 1 via the branch above.
      cancelAnimation(countdown);
    }
  }, [visible, countdownDuration, countdown]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 10 * (1 - progress.value) }],
  }));

  const countdownBarStyle = useAnimatedStyle(() => ({
    width: `${countdown.value * 100}%` as `${number}%`,
  }));

  const showCountdown = !!countdownDuration;

  return (
    <Animated.View pointerEvents={actionLabel && onAction ? 'auto' : 'none'} style={[styles.host, animatedStyle]}>
      <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.icon, { backgroundColor: colors.success }]}>
          <Feather name="check" size={12} color="#ffffff" />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.foreground }]}>Saved locally</Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
          {showCountdown && (
            <View style={[styles.countdownTrack, { backgroundColor: colors.border }]}>
              <Animated.View style={[styles.countdownFill, { backgroundColor: colors.success }, countdownBarStyle]} />
            </View>
          )}
        </View>
        {actionLabel && onAction && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            style={[styles.action, { borderColor: colors.border }]}
          >
            <Text style={[styles.actionText, { color: colors.foreground }]}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 20, right: 20, bottom: 91, zIndex: 20 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#10251a', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  icon: { width: 25, height: 25, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  message: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
  countdownTrack: { height: 2, borderRadius: 1, marginTop: 6, overflow: 'hidden' },
  countdownFill: { height: 2, borderRadius: 1 },
  action: { minHeight: 30, borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
});
