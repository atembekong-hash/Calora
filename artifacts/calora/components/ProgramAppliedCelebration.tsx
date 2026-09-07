import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { useCalora } from '@/context/CaloraContext';

type Colors = ReturnType<typeof useCalora>['colors'];

export function ProgramAppliedCelebration({
  visible,
  programLabel,
  message,
  colors,
  onDismiss,
}: {
  visible: boolean;
  programLabel: string;
  message: string;
  colors: Colors;
  onDismiss: () => void;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;

    opacity.value = withDelay(40, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(40, withSpring(1, { damping: 15, stiffness: 180 }));
    iconScale.value = withDelay(420, withSequence(
      withSpring(1.18, { damping: 9, stiffness: 260 }),
      withSpring(1, { damping: 12, stiffness: 180 }),
    ));

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    const dismissTimer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      });
      scale.value = withTiming(0.94, { duration: 220, easing: Easing.out(Easing.cubic) });
    }, 3200);

    return () => clearTimeout(dismissTimer);
  }, [iconScale, onDismiss, opacity, scale, visible]);

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={`${programLabel} is now active. ${message}`}
      style={[styles.host, bannerStyle]}
    >
      <View style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.primary }]}>
        <Animated.View style={[styles.iconWrap, { backgroundColor: colors.primary }, iconStyle]}>
          <Feather name="star" size={16} color={colors.primaryForeground} />
        </Animated.View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.foreground }]}>Program active</Text>
          <Text style={[styles.program, { color: colors.primary }]}>{programLabel}</Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
        </View>
        <Pressable
          accessibilityLabel="Dismiss program celebration"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onDismiss}
          style={styles.close}
        >
          <Feather name="x" size={15} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 151,
    zIndex: 30,
  },
  banner: {
    minHeight: 66,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#10251a',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  program: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    marginTop: 1,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  close: {
    padding: 3,
    alignSelf: 'flex-start',
  },
});