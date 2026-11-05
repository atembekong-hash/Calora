import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { useCalora } from '@/context/CaloraContext';
import { formatWhole } from '@/lib/formatters';
import { androidStepsLayout } from '@/lib/steps/androidStepsLayout';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type Colors = ReturnType<typeof useCalora>['colors'];

function AndroidStepRing({ diameter, steps, goal, progress, colors, summary }: {
  diameter: number; steps: number | null; goal: number; progress: number; colors: Colors; summary: string;
}) {
  const stroke = 10;
  const radius = Math.max(0, (diameter - stroke) / 2);
  const length = 2 * Math.PI * radius;
  const dashOffset = useSharedValue(length);
  const scale = useSharedValue(1);
  const previous = useRef(steps);
  useEffect(() => {
    dashOffset.value = withTiming(length * (1 - progress), { duration: 180, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [dashOffset, length, progress]);
  useEffect(() => {
    if (steps !== null && previous.current !== null && steps > previous.current) {
      scale.value = withSequence(withTiming(1.025, { duration: 110, reduceMotion: ReduceMotion.System }), withSpring(1, { damping: 13, stiffness: 230, reduceMotion: ReduceMotion.System }));
    }
    previous.current = steps;
  }, [scale, steps]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: dashOffset.value }));
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View accessible accessibilityRole="text" accessibilityLabel={summary} testID="dashboard-steps-value" style={[styles.ring, { width: diameter, height: diameter }, animatedStyle]}>
      <Svg testID="dashboard-steps-ring" width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`}>
        <Circle cx={diameter / 2} cy={diameter / 2} r={radius} stroke={colors.muted} strokeWidth={stroke} fill="none" />
        <AnimatedCircle animatedProps={animatedProps} cx={diameter / 2} cy={diameter / 2} r={radius} stroke={colors.primary} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={length} transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`} />
      </Svg>
      <View pointerEvents="none" accessible={false} style={[styles.ringCopy, { marginHorizontal: Math.max(12, diameter * 0.16) }]}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[styles.count, { color: colors.foreground, fontSize: Math.min(25.2, diameter * 0.25) }]}>{steps === null ? '—' : formatWhole(steps)}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[styles.goal, { color: colors.mutedForeground, fontSize: diameter < 80 ? 7 : 9 }]}>{`of ${formatWhole(goal)}`}</Text>
      </View>
    </Animated.View>
  );
}

/** A presentation-only Android branch: the Today screen still owns all health
 * state, permission recovery, navigation, and milestone callbacks. */
export function AndroidStepsCard({ expanded, colors, steps, goal, progress, status, live, sessionOnly, accessibilitySummary, actionLabel, onAction, onOpenSteps, children }: {
  expanded: boolean;
  colors: Colors;
  steps: number | null;
  goal: number;
  progress: number;
  status: string;
  live: boolean;
  sessionOnly: boolean;
  accessibilitySummary: string;
  actionLabel: string | null;
  onAction?: () => void;
  onOpenSteps: () => void;
  children?: React.ReactNode;
}) {
  const { width: viewportWidth, fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const fallbackWidth = expanded || viewportWidth < 360 || fontScale > 1.22 ? viewportWidth - 32 : (viewportWidth - 12) * 0.49;
  const layout = androidStepsLayout({ cardWidth: measuredWidth ?? fallbackWidth, expanded, viewportWidth, fontScale });
  // Accessibility scaling can grow this Android card instead of clipping its
  // controls; ordinary text sizes retain the exact existing card height.
  const cardHeight = layout.largeText ? layout.height + 40 * (fontScale - 1) : layout.height;
  const displayedStatus = expanded ? status : live ? sessionOnly ? 'Live · session' : 'Live' : 'Steps today';
  return (
    <View testID={expanded ? 'dashboard-steps-card-expanded' : 'dashboard-steps-card'} onLayout={({ nativeEvent }) => setMeasuredWidth(nativeEvent.layout.width)} style={[styles.card, { height: cardHeight, padding: layout.padding, backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.body, { gap: layout.gap }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Steps progress" onPress={onOpenSteps} style={styles.ringLink}>
          <AndroidStepRing diameter={layout.diameter} steps={steps} goal={goal} progress={progress} colors={colors} summary={accessibilitySummary} />
        </Pressable>
        <View style={[styles.right, { gap: expanded ? 6 : 3 }]}>
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: colors.accent }]}><Feather name="activity" size={expanded ? 18 : 15} color={colors.accentForeground} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open Steps" onPress={onOpenSteps} hitSlop={7} style={styles.arrow}><Feather name="chevron-right" size={18} color={colors.foreground} /></Pressable>
          </View>
          <Text accessibilityRole="header" numberOfLines={expanded ? 1 : 2} style={[styles.title, { color: colors.foreground, fontSize: expanded ? 12.6 : 11 }]}>{expanded ? 'Steps today' : 'Steps'}</Text>
          <Text testID="dashboard-steps-status" accessibilityLabel={status} numberOfLines={expanded ? 3 : 2} ellipsizeMode="tail" style={[styles.status, { color: live ? expanded ? colors.success : colors.primary : colors.mutedForeground, fontSize: expanded ? 9 : 8 }]}>{displayedStatus}</Text>
          {actionLabel && onAction && <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} testID="dashboard-steps-action" onPress={onAction} style={[styles.action, { backgroundColor: expanded ? colors.muted : colors.accent, borderColor: colors.border }]}><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.actionText, { color: expanded ? colors.primary : colors.foreground }]}>{actionLabel}</Text></Pressable>}
        </View>
      </View>
      {children && <View style={styles.milestone}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, marginBottom: 0, shadowColor: '#17231f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  ringLink: { alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center', flexShrink: 0, padding: 2 },
  ring: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  ringCopy: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  count: { alignSelf: 'stretch', fontFamily: 'Inter_800ExtraBold', textAlign: 'center', letterSpacing: -0.5 },
  goal: { alignSelf: 'stretch', fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 1 },
  right: { flex: 1, minWidth: 0, justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 26 },
  icon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontFamily: 'Inter_700Bold', flexShrink: 1 },
  status: { fontFamily: 'Inter_500Medium', flexShrink: 1 },
  action: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, minHeight: 28, paddingVertical: 4, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  actionText: { fontFamily: 'Inter_700Bold', fontSize: 9, textAlign: 'center', flexShrink: 1 },
  milestone: { position: 'absolute', left: 6, right: 6, bottom: 6 },
});
