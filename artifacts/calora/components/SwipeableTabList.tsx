import React, { useMemo, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  getWorkspaceSwipeOffset,
  getWorkspaceSwipeTargetIndex,
  isWorkspaceSwipeIntent,
  isWorkspaceSwipeVelocityIntent,
} from '@/lib/workspaceSwipe';

type SwipeableTabListProps<T extends string> = {
  items: readonly T[];
  activeItem: T;
  onChange: (item: T) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  testID?: string;
};

type SwipeableSectionPagerProps<T extends string> = {
  items: readonly T[];
  activeItem: T;
  onChange: (item: T) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
};

const SwipeGestureExclusionContext = React.createContext<(() => void) | null>(null);

export function SwipeGestureExclusion({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const excludeCurrentGesture = React.useContext(SwipeGestureExclusionContext);

  return (
    <View
      collapsable={false}
      onStartShouldSetResponderCapture={() => {
        excludeCurrentGesture?.();
        return false;
      }}
      style={style}
    >
      {children}
    </View>
  );
}

/**
 * A tablist that preserves ordinary tab presses while allowing a deliberate
 * horizontal swipe across the strip to select the adjacent tab.
 *
 * The gesture surface is intentionally limited to the tab strip. Screens can
 * therefore keep vertical scrolling, horizontal carousels, charts, and form
 * controls without the submenu gesture competing for those touches.
 */
export function SwipeableTabList<T extends string>({
  items,
  activeItem,
  onChange,
  children,
  style,
  accessibilityLabel,
  testID,
}: SwipeableTabListProps<T>) {
  const itemsRef = useRef(items);
  const activeItemRef = useRef(activeItem);
  const onChangeRef = useRef(onChange);

  // PanResponder is intentionally stable; refs keep its release handler aligned
  // with the latest active tab and callback without rebuilding it each render.
  itemsRef.current = items;
  activeItemRef.current = activeItem;
  onChangeRef.current = onChange;

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        isWorkspaceSwipeIntent(gesture.dx, gesture.dy)
        || isWorkspaceSwipeVelocityIntent(gesture.dx, gesture.dy, gesture.vx, gesture.vy),
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        isWorkspaceSwipeIntent(gesture.dx, gesture.dy)
        || isWorkspaceSwipeVelocityIntent(gesture.dx, gesture.dy, gesture.vx, gesture.vy),
      onPanResponderRelease: (_event, gesture) => {
        const currentItems = itemsRef.current;
        const currentIndex = currentItems.indexOf(activeItemRef.current);
        const targetIndex = getWorkspaceSwipeTargetIndex(
          currentIndex,
          currentItems.length,
          gesture.dx,
          gesture.dy,
          gesture.vx,
          gesture.vy,
        );

        if (targetIndex !== null) {
          onChangeRef.current(currentItems[targetIndex]);
        }
      },
      onPanResponderTerminationRequest: () => true,
    }),
    [],
  );

  return (
    <View
      {...panResponder.panHandlers}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Swipe left or right to switch sections"
      style={[style, styles.gestureSurface]}
      testID={testID}
    >
      {children}
    </View>
  );
}

/**
 * A full-content gesture surface for peer submenu sections.
 *
 * It intentionally does not capture in the responder capture phase. Native
 * horizontal ScrollViews nested inside the section therefore keep ownership of
 * their own drags, while ordinary section content can still page left or right.
 */
export function SwipeableSectionPager<T extends string>({
  items,
  activeItem,
  onChange,
  children,
  style,
  accessibilityLabel,
  accessibilityHint = 'Swipe left or right to switch sections',
  testID,
}: SwipeableSectionPagerProps<T>) {
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const itemsRef = useRef(items);
  const activeItemRef = useRef(activeItem);
  const onChangeRef = useRef(onChange);
  const widthRef = useRef(windowWidth);
  const reduceMotionRef = useRef(reduceMotion);
  const excludedGestureRef = useRef(false);

  itemsRef.current = items;
  activeItemRef.current = activeItem;
  onChangeRef.current = onChange;
  widthRef.current = windowWidth;
  reduceMotionRef.current = reduceMotion;

  const settleAtRest = () => {
    translateX.value = withSpring(0, {
      damping: 22,
      stiffness: 240,
      mass: 0.72,
      overshootClamping: true,
      reduceMotion: ReduceMotion.System,
    });
    opacity.value = withTiming(1, {
      duration: 140,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  };

  const showTarget = (targetItem: T, direction: number) => {
    onChangeRef.current(targetItem);
    if (reduceMotionRef.current) {
      translateX.value = 0;
      opacity.value = 1;
      return;
    }

    translateX.value = direction * Math.min(widthRef.current * 0.16, 64);
    opacity.value = 0.72;
    requestAnimationFrame(settleAtRest);
  };

  const commitTarget = (targetItem: T, direction: number) => {
    showTarget(targetItem, direction);
  };

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => {
        excludedGestureRef.current = false;
        return false;
      },
      onMoveShouldSetPanResponder: (_event, gesture) =>
        !excludedGestureRef.current && (
          isWorkspaceSwipeIntent(gesture.dx, gesture.dy)
          || isWorkspaceSwipeVelocityIntent(gesture.dx, gesture.dy, gesture.vx, gesture.vy)
        ),
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => {
        cancelAnimation(translateX);
        cancelAnimation(opacity);
        opacity.value = 1;
      },
      onPanResponderMove: (_event, gesture) => {
        const currentItems = itemsRef.current;
        const currentIndex = currentItems.indexOf(activeItemRef.current);
        translateX.value = getWorkspaceSwipeOffset(
          currentIndex,
          currentItems.length,
          gesture.dx,
        );
        opacity.value = Math.max(0.84, 1 - Math.abs(translateX.value) / Math.max(widthRef.current, 1) * 0.16);
      },
      onPanResponderRelease: (_event, gesture) => {
        const currentItems = itemsRef.current;
        const currentIndex = currentItems.indexOf(activeItemRef.current);
        const targetIndex = getWorkspaceSwipeTargetIndex(
          currentIndex,
          currentItems.length,
          gesture.dx,
          gesture.dy,
          gesture.vx,
          gesture.vy,
        );

        if (targetIndex === null) {
          settleAtRest();
          return;
        }

        const direction = targetIndex > currentIndex ? 1 : -1;
        commitTarget(currentItems[targetIndex], direction);
      },
      onPanResponderTerminate: settleAtRest,
      onPanResponderTerminationRequest: () => true,
    }),
    [],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));
  const exclusionContextValue = useMemo(
    () => () => {
      excludedGestureRef.current = true;
    },
    [],
  );

  return (
    <SwipeGestureExclusionContext.Provider value={exclusionContextValue}>
      <Animated.View
        {...panResponder.panHandlers}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={[style, styles.gestureSurface, animatedStyle]}
        testID={testID}
      >
        {children}
      </Animated.View>
    </SwipeGestureExclusionContext.Provider>
  );
}

const styles = StyleSheet.create({
  gestureSurface: {
    userSelect: 'none',
  },
});