import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleProp, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import { ScalePressable } from '@/components/ScalePressable';
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DailyActivity, Mood, useCalora } from '@/context/CaloraContext';
import { LocalSaveNotice } from '@/components/LocalSaveNotice';
import { MotivationalQuote } from '@/components/MotivationalQuote';
import { router } from 'expo-router';
import { dateKey } from '@/lib/dates';
import { deriveWeeklySignals, type WeeklySignalDay, trustScore } from '@/lib/weeklySignals';
import { filterForgottenSources } from '@/lib/livingMemory';

const moodColors: Record<Mood, string> = {
  energized: '#e5ad55',
  good: '#5dba7d',
  okay: '#7394f2',
  low: '#9875c7',
  stressed: '#ef6b4f',
};

function AnimatedReveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 14 * (1 - progress.value) }],
  }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

function PulseIcon({ colors }: { colors: ReturnType<typeof useCalora>['colors'] }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.08, { duration: 1350, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <Animated.View style={[styles.iconCircle, { backgroundColor: 'rgba(157,215,189,0.15)' }, animatedStyle]}>
      <Feather name="activity" size={20} color={colors.heroMuted} />
    </Animated.View>
  );
}

function AnimatedBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress, value]);
  const animatedStyle = useAnimatedStyle(() => ({ height: 128 * (Math.max(0, Math.min(value, 100)) / 100) * progress.value }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />;
}

// ─── Confetti burst ───────────────────────────────────────────────────────────
const CONFETTI_COLORS_LIST = ['#5dba7d', '#e5ad55', '#7394f2', '#ef6b4f', '#9875c7', '#f4d35e', '#f5a7c7', '#5bc8ef'];
const CONFETTI_COUNT = 30;

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

type ParticleConfig = {
  color: string;
  angle: number;
  speed: number;
  width: number;
  height: number;
  borderRadius: number;
  rotSpeed: number;
  offsetX: number;
};

function ConfettiParticle({ progress, fadeOpacity, config }: {
  progress: SharedValue<number>;
  fadeOpacity: SharedValue<number>;
  config: ParticleConfig;
}) {
  const animStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const x = Math.cos(config.angle) * config.speed * p + config.offsetX;
    const y = Math.sin(config.angle) * config.speed * p + 140 * p * p;
    return {
      opacity: fadeOpacity.value * Math.max(0, 1 - p * 0.35),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${config.rotSpeed * p}deg` },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: config.width,
          height: config.height,
          borderRadius: config.borderRadius,
          backgroundColor: config.color,
          left: '50%',
          top: 10,
        },
        animStyle,
      ]}
    />
  );
}

function ConfettiBurst({ active }: { active: boolean }) {
  const progress = useSharedValue(0);
  const fadeOpacity = useSharedValue(0);

  const particles = useMemo<ParticleConfig[]>(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => {
      // Spread particles in a wide upward fan (-160° to -20° from horizontal)
      const spreadAngle = -Math.PI + (i / CONFETTI_COUNT) * Math.PI + seededRandom(i * 17) * 0.55;
      const size = 5 + seededRandom(i * 5) * 8;
      const isCircle = i % 5 === 0;
      return {
        color: CONFETTI_COLORS_LIST[i % CONFETTI_COLORS_LIST.length],
        angle: spreadAngle,
        speed: 55 + seededRandom(i * 7) * 95,
        width: size,
        height: isCircle ? size : size * 0.42,
        borderRadius: isCircle ? size / 2 : 2,
        rotSpeed: (seededRandom(i * 11) - 0.5) * 600,
        offsetX: (seededRandom(i * 13) - 0.5) * 60,
      };
    }), []);

  useEffect(() => {
    if (active) {
      progress.value = 0;
      fadeOpacity.value = 1;
      progress.value = withTiming(1, { duration: 2100, easing: Easing.out(Easing.cubic) });
      fadeOpacity.value = withDelay(1500, withTiming(0, { duration: 600 }));
    }
  // Run only when active first becomes true; no cleanup needed — animation self-terminates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <View style={styles.confettiBurstContainer} pointerEvents="none">
      {particles.map((config, i) => (
        <ConfettiParticle key={i} progress={progress} fadeOpacity={fadeOpacity} config={config} />
      ))}
    </View>
  );
}

function GoalCelebrationBanner({ colors, targetKg, onDismiss }: { colors: ReturnType<typeof useCalora>['colors']; targetKg: number; onDismiss: () => void }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.88);
  const starScale = useSharedValue(1);
  useEffect(() => {
    opacity.value = withDelay(120, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(120, withSpring(1, { damping: 14, stiffness: 140 }));
    starScale.value = withDelay(680, withSequence(
      withTiming(1.28, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) }),
    ));
  }, [opacity, scale, starScale]);
  const bannerStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const starStyle = useAnimatedStyle(() => ({ transform: [{ scale: starScale.value }] }));

  const handleDismiss = () => {
    opacity.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
    scale.value = withTiming(0.88, { duration: 260, easing: Easing.out(Easing.cubic) });
  };

  return (
    <Animated.View style={[styles.celebrationBanner, { backgroundColor: '#e8f8ef', borderColor: '#5dba7d' }, bannerStyle]}>
      <Animated.View style={[styles.celebrationIconWrap, { backgroundColor: '#5dba7d' }, starStyle]}>
        <Feather name="star" size={15} color="#ffffff" />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.celebrationTitle, { color: '#1b5e38' }]}>Goal reached!</Text>
        <Text style={[styles.celebrationBody, { color: '#3a7d57' }]}>You hit {targetKg.toFixed(0)} kg. Keep going — consistency is the real win.</Text>
      </View>
      <Pressable
        onPress={handleDismiss}
        hitSlop={12}
        accessibilityLabel="Dismiss goal banner"
        accessibilityRole="button"
        style={styles.celebrationClose}
      >
        <Feather name="x" size={16} color="#3a7d57" />
      </Pressable>
    </Animated.View>
  );
}

function AnimatedTrackFill({ percentage, color, trackColor }: { percentage: number; color: string; trackColor: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(260, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [progress, percentage]);
  const animatedStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(percentage, 100)) * progress.value}%` }));
  return <View style={[styles.miniTrack, { backgroundColor: trackColor }]}><Animated.View style={[styles.miniFill, { backgroundColor: color }, animatedStyle]} /></View>;
}

// ─── Animated count-up text ───────────────────────────────────────────────────
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function AnimatedCountUp({ to, decimals = 0, prefix = '', suffix = '', style }: {
  to: number; decimals?: number; prefix?: string; suffix?: string; style?: StyleProp<TextStyle>;
}) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = 0;
    sv.value = withDelay(300, withTiming(to, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [to, sv]);
  const animatedProps = useAnimatedProps(() => ({
    text: `${prefix}${sv.value.toFixed(decimals)}${suffix}`,
    defaultValue: `${prefix}${to.toFixed(decimals)}${suffix}`,
  }));
  return <AnimatedTextInput animatedProps={animatedProps} editable={false} caretHidden selectTextOnFocus={false} style={style} />;
}

// ─── Animated bar for Weekly Patterns chart ────────────────────────────────────
function AnimatedPatternBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const progress = useSharedValue(0);
  const targetPct = Math.max(value, 16);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress, value]);
  const animStyle = useAnimatedStyle(() => ({ height: `${(targetPct * progress.value).toFixed(1)}%` as any }));
  return <Animated.View style={[styles.patternFill, { backgroundColor: color }, animStyle]} />;
}

// ─── Animated bar for Logging Rhythm chart ────────────────────────────────────
function AnimatedRhythmBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const progress = useSharedValue(0);
  const targetPct = Math.max(value, 14);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress, value]);
  const animStyle = useAnimatedStyle(() => ({ height: `${(targetPct * progress.value).toFixed(1)}%` as any }));
  return <Animated.View style={[styles.rhythmFill, { backgroundColor: color }, animStyle]} />;
}

// ─── SVG weight bezier line chart ─────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const SPARK_W = 280;
const SPARK_H = 72;
const SPARK_PAD_X = 6;
const SPARK_PAD_Y = 8;
const SPARK_DASH = 700;

const TOOLTIP_W = 92;
const TOOLTIP_H = 42;
const DOT_HIT = 36;

// Shared chart-rendering core used by both the compact sparkline and the expanded modal.
function WeightLineChart({
  entries,
  colors,
  chartHeight = SPARK_H,
  expanded = false,
}: {
  entries: { id?: string; date: string; kg: number }[];
  colors: ReturnType<typeof useCalora>['colors'];
  chartHeight?: number;
  expanded?: boolean;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(SPARK_W);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipOpacity = useSharedValue(0);
  const tooltipScale = useSharedValue(0.82);

  const vals = entries.map((e) => e.kg);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  // Scale vertical padding proportionally so bezier fills the taller canvas well.
  const padY = Math.round(SPARK_PAD_Y * (chartHeight / SPARK_H));

  const pts = vals.map((v, i) => ({
    x: SPARK_PAD_X + (i / (vals.length - 1)) * (SPARK_W - SPARK_PAD_X * 2),
    y: padY + (1 - (v - min) / range) * (chartHeight - padY * 2),
  }));

  // Smooth cubic bezier: control points split midway between adjacent pts
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX = ((prev.x + curr.x) / 2).toFixed(2);
    d += ` C ${cpX} ${prev.y.toFixed(2)} ${cpX} ${curr.y.toFixed(2)} ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
  }

  // Build a closed fill path: follow the bezier then drop to the bottom corners
  const bottomY = (chartHeight - padY).toFixed(2);
  const dFill = `${d} L ${pts[pts.length - 1].x.toFixed(2)} ${bottomY} L ${pts[0].x.toFixed(2)} ${bottomY} Z`;

  // Scale dash length to match the taller SVG canvas path length.
  const dashLen = Math.ceil(SPARK_DASH * Math.max(1, chartHeight / SPARK_H));

  const dashOffset = useSharedValue(dashLen);
  const fillOpacity = useSharedValue(0);
  const dataKey = `${vals.join(',')}_${chartHeight}`;
  useEffect(() => {
    dashOffset.value = dashLen;
    fillOpacity.value = 0;
    dashOffset.value = withTiming(0, { duration: 920, easing: Easing.out(Easing.cubic) });
    fillOpacity.value = withTiming(1, { duration: 920, easing: Easing.out(Easing.cubic) });
  // Re-run whenever data or size changes; eslint can't verify the string identity dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  // Clean up dismiss timer on unmount
  useEffect(() => {
    return () => { if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current); };
  }, []);

  const animPathProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  const animFillProps = useAnimatedProps(() => ({
    fillOpacity: fillOpacity.value,
  }));

  const tooltipAnimStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
    transform: [{ scale: tooltipScale.value }],
  }));

  const xScale = chartWidth / SPARK_W;
  const lastIdx = pts.length - 1;
  const strokeW = expanded ? 2.8 : 2.2;
  const dotR = expanded ? { normal: 3.5, active: 5.5 } : { normal: 2.8, active: 4.5 };

  const clearSelection = () => setSelectedIdx(null);

  const handleDotPress = (i: number) => {
    Haptics.selectionAsync();
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    // Reset animation values so re-tapping the same dot re-springs in cleanly
    tooltipOpacity.value = 0;
    tooltipScale.value = 0.82;
    setSelectedIdx(i);
    tooltipOpacity.value = withSpring(1, { damping: 14, stiffness: 220 });
    tooltipScale.value = withSpring(1, { damping: 14, stiffness: 220 });
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      // runOnJS ensures clearSelection only fires when THIS animation actually
      // completes — a new tap cancels the withTiming so `finished` is false
      // and clearSelection is never called for the old selection.
      tooltipOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) runOnJS(clearSelection)();
      });
      tooltipScale.value = withTiming(0.82, { duration: 180 });
    }, 2000);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Include the colour in the gradient id so React Native SVG creates a fresh
  // Defs block whenever the theme switches (light ↔ dark), preventing stale
  // gradient artefacts from lingering after a colour change.
  const colorToken = colors.success.replace(/[^a-zA-Z0-9]/g, '');
  const gradientId = `weightFill${expanded ? 'Expanded' : ''}_${colorToken}`;

  return (
    <View style={styles.weightSparkline} onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
      <View style={{ position: 'relative' }}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${SPARK_W} ${chartHeight}`} preserveAspectRatio="none">
          <Defs>
            <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.success} stopOpacity={expanded ? 0.26 : 0.18} />
              <Stop offset="100%" stopColor={colors.success} stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>
          {/* animated area fill */}
          <AnimatedPath
            d={dFill}
            fill={`url(#${gradientId})`}
            stroke="none"
            animatedProps={animFillProps}
          />
          {/* track line */}
          <Path d={d} stroke="rgba(120,120,120,0.13)" strokeWidth={strokeW} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* animated line */}
          <AnimatedPath
            d={d}
            stroke={colors.success}
            strokeWidth={strokeW}
            fill="none"
            strokeDasharray={dashLen}
            strokeLinecap="round"
            strokeLinejoin="round"
            animatedProps={animPathProps}
          />
          {/* data point dots */}
          {pts.map((pt, i) => (
            <Circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={i === lastIdx || i === selectedIdx ? dotR.active : dotR.normal}
              fill={i === lastIdx ? colors.primary : colors.success}
              opacity={i === lastIdx || i === selectedIdx ? 1 : 0.65}
            />
          ))}
        </Svg>

        {/* Transparent Pressable hit targets over each dot */}
        {pts.map((pt, i) => (
          <Pressable
            key={i}
            onPress={() => handleDotPress(i)}
            style={{
              position: 'absolute',
              left: pt.x * xScale - DOT_HIT / 2,
              top: pt.y - DOT_HIT / 2,
              width: DOT_HIT,
              height: DOT_HIT,
            }}
            accessibilityLabel={`Weigh-in ${entries[i]?.date ? formatDate(entries[i].date) : ''}: ${entries[i]?.kg.toFixed(1)} kg`}
            accessibilityRole="button"
          />
        ))}

        {/* Tooltip callout */}
        {selectedIdx !== null && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.weightTooltip,
              {
                backgroundColor: colors.foreground,
                left: Math.min(
                  Math.max(pts[selectedIdx].x * xScale - TOOLTIP_W / 2, 0),
                  chartWidth - TOOLTIP_W,
                ),
                top: Math.max(pts[selectedIdx].y - TOOLTIP_H - 8, 2),
              },
              tooltipAnimStyle,
            ]}
          >
            <Text style={[styles.weightTooltipDate, { color: colors.background, opacity: 0.72 }]}>
              {formatDate(entries[selectedIdx].date)}
            </Text>
            <Text style={[styles.weightTooltipKg, { color: colors.background }]}>
              {entries[selectedIdx].kg.toFixed(1)} kg
            </Text>
          </Animated.View>
        )}
      </View>

      {/* weight value labels */}
      <View style={styles.weightSparkLabels}>
        {entries.map((entry, i) => (
          <Text
            key={entry.kg + String(i)}
            style={[
              styles.weightSparkLabel,
              { color: i === lastIdx ? colors.primary : colors.mutedForeground, flex: 1, textAlign: i === 0 ? 'left' : i === lastIdx ? 'right' : 'center' },
            ]}
            numberOfLines={1}
          >
            {entry.kg.toFixed(1)}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Expanded weight chart modal ───────────────────────────────────────────────
function WeightChartModal({
  entries,
  colors,
  visible,
  onClose,
}: {
  entries: { id?: string; date: string; kg: number }[];
  colors: ReturnType<typeof useCalora>['colors'];
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const sheetY = useSharedValue(600);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      sheetY.value = withSpring(0, { damping: 22, stiffness: 200 });
      backdropOpacity.value = withTiming(1, { duration: 260 });
    } else {
      sheetY.value = withTiming(600, { duration: 240, easing: Easing.in(Easing.cubic) });
      backdropOpacity.value = withTiming(0, { duration: 220 });
    }
  }, [visible, sheetY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const vals = entries.map((e) => e.kg);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const minEntry = entries[vals.indexOf(min)];
  const maxEntry = entries[vals.indexOf(max)];
  const lastEntry = entries[entries.length - 1];
  const firstEntry = entries[0];
  const delta = lastEntry.kg - firstEntry.kg;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {/* Backdrop */}
        <Animated.View
          style={[{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' }, backdropStyle]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close chart" />
        </Animated.View>

        {/* Bottom sheet */}
        <Animated.View
          style={[
            styles.chartModalSheet,
            { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 },
            sheetStyle,
          ]}
        >
          {/* Handle */}
          <View style={[styles.chartModalHandle, { backgroundColor: colors.muted }]} />

          {/* Header */}
          <View style={styles.chartModalHeader}>
            <View>
              <Text style={[styles.chartModalTitle, { color: colors.foreground }]}>Weight trend</Text>
              <Text style={[styles.chartModalSubtitle, { color: colors.mutedForeground }]}>
                {entries.length} weigh-ins · tap any point for details
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Close expanded chart"
              accessibilityRole="button"
              style={[styles.chartModalCloseBtn, { backgroundColor: colors.muted }]}
            >
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Expanded chart */}
          <WeightLineChart entries={entries} colors={colors} chartHeight={200} expanded />

          {/* Summary stats row */}
          <View style={[styles.chartModalStats, { borderTopColor: colors.border }]}>
            <View style={styles.chartModalStat}>
              <Text style={[styles.chartModalStatValue, { color: colors.success }]}>{min.toFixed(1)} kg</Text>
              <Text style={[styles.chartModalStatLabel, { color: colors.mutedForeground }]}>low · {formatDate(minEntry.date)}</Text>
            </View>
            <View style={[styles.chartModalStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.chartModalStat}>
              <Text style={[styles.chartModalStatValue, { color: delta <= 0 ? colors.success : colors.warning }]}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
              </Text>
              <Text style={[styles.chartModalStatLabel, { color: colors.mutedForeground }]}>overall change</Text>
            </View>
            <View style={[styles.chartModalStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.chartModalStat}>
              <Text style={[styles.chartModalStatValue, { color: colors.warning }]}>{max.toFixed(1)} kg</Text>
              <Text style={[styles.chartModalStatLabel, { color: colors.mutedForeground }]}>high · {formatDate(maxEntry.date)}</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function CircularProgress({ percentage, color, trackColor, size = 52, strokeWidth = 5 }: {
  percentage: number; color: string; trackColor: string; size?: number; strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(400, withTiming(Math.min(Math.max(percentage / 100, 0), 1), { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [percentage, progress]);
  const animatedArcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
      <AnimatedCircle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeLinecap="round" animatedProps={animatedArcProps} />
    </Svg>
  );
}

// ─── Spring-bounce chip wrapper ───────────────────────────────────────────────
function SpringChip({ selected, children, onPress, style, accessibilityLabel, accessibilityState, testID }: {
  selected: boolean; children: React.ReactNode; onPress: () => void;
  style?: StyleProp<ViewStyle>; accessibilityLabel?: string; accessibilityState?: object; testID?: string;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(selected ? 1.07 : 1, { damping: 11, stiffness: 380 });
  }, [selected, scale]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <Pressable accessibilityLabel={accessibilityLabel} accessibilityState={accessibilityState} testID={testID} onPress={onPress} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

function GoalNudge({ colors }: { colors: ReturnType<typeof useCalora>['colors'] }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(6);
  useEffect(() => {
    opacity.value = withDelay(180, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(180, withTiming(0, { duration: 480, easing: Easing.out(Easing.cubic) }));
  }, [opacity, translateY]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return (
    <Animated.View style={[styles.goalNudge, animStyle]}>
      <Feather name="zap" size={12} color={colors.primary} />
      <Text style={[styles.goalNudgeText, { color: colors.primary }]}>You're within reach — keep it up!</Text>
    </Animated.View>
  );
}

function WeeklyPatternsCard({ colors, days, averageActivityMinutes }: { colors: ReturnType<typeof useCalora>['colors']; days: WeeklySignalDay[]; averageActivityMinutes: number }) {
  const loggedDays = days.filter((day) => day.hasData).length;
  const waterDays = days.filter((day) => day.water > 0).length;
  const moodDays = days.filter((day) => day.mood).length;
  const activityDays = days.filter((day) => day.activity).length;
  const averageWater = waterDays ? Math.round(days.reduce((sum, day) => sum + day.water, 0) / waterDays) : 0;
  const averageCalories = days.filter((day) => day.kcal > 0).length
    ? Math.round(days.reduce((sum, day) => sum + day.kcal, 0) / days.filter((day) => day.kcal > 0).length)
    : 0;
  return (
    <View style={[styles.patternCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weekly patterns</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>A gentle read on your last seven days.</Text>
        </View>
        <View style={[styles.patternBadge, { backgroundColor: colors.accent }]}>
          <Feather name="trending-up" size={12} color={colors.accentForeground} />
          <Text style={[styles.patternBadgeText, { color: colors.accentForeground }]}>{loggedDays} / 7 tracked</Text>
        </View>
      </View>
      <View style={styles.patternChart}>
        {days.map((day, index) => (
          <View key={day.date} style={styles.patternColumn}>
            <View style={[styles.patternTrack, { backgroundColor: colors.muted }]}>
              {day.hasData && (
                <AnimatedPatternBar
                  value={Math.max(day.kcal ? day.value : 16, 16)}
                  color={day.kcal ? (day.value > 110 ? colors.warning : colors.success) : colors.primary}
                  delay={index * 55}
                />
              )}
            </View>
            <View style={[styles.patternMoodDot, { backgroundColor: day.mood ? moodColors[day.mood] : 'transparent', borderColor: day.mood ? moodColors[day.mood] : colors.border }]} />
            <Text style={[styles.patternDay, { color: index === days.length - 1 ? colors.primary : colors.mutedForeground }]}>{day.day}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.patternLegend, { borderTopColor: colors.border }]}>
        <View style={styles.patternLegendItem}><View style={[styles.legendDot, { backgroundColor: colors.success }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>logged days</Text></View>
      </View>
      <View style={[styles.moodLegend, { borderTopColor: colors.border }]}>
        <Text style={[styles.moodLegendLabel, { color: colors.mutedForeground }]}>Mood dot</Text>
        <View style={styles.moodLegendItems}>
          {([ ['energized', '#e5ad55'], ['good', '#5dba7d'], ['okay', '#7394f2'], ['low', '#9875c7'], ['stressed', '#ef6b4f'] ] as [string, string][]).map(([label, color]) => (
            <View key={label} style={styles.patternLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.patternStats}>
        <View><Text style={[styles.patternStatValue, { color: colors.foreground }]}>{averageWater} fl oz</Text><Text style={[styles.patternStatLabel, { color: colors.mutedForeground }]}>avg. water</Text></View>
        <View><Text style={[styles.patternStatValue, { color: colors.foreground }]}>{averageCalories ? averageCalories.toLocaleString() : '—'}</Text><Text style={[styles.patternStatLabel, { color: colors.mutedForeground }]}>avg. kcal</Text></View>
        <View><Text style={[styles.patternStatValue, { color: colors.foreground }]}>{averageActivityMinutes ? `${averageActivityMinutes} min` : '—'}</Text><Text style={[styles.patternStatLabel, { color: colors.mutedForeground }]}>avg. active min</Text></View>
      </View>
      <Text style={[styles.patternNote, { color: colors.mutedForeground }]}>No entry is a negative score. Keep building a picture that feels useful to you.</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const { colors, logs, weights, addWeight, profile, updateProfile, waterLogs, moodLogs, activityLogs, activityMinutesLogs, setActivity, setActivityMinutes, setMood, livingMemory, plannerMeals, goalCelebrationSeenTargetKg, markGoalCelebrationSeen, resetGoalCelebrationSeen, fontScale } = useCalora();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(fontScale), [fontScale]);
  const [showWeight, setShowWeight] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [minutesInput, setMinutesInput] = useState('');
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [showExpandedChart, setShowExpandedChart] = useState(false);

  // Parallax scroll
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const heroParallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(0, scrollY.value) * 0.38 }],
  }));
  const isEditingMinutes = useRef(false);
  const isEditingWeight = useRef(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const remembered = useMemo(
    () => filterForgottenSources(livingMemory, { logs, waterLogs, moodLogs, activityLogs, plannerMeals }),
    [activityLogs, livingMemory, logs, moodLogs, plannerMeals, waterLogs],
  );
  const dataTrust = trustScore(remembered.logs);
  const latestWeight = weights[weights.length - 1]?.kg ?? profile?.weightKg ?? 76;
  const startingWeight = profile?.weightKg ?? latestWeight;
  const weightDelta = latestWeight - startingWeight;
  const targetWeight = profile?.targetWeightKg ?? 0;
  const hasGoal = targetWeight > 0 && Math.abs(targetWeight - startingWeight) > 0.1;
  const goalTotalDistance = hasGoal ? Math.abs(targetWeight - startingWeight) : 1;
  const goalDirection = hasGoal ? Math.sign(targetWeight - startingWeight) : 1;
  const goalProgressKg = (latestWeight - startingWeight) * goalDirection;
  const goalProgressRaw = (goalProgressKg / goalTotalDistance) * 100;
  const goalReached = goalProgressRaw >= 100;
  const goalProgressPct = Math.max(0, Math.min(100, goalProgressRaw));
  const showGoalProgress = weights.length >= 3 && hasGoal;
  // Nudge: 90–99% progress, goal not yet reached
  const showGoalNudge = showGoalProgress && !goalReached && goalProgressPct >= 90;
  // Show celebration banner once per goal target — mark seen immediately so it won't show on reload.
  // Gate on showGoalProgress (weights.length >= 3 && hasGoal) to ensure the flag is only consumed
  // when the banner can actually be rendered; without this gate, reaching the goal with < 3 entries
  // would mark it seen without the user ever seeing the banner.
  const [showGoalCelebration, setShowGoalCelebration] = useState(false);
  // When the user sets a new goal target, reset the celebration flag so the confetti
  // can fire again once the new target is reached. Without this reset, `showGoalCelebration`
  // stays `true` from the previous goal and the ConfettiBurst `active` prop never
  // transitions false → true, so the animation never replays.
  useEffect(() => {
    setShowGoalCelebration(false);
  }, [targetWeight]);
  useEffect(() => {
    if (goalReached && showGoalProgress && goalCelebrationSeenTargetKg !== targetWeight) {
      // First crossing (or re-crossing after a reset): fire the celebration.
      setShowGoalCelebration(true);
      markGoalCelebrationSeen(targetWeight);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (!goalReached && showGoalProgress && goalCelebrationSeenTargetKg === targetWeight) {
      // User has drifted back above their goal after previously reaching it.
      // Reset the seen flag so the next genuine re-crossing replays the celebration and haptic.
      resetGoalCelebrationSeen();
    }
  // Intentionally run only when goalReached/showGoalProgress/targetWeight change, not on
  // markGoalCelebrationSeen/resetGoalCelebrationSeen identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalReached, showGoalProgress, targetWeight]);
  // todayKey is reactive: a 60-second interval checks whether the calendar date has rolled over
  // so that mood, activity, and water check-ins always save to the correct day even when the
  // screen stays open past midnight.
  const [todayKey, setTodayKey] = useState(() => dateKey());
  useEffect(() => {
    const id = setInterval(() => {
      const current = dateKey();
      setTodayKey((prev) => (prev !== current ? current : prev));
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  // Sync minutes input with stored value when date changes or after hydration loads persisted data.
  // Skip the sync while the user is actively editing so in-progress input is not overwritten.
  useEffect(() => {
    if (isEditingMinutes.current) return;
    const stored = activityMinutesLogs[todayKey];
    setMinutesInput(stored ? String(stored) : '');
  }, [todayKey, activityMinutesLogs]);
  // Sync weight input from the latest stored weight when the modal opens or weights update.
  // When the modal closes, reset the editing ref so a re-open always pre-populates cleanly.
  // Skip the sync while the user is actively editing so a background weights change cannot
  // overwrite a partially-typed value mid-entry.
  useEffect(() => {
    if (!showWeight) {
      isEditingWeight.current = false;
      return;
    }
    if (isEditingWeight.current) return;
    setWeightInput(latestWeight > 0 ? String(latestWeight) : '');
  }, [latestWeight, showWeight]);
  const loggedToday = remembered.logs.filter((log) => log.date === todayKey);
  const nutrientTotals = loggedToday.reduce((totals, log) => ({
    fiber: totals.fiber + (log.fiber ?? 0),
    sugar: totals.sugar + (log.sugar ?? 0),
    sodium: totals.sodium + (log.sodium ?? 0),
  }), { fiber: 0, sugar: 0, sodium: 0 });
  const waterToday = remembered.waterLogs[todayKey] ?? 0;
  const moodToday = remembered.moodLogs[todayKey];
  const moodLabel = moodToday ? moodToday.charAt(0).toUpperCase() + moodToday.slice(1) : 'Not logged';
  const target = profile?.calorieTarget ?? 2000;
  const weeklySignals = useMemo(
    () => deriveWeeklySignals(remembered.logs, remembered.waterLogs, remembered.moodLogs, remembered.activityLogs, target, todayKey, activityMinutesLogs),
    [remembered, target, todayKey, activityMinutesLogs],
  );
  const weekDays = weeklySignals.days;
  const signalDays = weeklySignals.trackedDays;
  const averageWeekCalories = weeklySignals.averageCalories;
  useEffect(() => {
    if (!saveNotice) return;
    const timeout = setTimeout(() => setSaveNotice(null), 2200);
    return () => clearTimeout(timeout);
  }, [saveNotice]);
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 20, paddingBottom: insets.bottom + 104 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroHeader}>
          <Animated.View style={[StyleSheet.absoluteFillObject, heroParallaxStyle]}>
            <Image source={require('../../assets/images/calora-insights-header.jpg')} contentFit="cover" style={StyleSheet.absoluteFillObject} />
          </Animated.View>
          <LinearGradient
            colors={['rgba(18,34,24,0.98)', 'rgba(18,34,24,0.78)', 'rgba(18,34,24,0.18)']}
            locations={[0, 0.58, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Feather name="activity" size={12} color="#d4eadc" />
              <Text style={styles.heroBadgeText}>WEEKLY SIGNAL</Text>
            </View>
            <Text style={styles.heroEyebrow}>THE BIGGER PICTURE</Text>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>Your insights</Text>
              <ScalePressable
                accessibilityLabel="Open Calora Coach"
                testID="open-calora-coach"
                onPress={() => router.push('/coach')}
                scale={0.96}
                haptic="light"
                style={[styles.coachHeaderButton, { backgroundColor: colors.primary, borderColor: '#ffd1c6', shadowColor: '#08160f' }]}
              >
                <Feather name="zap" size={15} color={colors.primaryForeground} />
                <Text style={[styles.coachHeaderButtonText, { color: colors.primaryForeground }]}>Ask Calora</Text>
              </ScalePressable>
            </View>
            <Text style={styles.heroSubtitle}>Patterns, not pressure. Use the signal to make tomorrow easier.</Text>
          </View>
        </View>

        <MotivationalQuote colors={colors} style={{ marginBottom: 16 }} />

        <AnimatedReveal delay={80}>
        <View style={[styles.adaptiveCard, { backgroundColor: colors.hero }]}>
          <Image source={require('../../assets/images/calora-insights-header.jpg')} contentFit="cover" style={styles.adaptiveTexture} />
          <LinearGradient colors={['rgba(20,63,52,0.04)', 'rgba(20,63,52,0.62)']} style={styles.adaptiveTextureOverlay} />
          <PulseIcon colors={colors} />
          <Text style={[styles.cardEyebrow, { color: colors.heroMuted }]}>ADAPTIVE TARGET</Text>
          <Text style={[styles.adaptiveTitle, { color: colors.onHero }]}>Your target is working with you.</Text>
            <Text style={[styles.adaptiveBody, { color: colors.heroMuted }]}>{averageWeekCalories ? `You’re averaging ${averageWeekCalories.toLocaleString()} kcal across ${signalDays} tracked ${signalDays === 1 ? 'day' : 'days'} this week.` : 'Keep logging to reveal a more personal weekly recommendation.'}</Text>
          <View style={styles.adaptiveFooter}>
            <Text style={[styles.adaptiveFooterText, { color: colors.onHero }]}>{signalDays} / 7 days of signal</Text>
             <AnimatedTrackFill percentage={(signalDays / 7) * 100} color={colors.primary} trackColor="rgba(157,215,189,0.18)" />
          </View>
        </View>
        </AnimatedReveal>

        <AnimatedReveal delay={150} style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AnimatedCountUp to={weeklySignals.foodDays} style={[styles.statValue, { color: colors.foreground }]} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>days logged</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
            {dataTrust !== null
              ? <CircularProgress percentage={dataTrust} color={colors.primary} trackColor={colors.muted} size={52} strokeWidth={5} />
              : <Text style={[styles.statValue, { color: colors.foreground }]}>—</Text>}
            <Text style={[styles.statLabel, { color: colors.mutedForeground, marginTop: 5 }]}>data trust</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AnimatedCountUp to={Math.abs(weightDelta)} decimals={1} prefix={weightDelta > 0 ? '+' : weightDelta < 0 ? '-' : ''} style={[styles.statValue, { color: weightDelta <= 0 ? colors.success : colors.warning }]} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>kg trend</Text>
          </View>
        </AnimatedReveal>

        <AnimatedReveal delay={220}>
          <View style={[styles.rhythmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Logging rhythm</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Small signals add up over a week.</Text>
              </View>
              <View style={[styles.rhythmBadge, { backgroundColor: colors.accent }]}>
                <Feather name="calendar" size={12} color={colors.accentForeground} />
                <Text style={[styles.rhythmBadgeText, { color: colors.accentForeground }]}>{Math.min(signalDays, 7)} / 7 days</Text>
              </View>
            </View>
            <View style={styles.rhythmGrid}>
              {weekDays.map((item, index) => (
                <View key={item.date} style={styles.rhythmDay}>
                  <View style={[styles.rhythmTrack, { backgroundColor: colors.muted }]}>
                    {item.hasData && <AnimatedRhythmBar value={Math.max(item.meals ? item.meals * 25 : 14, 14)} color={index === weekDays.length - 1 ? colors.primary : colors.success} delay={index * 50} />}
                  </View>
                  <Text style={[styles.rhythmDayLabel, { color: index === weekDays.length - 1 ? colors.primary : colors.mutedForeground }]}>{item.day}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedReveal>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>This week</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Calories against your {target.toLocaleString()} kcal target</Text>
          </View>
          <Pressable accessibilityLabel="Change insights range" style={[styles.rangeButton, { backgroundColor: colors.muted }]}>
            <Text style={[styles.rangeText, { color: colors.foreground }]}>7D</Text>
            <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <AnimatedReveal delay={280}>
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chart}>
            {weekDays.map((item, index) => (
              <View key={item.date} style={styles.barColumn}>
                <Text style={[styles.barValue, { color: colors.mutedForeground }]}>{item.hasData && item.kcal ? item.kcal.toLocaleString() : '—'}</Text>
                <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                  <AnimatedBar value={item.value} color={index === weekDays.length - 1 ? colors.primary : colors.success} delay={index * 65} />
                </View>
                <Text style={[styles.barDay, { color: index === weekDays.length - 1 ? colors.primary : colors.mutedForeground }]}>{item.day}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.chartLegend, { borderTopColor: colors.border }]}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.success }]} /><Text style={[styles.legendText, { color: colors.mutedForeground }]}>on target</Text></View>
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{averageWeekCalories ? `Avg. ${averageWeekCalories.toLocaleString()} kcal` : 'No calorie average yet'}</Text>
          </View>
        </View>
        </AnimatedReveal>

        <AnimatedReveal delay={360}>
          <WeeklyPatternsCard colors={colors} days={weekDays} averageActivityMinutes={weeklySignals.averageActivityMinutes} />
        </AnimatedReveal>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nutrient balance</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Today’s logged foods, with estimates clearly labeled.</Text>
          </View>
        </View>
        <AnimatedReveal delay={420}>
        <View style={[styles.nutrientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: 'Fiber', value: `${Math.round(nutrientTotals.fiber)} g`, target: '25 g', color: colors.success },
            { label: 'Sugar', value: `${Math.round(nutrientTotals.sugar)} g`, target: 'added + natural', color: colors.warning },
            { label: 'Sodium', value: `${Math.round(nutrientTotals.sodium)} mg`, target: '2,300 mg guide', color: colors.primary },
          ].map((item) => <View key={item.label} style={styles.nutrientRow}><View style={[styles.nutrientDot, { backgroundColor: item.color }]} /><Text style={[styles.nutrientLabel, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.nutrientValue, { color: colors.foreground }]}>{item.value}</Text><Text style={[styles.nutrientTarget, { color: colors.mutedForeground }]}>{item.target}</Text></View>)}
          <Text style={[styles.nutrientNote, { color: colors.mutedForeground }]}>Micronutrients appear as verified foods are added; photo and manual entries remain estimates until reviewed.</Text>
        </View>
        </AnimatedReveal>

        <AnimatedReveal delay={480}>
          <View style={[styles.signalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.signalCardHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today’s signals</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Context for the numbers, not a score.</Text>
              </View>
              <View style={[styles.signalIcon, { backgroundColor: colors.accent }]}><Feather name="heart" size={16} color={colors.accentForeground} /></View>
            </View>
            <View style={styles.signalRow}>
              <View style={styles.signalMetric}>
                <View style={styles.signalMetricTop}><Feather name="droplet" size={14} color="#5d8edb" /><Text style={[styles.signalMetricLabel, { color: colors.mutedForeground }]}>Hydration</Text></View>
                <Text style={[styles.signalMetricValue, { color: colors.foreground }]}>{waterToday} <Text style={[styles.signalMetricUnit, { color: colors.mutedForeground }]}>/ 64 fl oz</Text></Text>
                <AnimatedTrackFill percentage={(waterToday / 64) * 100} color="#5d8edb" trackColor={colors.muted} />
              </View>
              <View style={styles.signalMetric}>
                <View style={styles.signalMetricTop}><Feather name="smile" size={14} color="#9875c7" /><Text style={[styles.signalMetricLabel, { color: colors.mutedForeground }]}>Mood</Text></View>
                <Text style={[styles.signalMetricValue, { color: colors.foreground }]}>{moodLabel}</Text>
                <Text style={[styles.signalMetricHint, { color: colors.mutedForeground }]}>{moodToday ? 'Logged today' : 'Optional check-in'}</Text>
              </View>
            </View>
          </View>
        </AnimatedReveal>

        <AnimatedReveal delay={520}>
          <View style={[styles.checkinCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.signalCardHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Daily check-ins</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Optional context for your weekly trend.</Text>
              </View>
              <View style={[styles.signalIcon, { backgroundColor: colors.accent }]}>
                <Feather name="edit-3" size={15} color={colors.accentForeground} />
              </View>
            </View>
            <Text style={[styles.checkinLabel, { color: colors.mutedForeground }]}>MOVEMENT TODAY</Text>
            <View style={styles.activityOptions}>
              {([
                { value: 'rest', label: 'Rest', icon: 'moon' },
                { value: 'light', label: 'Light', icon: 'sun' },
                { value: 'moderate', label: 'Moderate', icon: 'activity' },
                { value: 'high', label: 'High', icon: 'zap' },
              ] as const).map((option) => {
                const selected = remembered.activityLogs[todayKey] === option.value;
                return (
                  <SpringChip
                    key={option.value}
                    selected={selected}
                    accessibilityLabel={`${option.label} activity today${selected ? ', selected' : ''}`}
                    accessibilityState={{ selected }}
                    testID={`activity-${option.value}`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActivity(todayKey, option.value);
                      setSaveNotice(`${option.label} movement check-in saved.`);
                    }}
                    style={[styles.activityOption, { backgroundColor: selected ? colors.primary : colors.muted, borderColor: selected ? colors.primary : colors.border }]}
                  >
                    <Feather name={option.icon as keyof typeof Feather.glyphMap} size={14} color={selected ? colors.primaryForeground : colors.mutedForeground} />
                    <Text style={[styles.activityOptionText, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{option.label}</Text>
                  </SpringChip>
                );
              })}
            </View>
            {/* Activity minutes input */}
            <View style={[styles.minutesRow, { borderTopColor: colors.border }]}>
              <View style={styles.minutesLeft}>
                <Feather name="clock" size={14} color={colors.mutedForeground} />
                <Text style={[styles.minutesLabel, { color: colors.mutedForeground }]}>ACTIVE MINUTES</Text>
              </View>
              <View style={[styles.minutesInputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <TextInput
                  value={minutesInput}
                  onChangeText={setMinutesInput}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={colors.mutedForeground}
                  returnKeyType="done"
                  onFocus={() => { isEditingMinutes.current = true; }}
                  onEndEditing={() => {
                    isEditingMinutes.current = false;
                    const val = parseInt(minutesInput, 10);
                    if (Number.isFinite(val) && val >= 0) {
                      setActivityMinutes(todayKey, val);
                      setSaveNotice(`${val} active minutes saved.`);
                    } else if (minutesInput === '' && activityMinutesLogs[todayKey] !== undefined) {
                      setActivityMinutes(todayKey, 0);
                    }
                  }}
                  style={[styles.minutesInput, { color: colors.foreground }]}
                  accessibilityLabel="Enter active minutes for today"
                  testID="activity-minutes-input"
                />
                <Text style={[styles.minutesUnit, { color: colors.mutedForeground }]}>min</Text>
              </View>
            </View>
            {/* Mood check-in */}
            <Text style={[styles.checkinLabel, { color: colors.mutedForeground, marginTop: 16 }]}>HOW YOU FEEL</Text>
            <View style={styles.moodOptions}>
              {([
                { value: 'energized', label: 'Energized', color: '#e5ad55' },
                { value: 'good', label: 'Good', color: '#5dba7d' },
                { value: 'okay', label: 'Okay', color: '#7394f2' },
                { value: 'low', label: 'Low', color: '#9875c7' },
                { value: 'stressed', label: 'Stressed', color: '#ef6b4f' },
              ] as const).map((option) => {
                const selected = moodToday === option.value;
                return (
                  <SpringChip
                    key={option.value}
                    selected={selected}
                    accessibilityLabel={`${option.label} mood${selected ? ', selected' : ''}`}
                    accessibilityState={{ selected }}
                    testID={`mood-${option.value}`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMood(todayKey, option.value);
                      setSaveNotice(`${option.label} mood check-in saved.`);
                    }}
                    style={[
                      styles.moodOption,
                      {
                        backgroundColor: selected ? option.color + '22' : colors.muted,
                        borderColor: selected ? option.color : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.moodDot, { backgroundColor: option.color, opacity: selected ? 1 : 0.35 }]} />
                    <Text style={[styles.moodOptionText, { color: selected ? option.color : colors.mutedForeground }]}>{option.label}</Text>
                  </SpringChip>
                );
              })}
            </View>
            <Text style={[styles.checkinHint, { color: colors.mutedForeground }]}>
              {remembered.activityLogs[todayKey] || activityMinutesLogs[todayKey] || moodToday ? 'Saved on this device. You can change it anytime.' : 'Nothing is assumed when you leave this blank.'}
            </Text>
            <View style={[styles.healthSyncNote, { backgroundColor: colors.muted }]}>
              <Feather name="link-2" size={11} color={colors.mutedForeground} />
              <Text style={[styles.healthSyncText, { color: colors.mutedForeground }]}>Health sync unavailable · connect a health integration to import workouts automatically.</Text>
            </View>
          </View>
        </AnimatedReveal>

        <View style={styles.weightHeader}>
          <View style={styles.weightTitleGroup}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weight trend</Text><Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Your trend matters more than a single day</Text></View>
          <View style={styles.weightHeaderButtons}>
            <ScalePressable
              accessibilityLabel="Edit weight goal"
              onPress={() => { setGoalInput(targetWeight > 0 ? String(targetWeight) : ''); setShowGoalEdit(true); }}
              scale={0.98}
              haptic="none"
              style={[styles.goalHeaderBtn, { backgroundColor: colors.muted }]}
            >
              <Feather name="target" size={13} color={colors.mutedForeground} />
              <Text style={[styles.goalHeaderBtnText, { color: colors.mutedForeground }]}>{targetWeight > 0 ? `Goal: ${targetWeight.toFixed(0)} kg` : 'Set goal'}</Text>
            </ScalePressable>
            <ScalePressable accessibilityLabel="Log weight" onPress={() => setShowWeight(true)} scale={0.96} haptic="light" style={[styles.weightButton, { backgroundColor: colors.primary }]}><Feather name="plus" size={14} color={colors.primaryForeground} /><Text style={[styles.weightButtonText, { color: colors.primaryForeground }]}>Log</Text></ScalePressable>
          </View>
        </View>
        <AnimatedReveal delay={540}>
        <View style={[styles.weightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.weightTopRow}>
            <View>
              <Text style={[styles.weightValue, { color: colors.foreground }]}>{latestWeight.toFixed(1)} <Text style={[styles.weightUnit, { color: colors.mutedForeground }]}>kg</Text></Text>
              <Text style={[styles.weightHint, { color: colors.mutedForeground }]}>{weights.length > 1 ? `${weights.length} weigh-ins recorded locally` : 'Optional · add a few weigh-ins to unlock trend guidance'}</Text>
            </View>
            {weights.length >= 3 && (
              <View style={[styles.weightDeltaBadge, { backgroundColor: weightDelta <= 0 ? '#e6f6ec' : '#fff3e0' }]}>
                <Feather name={weightDelta <= 0 ? 'trending-down' : 'trending-up'} size={13} color={weightDelta <= 0 ? colors.success : colors.warning} />
                <Text style={[styles.weightDeltaText, { color: weightDelta <= 0 ? colors.success : colors.warning }]}>{weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg</Text>
              </View>
            )}
          </View>
          {weights.length >= 3 ? (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setShowExpandedChart(true); }}
              accessibilityLabel="Expand weight chart"
              accessibilityRole="button"
              style={{ position: 'relative' }}
            >
              <WeightLineChart entries={weights.slice(-7)} colors={colors} />
              {/* Expand affordance icon */}
              <View style={[styles.chartExpandHint, { backgroundColor: colors.muted }]} pointerEvents="none">
                <Feather name="maximize-2" size={11} color={colors.mutedForeground} />
              </View>
            </Pressable>
          ) : (
            <View style={[styles.weightLine, { backgroundColor: colors.muted }]}><View style={[styles.weightLineFill, { backgroundColor: colors.success, width: weights.length > 1 ? '50%' : '0%' }]} /></View>
          )}
          {showGoalCelebration && showGoalProgress ? (
            <View style={styles.celebrationWrapper}>
              <ConfettiBurst active={showGoalCelebration} />
              <GoalCelebrationBanner colors={colors} targetKg={targetWeight} onDismiss={() => setShowGoalCelebration(false)} />
            </View>
          ) : null}
          {showGoalProgress ? (
            <View style={styles.goalProgressSection}>
              <View style={styles.goalProgressHeaderRow}>
                <Text style={[styles.goalProgressText, { color: goalReached ? colors.success : colors.mutedForeground }]}>
                  {goalReached
                    ? `Goal reached · ${targetWeight.toFixed(0)} kg`
                    : goalProgressKg > 0
                    ? `${goalProgressKg.toFixed(1)} kg toward your ${targetWeight.toFixed(0)} kg goal`
                    : `Target ${targetWeight.toFixed(0)} kg · start logging progress`}
                </Text>
                <ScalePressable
                  accessibilityLabel="Edit weight goal"
                  onPress={() => { setGoalInput(targetWeight > 0 ? String(targetWeight) : ''); setShowGoalEdit(true); }}
                  scale={0.98}
                  haptic="none"
                  style={styles.goalEditBtn}
                >
                  <Feather name="edit-2" size={12} color={colors.primary} />
                </ScalePressable>
                <Text style={[styles.goalProgressPct, { color: goalReached ? colors.success : colors.primary }]}>{goalReached ? '✓' : `${Math.round(goalProgressPct)}%`}</Text>
              </View>
              <AnimatedTrackFill percentage={goalProgressPct} color={goalReached ? colors.success : colors.primary} trackColor={colors.muted} />
              {showGoalNudge && (
                <GoalNudge colors={colors} />
              )}
            </View>
          ) : null}
          <View style={[styles.healthSyncNote, { backgroundColor: colors.muted, marginTop: 12 }]}>
            <Feather name="link-2" size={11} color={colors.mutedForeground} />
            <Text style={[styles.healthSyncText, { color: colors.mutedForeground }]}>Health sync unavailable · connect a health integration for automatic weigh-in import.</Text>
          </View>
        </View>
        </AnimatedReveal>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 25, marginBottom: 11 }]}>Built on trust</Text>
        <View style={[styles.trustRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.trustIcon, { backgroundColor: colors.accent }]}><Feather name="database" size={18} color={colors.accentForeground} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trustTitle, { color: colors.foreground }]}>Verified core database</Text>
            <Text style={[styles.trustBody, { color: colors.mutedForeground }]}>USDA and labeled foods are separated from estimates and manual entries.</Text>
          </View>
          <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
        </View>
        <View style={[styles.trustRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.trustIcon, { backgroundColor: '#fff0df' }]}><Feather name="zap" size={18} color={colors.warning} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.trustTitle, { color: colors.foreground }]}>Low-friction logging</Text>
            <Text style={[styles.trustBody, { color: colors.mutedForeground }]}>Every meal can start with one tap, then you stay in control of the estimate.</Text>
          </View>
          <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
        </View>
      </Animated.ScrollView>
      <Modal visible={showWeight} transparent animationType="slide" onRequestClose={() => setShowWeight(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.42)' }]}>
          <View style={[styles.weightModal, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Log today's weight</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>A single weigh-in is just a data point. Calora looks for a trend.</Text>
            <TextInput value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" placeholder={`${latestWeight.toFixed(1)} kg`} placeholderTextColor={colors.mutedForeground} style={[styles.weightInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]} onFocus={() => { isEditingWeight.current = true; }} onEndEditing={() => { isEditingWeight.current = false; }} />
            <ScalePressable accessibilityLabel="Save weight" onPress={() => { const value = Number(weightInput); if (value > 0) { addWeight(value); setWeightInput(''); setShowWeight(false); setSaveNotice('Weight check-in saved locally.'); } }} scale={0.96} haptic="light" style={[styles.saveWeight, { backgroundColor: colors.primary }]}><Text style={[styles.saveWeightText, { color: colors.primaryForeground }]}>Save weigh-in</Text></ScalePressable>
            <Pressable accessibilityLabel="Cancel weight entry" onPress={() => setShowWeight(false)} style={styles.cancelWeight}><Text style={[styles.cancelWeightText, { color: colors.mutedForeground }]}>Not now</Text></Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={showGoalEdit} transparent animationType="slide" onRequestClose={() => setShowGoalEdit(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.42)' }]}>
          <View style={[styles.weightModal, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Weight goal</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>Enter your target weight. This updates your goal progress without changing any logged data.</Text>
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="decimal-pad"
              placeholder="e.g. 70 kg"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.weightInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.input }]}
              autoFocus
            />
            <ScalePressable
              accessibilityLabel="Save weight goal"
              onPress={() => {
                const value = Number(goalInput);
                if (value > 0) {
                  updateProfile({ targetWeightKg: value });
                  setGoalInput('');
                  setShowGoalEdit(false);
                  setSaveNotice('Weight goal updated.');
                }
              }}
              scale={0.96}
              haptic="light"
              style={[styles.saveWeight, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.saveWeightText, { color: colors.primaryForeground }]}>Save goal</Text>
            </ScalePressable>
            <Pressable accessibilityLabel="Cancel goal edit" onPress={() => setShowGoalEdit(false)} style={styles.cancelWeight}>
              <Text style={[styles.cancelWeightText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <LocalSaveNotice visible={Boolean(saveNotice)} message={saveNotice ?? ''} colors={colors} />
      {weights.length >= 3 && (
        <WeightChartModal
          entries={weights.slice(-7)}
          colors={colors}
          visible={showExpandedChart}
          onClose={() => setShowExpandedChart(false)}
        />
      )}
    </View>
  );
}

function makeStyles(f: number) {
  return StyleSheet.create({
  page: { flex: 1 },
  heroHeader: { minHeight: 190, borderRadius: 25, overflow: 'hidden', marginBottom: 17, backgroundColor: '#1b3022' },
  heroContent: { minHeight: 190, padding: 19, justifyContent: 'flex-end' },
  heroBadge: { position: 'absolute', top: 17, right: 17, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(212,234,220,0.16)', borderWidth: 1, borderColor: 'rgba(212,234,220,0.25)' },
  heroBadgeText: { color: '#d4eadc', fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.1 },
  heroEyebrow: { color: '#b6d8c2', fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, letterSpacing: 1.4, marginBottom: 6 },
  heroTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 28 * f, letterSpacing: -0.7 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  coachHeaderButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  coachHeaderButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10 * f, letterSpacing: 0.1 },
  heroSubtitle: { color: '#d4eadc', fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 17, marginTop: 7, maxWidth: 285 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, letterSpacing: 1.4, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28 * f, letterSpacing: -0.7 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13 * f, lineHeight: 19, marginTop: 8, marginBottom: 22, maxWidth: 330 },
  adaptiveCard: { borderRadius: 24, padding: 19, marginBottom: 14, overflow: 'hidden', position: 'relative' },
  adaptiveTexture: { ...StyleSheet.absoluteFillObject, opacity: 0.22 },
  adaptiveTextureOverlay: { ...StyleSheet.absoluteFillObject },
  iconCircle: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  cardEyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, letterSpacing: 1.2, marginBottom: 7 },
  adaptiveTitle: { fontFamily: 'Inter_700Bold', fontSize: 19 * f, letterSpacing: -0.3, marginBottom: 8 },
  adaptiveBody: { fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 18 },
  adaptiveFooter: { marginTop: 18 },
  adaptiveFooterText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f, marginBottom: 8 },
  miniTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  miniFill: { height: 6, borderRadius: 3 },
  statRow: { flexDirection: 'row', gap: 9, marginBottom: 25 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 17, padding: 13 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 18 * f },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 5 },
  rhythmCard: { borderWidth: 1, borderRadius: 21, padding: 15, marginBottom: 24 },
  rhythmBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  rhythmBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9 * f },
  rhythmGrid: { height: 96, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 9, marginTop: 4 },
  rhythmDay: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  rhythmTrack: { width: '100%', height: 72, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  rhythmFill: { width: '100%', borderRadius: 6 },
  rhythmDayLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, marginTop: 7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 * f, letterSpacing: -0.3 },
  sectionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, marginTop: 4 },
  rangeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  rangeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
  chartCard: { borderWidth: 1, borderRadius: 21, padding: 15, marginBottom: 20 },
  chart: { height: 190, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 7 },
  barColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontFamily: 'Inter_400Regular', fontSize: 8 * f, marginBottom: 6 },
  barTrack: { width: '100%', height: 128, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  barDay: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f, marginTop: 8 },
  chartLegend: { borderTopWidth: 1, marginTop: 14, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontFamily: 'Inter_400Regular', fontSize: 10 * f },
  nutrientCard: { borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 1 },
  nutrientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  nutrientDot: { width: 8, height: 8, borderRadius: 4 },
  nutrientLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f, flex: 1 },
  nutrientValue: { fontFamily: 'Inter_700Bold', fontSize: 12 * f },
  nutrientTarget: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, minWidth: 88, textAlign: 'right' },
  nutrientNote: { borderTopWidth: 1, borderTopColor: 'rgba(120,120,120,0.14)', paddingTop: 10, marginTop: 5, fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 15 },
  patternCard: { borderWidth: 1, borderRadius: 21, padding: 15, marginBottom: 24 },
  patternBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  patternBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9 * f },
  patternChart: { height: 132, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 9, marginTop: 3 },
  patternColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  patternTrack: { width: '100%', height: 92, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  patternFill: { width: '100%', borderRadius: 6 },
  patternMoodDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, marginTop: 8 },
  patternDay: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, marginTop: 6 },
  patternLegend: { borderTopWidth: 1, marginTop: 14, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between' },
  patternLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moodLegend: { borderTopWidth: 1, marginTop: 10, paddingTop: 10, gap: 6 },
  moodLegendLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 * f },
  moodLegendItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  patternStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  patternStatValue: { fontFamily: 'Inter_700Bold', fontSize: 13 * f },
  patternStatLabel: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, marginTop: 3 },
  patternNote: { borderTopWidth: 1, borderTopColor: 'rgba(120,120,120,0.14)', paddingTop: 10, marginTop: 13, fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 15 },
  checkinCard: { borderWidth: 1, borderRadius: 21, padding: 15, marginTop: 24 },
  checkinLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, letterSpacing: 1.1, marginBottom: 8 },
  activityOptions: { flexDirection: 'row', gap: 7 },
  activityOption: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 13, paddingHorizontal: 3, gap: 5 },
  activityOptionText: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f },
  checkinHint: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 15, marginTop: 11 },
  signalCard: { borderWidth: 1, borderRadius: 21, padding: 15, marginTop: 24 },
  signalCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 15 },
  signalIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  signalRow: { flexDirection: 'row', gap: 12 },
  signalMetric: { flex: 1, minWidth: 0 },
  signalMetricTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  signalMetricLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
  signalMetricValue: { fontFamily: 'Inter_700Bold', fontSize: 17 * f },
  signalMetricUnit: { fontFamily: 'Inter_400Regular', fontSize: 10 * f },
  signalMetricHint: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 5 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 13, marginBottom: 9 },
  trustIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  trustTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  trustBody: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, lineHeight: 15, marginTop: 4 },
  weightHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 25, marginBottom: 11 },
  weightTitleGroup: { flex: 1, marginRight: 8 },
  weightHeaderButtons: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  goalHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 },
  goalHeaderBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
  weightButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 },
  weightButtonText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  weightCard: { borderWidth: 1, borderRadius: 20, padding: 16 },
  weightValue: { fontFamily: 'Inter_700Bold', fontSize: 28 * f },
  weightUnit: { fontFamily: 'Inter_400Regular', fontSize: 12 * f },
  weightHint: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, marginTop: 5 },
  weightLine: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: 14 },
  weightLineFill: { height: 7, borderRadius: 4 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  weightModal: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 30 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 21 * f },
  modalBody: { fontFamily: 'Inter_400Regular', fontSize: 12 * f, lineHeight: 18, marginTop: 7 },
  weightInput: { borderWidth: 1, borderRadius: 14, height: 48, paddingHorizontal: 13, fontFamily: 'Inter_500Medium', fontSize: 16 * f, marginTop: 17 },
  saveWeight: { borderRadius: 14, alignItems: 'center', paddingVertical: 14, marginTop: 12 },
  saveWeightText: { fontFamily: 'Inter_700Bold', fontSize: 13 * f },
  cancelWeight: { alignItems: 'center', paddingVertical: 13 },
  cancelWeightText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 * f },
  moodOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  moodOption: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  moodDot: { width: 7, height: 7, borderRadius: 4 },
  moodOptionText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 * f },
  minutesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, marginTop: 13, paddingTop: 13 },
  minutesLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  minutesLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f, letterSpacing: 1.1 },
  minutesInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, gap: 4, minWidth: 80 },
  minutesInput: { fontFamily: 'Inter_700Bold', fontSize: 14 * f, minWidth: 40, textAlign: 'right' },
  minutesUnit: { fontFamily: 'Inter_400Regular', fontSize: 11 * f },
  healthSyncNote: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, marginTop: 11 },
  healthSyncText: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, lineHeight: 13, flex: 1 },
  weightTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  weightDeltaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  weightDeltaText: { fontFamily: 'Inter_700Bold', fontSize: 11 * f },
  weightSparkline: { marginTop: 12 },
  weightSparkLabels: { flexDirection: 'row', marginTop: 5, paddingHorizontal: 2 },
  weightSparkLabel: { fontFamily: 'Inter_400Regular', fontSize: 8 * f },
  weightTooltip: { position: 'absolute', width: 92, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6, zIndex: 20 },
  weightTooltipDate: { fontFamily: 'Inter_600SemiBold', fontSize: 9 * f },
  weightTooltipKg: { fontFamily: 'Inter_700Bold', fontSize: 13 * f, marginTop: 1 },
  goalProgressSection: { marginTop: 14 },
  goalProgressHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  goalProgressText: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, flex: 1 },
  goalProgressPct: { fontFamily: 'Inter_700Bold', fontSize: 11 * f, marginLeft: 8 },
  goalEditBtn: { padding: 4, marginLeft: 6 },
  goalNudge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  goalNudgeText: { fontFamily: 'Inter_500Medium', fontSize: 11 * f, letterSpacing: 0.1 },
  celebrationWrapper: { position: 'relative', marginTop: 14 },
  confettiBurstContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 0, zIndex: 10 },
  celebrationBanner: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11 },
  celebrationIconWrap: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  celebrationTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 * f, marginBottom: 2 },
  celebrationBody: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 16 },
  celebrationClose: { padding: 4, flexShrink: 0, opacity: 0.7 },
  // ─── Expand hint icon ──────────────────────────────────────────────────────
  chartExpandHint: { position: 'absolute', top: 6, right: 2, width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', opacity: 0.7 },
  // ─── Expanded weight chart modal ───────────────────────────────────────────
  chartModalSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 18 },
  chartModalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  chartModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  chartModalTitle: { fontFamily: 'Inter_700Bold', fontSize: 19 * f, letterSpacing: -0.3 },
  chartModalSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, marginTop: 4 },
  chartModalCloseBtn: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chartModalStats: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, marginTop: 18, paddingTop: 16 },
  chartModalStat: { flex: 1, alignItems: 'center' },
  chartModalStatValue: { fontFamily: 'Inter_700Bold', fontSize: 14 * f },
  chartModalStatLabel: { fontFamily: 'Inter_400Regular', fontSize: 9 * f, marginTop: 3, textAlign: 'center' },
  chartModalStatDivider: { width: 1, height: 30 },
  });
}
const styles = makeStyles(1.0);