import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { useCalora } from '@/context/CaloraContext';
import { formatWhole } from '@/lib/formatters';

type Colors = ReturnType<typeof useCalora>['colors'];

/**
 * A brief foreground-only acknowledgement for a motion event that crossed a
 * thousand-step boundary. The caller owns its queue, so provider catch-up can
 * never recreate old celebrations.
 */
export function StepMilestoneCelebration({
  milestone,
  colors,
  onDismiss,
}: {
  milestone: number | null;
  colors: Colors;
  onDismiss: () => void;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  const scale = useSharedValue(0.96);
  const sparkles = useSharedValue(0);

  useEffect(() => {
    if (milestone === null) return;

    opacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    translateY.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    scale.value = withSequence(
      withTiming(1.02, {
        duration: 170,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
      withTiming(1, {
        duration: 160,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
    sparkles.value = withSequence(
      withTiming(1, { duration: 180, reduceMotion: ReduceMotion.System }),
      withDelay(1_100, withTiming(0, { duration: 350, reduceMotion: ReduceMotion.System })),
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    const dismissTimer = setTimeout(() => {
      opacity.value = withTiming(0, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      });
      translateY.value = withTiming(-5, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    }, 2_800);

    return () => clearTimeout(dismissTimer);
  }, [milestone, onDismiss, opacity, scale, sparkles, translateY]);

  const celebrationStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkles.value,
    transform: [{ scale: 0.8 + sparkles.value * 0.2 }],
  }));

  if (milestone === null) return null;

  return (
    <Animated.View
      testID="step-milestone-celebration"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${formatWhole(milestone)} steps reached. Great momentum.`}
      style={[styles.host, celebrationStyle]}
    >
      <View style={[styles.card, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Feather name="award" size={16} color={colors.primaryForeground} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>STEP MILESTONE</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{formatWhole(milestone)} steps</Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>Great momentum. Keep moving at your pace.</Text>
        </View>
        <Animated.View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[styles.sparkles, sparkleStyle]}
        >
          <Feather name="star" size={13} color={colors.primary} />
          <Feather name="zap" size={13} color={colors.primary} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    marginTop: 14,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 15,
    minHeight: 70,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.9,
  },
  title: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 16,
    letterSpacing: -0.2,
    marginTop: 1,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 1,
  },
  sparkles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingTop: 2,
  },
});
