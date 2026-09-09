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
  children?: React.ReactNode;
  renderItem?: (item: T) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  accessibilityHint?: string;
  lockGesture?: boolean;
  disableAnimation?: boolean;
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
  renderItem,
  style,
  accessibilityLabel,
  accessibilityHint = 'Swipe left or right to switch sections',
  lockGesture = false,
  disableAnimation = false,
  testID,
}: SwipeableSectionPagerProps<T>) {
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [surfaceWidth, setSurfaceWidth] = React.useState(windowWidth);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const itemsRef = useRef(items);
  const activeItemRef = useRef(activeItem);
  const onChangeRef = useRef(onChange);
  const widthRef = useRef(windowWidth);
  const reduceMotionRef = useRef(reduceMotion);
  const lockGestureRef = useRef(lockGesture);
  const disableAnimationRef = useRef(disableAnimation);
  const excludedGestureRef = useRef(false);
  const renderItemRef = useRef(renderItem);
  const surfaceWidthRef = useRef(windowWidth);

  itemsRef.current = items;
  activeItemRef.current = activeItem;
  onChangeRef.current = onChange;
  surfaceWidthRef.current = surfaceWidth || windowWidth;
  widthRef.current = surfaceWidthRef.current;
  reduceMotionRef.current = reduceMotion;
  lockGestureRef.current = lockGesture;
  disableAnimationRef.current = disableAnimation;
  renderItemRef.current = renderItem;

  React.useEffect(() => {
    if (!renderItemRef.current) return;
    const currentIndex = itemsRef.current.indexOf(activeItemRef.current);
    if (currentIndex < 0) return;
    const targetOffset = -currentIndex * surfaceWidthRef.current;
    if (reduceMotionRef.current || disableAnimationRef.current) {
      translateX.value = targetOffset;
      return;
    }
    translateX.value = withTiming(targetOffset, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [activeItem, surfaceWidth, translateX]);

  const restingOffset = () => {
    if (!renderItemRef.current) return 0;
    const currentIndex = itemsRef.current.indexOf(activeItemRef.current);
    return currentIndex >= 0 ? -currentIndex * widthRef.current : 0;
  };

  const settleAtRest = () => {
    const targetOffset = restingOffset();
    if (disableAnimationRef.current) {
      translateX.value = targetOffset;
      opacity.value = 1;
      return;
    }
    translateX.value = withTiming(targetOffset, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    opacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  };

  const showTarget = (targetItem: T, direction: number) => {
    const targetIndex = itemsRef.current.indexOf(targetItem);
    const targetOffset = renderItemRef.current && targetIndex >= 0
      ? -targetIndex * widthRef.current
      : direction * Math.min(widthRef.current * 0.22, 88);
    onChangeRef.current(targetItem);
    if (reduceMotionRef.current || disableAnimationRef.current) {
      // In children mode the next section replaces the current child at
      // offset zero. Do not leave it parked at the directional preview offset
      // when settle animation is disabled.
      translateX.value = renderItemRef.current ? targetOffset : 0;
      opacity.value = 1;
      return;
    }

    // When renderItem is provided, adjacent pages are already beside the active
    // page, so the release animation only needs to finish the drag to its target.
    // The legacy children mode keeps its short directional entrance animation.
    opacity.value = 0.92;
    translateX.value = withTiming(targetOffset, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    opacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
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
        const dragOffset = getWorkspaceSwipeOffset(
          currentIndex,
          currentItems.length,
          gesture.dx,
        );
        const pageOffset = renderItemRef.current && currentIndex >= 0
          ? -currentIndex * widthRef.current
          : 0;
        translateX.value = pageOffset + dragOffset;
        opacity.value = disableAnimationRef.current
          ? 1
          : Math.max(0.84, 1 - Math.abs(dragOffset) / Math.max(widthRef.current, 1) * 0.16);
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
      onPanResponderTerminationRequest: () => !lockGestureRef.current,
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
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth > 0 && Math.abs(nextWidth - surfaceWidthRef.current) > 0.5) {
            surfaceWidthRef.current = nextWidth;
            setSurfaceWidth(nextWidth);
            const currentIndex = itemsRef.current.indexOf(activeItemRef.current);
            if (renderItemRef.current && currentIndex >= 0) {
              translateX.value = -currentIndex * nextWidth;
            }
          }
        }}
        style={[style, styles.gestureSurface]}
        testID={testID}
      >
        {renderItem ? (
          <Animated.View
            style={[
              styles.pagerTrack,
              { width: surfaceWidthRef.current * items.length },
              animatedStyle,
            ]}
          >
            {items.map((item) => (
              <View key={item} style={{ width: surfaceWidthRef.current }}>
                {renderItemRef.current?.(item)}
              </View>
            ))}
          </Animated.View>
        ) : (
          <Animated.View style={[styles.pagerContent, animatedStyle]}>{children}</Animated.View>
        )}
      </Animated.View>
    </SwipeGestureExclusionContext.Provider>
  );
}

const styles = StyleSheet.create({
  gestureSurface: {
    overflow: 'hidden',
    minHeight: 0,
    userSelect: 'none',
  },
  pagerContent: {
    flex: 1,
    minHeight: 0,
  },
  pagerTrack: {
    flexDirection: 'row',
  },
});