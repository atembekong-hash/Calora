import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import {
  getWorkspacePagerRestingOffset,
  getWorkspaceSwipeOffset,
  getWorkspaceSwipeTargetIndex,
  isWorkspaceSwipeIntent,
  isWorkspaceSwipeVelocityIntent,
  WORKSPACE_SWIPE_ACTIVATION_DISTANCE,
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
  /** Renders real adjacent panes in one horizontal track. */
  renderItem?: (item: T) => React.ReactNode;
  /** Number of adjacent pane bodies to retain on either side. */
  renderWindow?: number;
  /**
   * Use React Native's directional pager when panes contain their own vertical
   * scroll views. This lets Android arbitrate horizontal pages and vertical
   * content natively instead of a parent pan recognizer retaining the stream.
   */
  nativePaging?: boolean;
  /** Lets section panes fill the available height of the parent screen. */
  fillViewport?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** Retained for existing callers; native cancellation owns gesture release. */
  lockGesture?: boolean;
  /** Retained for callers; this pager always releases without a timing animation. */
  disableAnimation?: boolean;
  testID?: string;
};

type SwipeGestureExclusionContextValue = { setExcluded: (excluded: boolean) => void };
const SwipeGestureExclusionContext = React.createContext<SwipeGestureExclusionContextValue | null>(null);

/** Marks nested horizontal controls so the page pan can fail before capturing them. */
export function SwipeGestureExclusion({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const exclusion = React.useContext(SwipeGestureExclusionContext);
  if (!exclusion) return <>{children}</>;

  return (
    <View
      collapsable={false}
      onTouchCancel={() => exclusion.setExcluded(false)}
      onTouchEnd={() => exclusion.setExcluded(false)}
      onTouchStart={() => exclusion.setExcluded(true)}
      style={style}
    >
      {children}
    </View>
  );
}

function getActiveIndex<T extends string>(items: readonly T[], activeItem: T) {
  const index = items.indexOf(activeItem);
  return index >= 0 ? index : 0;
}

/** Keeps tab presses intact while allowing a deliberate swipe across the tab strip. */
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
        if (targetIndex !== null) onChangeRef.current(currentItems[targetIndex]);
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
 * Native direct-manipulation pager. It holds the active and adjacent panes in a
 * horizontal track and applies the exact finger translation on the UI thread.
 * It never fades, springs, or starts a release timing animation.
 */
export function SwipeableSectionPager<T extends string>({
  items,
  activeItem,
  onChange,
  children,
  renderItem,
  renderWindow = 1,
  nativePaging = false,
  fillViewport = false,
  style,
  accessibilityLabel,
  accessibilityHint = 'Swipe left or right to switch sections',
  testID,
}: SwipeableSectionPagerProps<T>) {
  const { width: windowWidth } = useWindowDimensions();
  const [surfaceWidth, setSurfaceWidth] = useState(windowWidth);
  const activeIndex = getActiveIndex(items, activeItem);
  const hasAdjacentPages = Boolean(renderItem);
  const pageWidth = useSharedValue(windowWidth);
  const translateX = useSharedValue(getWorkspacePagerRestingOffset(activeIndex, windowWidth, hasAdjacentPages));
  const activeIndexValue = useSharedValue(activeIndex);
  const itemCountValue = useSharedValue(items.length);
  const [excluded, setExcludedState] = useState(false);
  const itemsRef = useRef(items);
  const onChangeRef = useRef(onChange);
  const nativePagerRef = useRef<ScrollView>(null);
  itemsRef.current = items;
  onChangeRef.current = onChange;

  useEffect(() => {
    activeIndexValue.value = activeIndex;
    itemCountValue.value = items.length;
    translateX.value = getWorkspacePagerRestingOffset(activeIndex, pageWidth.value, hasAdjacentPages);
  }, [activeIndex, activeIndexValue, hasAdjacentPages, itemCountValue, items.length, pageWidth, translateX]);

  const commitIndex = useCallback((index: number) => {
    const nextItem = itemsRef.current[index];
    if (nextItem) onChangeRef.current(nextItem);
  }, []);

  const setExcluded = useCallback((isExcluded: boolean) => {
    setExcludedState(isExcluded);
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (!Number.isFinite(nextWidth) || nextWidth <= 0 || Math.abs(nextWidth - pageWidth.value) <= 0.5) return;
    setSurfaceWidth(nextWidth);
    pageWidth.value = nextWidth;
    translateX.value = getWorkspacePagerRestingOffset(activeIndexValue.value, nextWidth, hasAdjacentPages);
  }, [activeIndexValue, hasAdjacentPages, pageWidth, translateX]);

  const commitNativePagerPosition = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!nativePaging || surfaceWidth <= 0) return;
    const targetIndex = Math.round(event.nativeEvent.contentOffset.x / surfaceWidth);
    const nextItem = itemsRef.current[targetIndex];
    if (nextItem && targetIndex !== getActiveIndex(itemsRef.current, activeItem)) {
      onChangeRef.current(nextItem);
    }
  }, [activeItem, nativePaging, surfaceWidth]);

  useEffect(() => {
    if (!nativePaging || surfaceWidth <= 0) return;
    nativePagerRef.current?.scrollTo({ x: activeIndex * surfaceWidth, animated: false });
  }, [activeIndex, nativePaging, surfaceWidth]);

  const pagerSwipe = useMemo(
    () => Gesture.Pan()
      // Declarative thresholds let Android pass ordinary taps and vertical
      // ScrollView gestures to the native child controls. A manual pan
      // recognizer can retain the pointer stream before a Pressable receives
      // its release, leaving a whole pane seemingly unresponsive.
      .enabled(!excluded)
      .activeOffsetX([-WORKSPACE_SWIPE_ACTIVATION_DISTANCE, WORKSPACE_SWIPE_ACTIVATION_DISTANCE])
      .failOffsetY([-WORKSPACE_SWIPE_ACTIVATION_DISTANCE, WORKSPACE_SWIPE_ACTIVATION_DISTANCE])
      .maxPointers(1)
      .averageTouches(true)
      .onUpdate((event) => {
        const dragOffset = getWorkspaceSwipeOffset(
          activeIndexValue.value,
          itemCountValue.value,
          event.translationX,
        );
        translateX.value = getWorkspacePagerRestingOffset(
          activeIndexValue.value,
          pageWidth.value,
          hasAdjacentPages,
        ) + dragOffset;
      })
      .onEnd((event) => {
        const currentIndex = activeIndexValue.value;
        const targetIndex = getWorkspaceSwipeTargetIndex(
          currentIndex,
          itemCountValue.value,
          event.translationX,
          event.translationY,
          event.velocityX,
          event.velocityY,
        );
        const settledIndex = targetIndex ?? currentIndex;
        activeIndexValue.value = settledIndex;
        translateX.value = getWorkspacePagerRestingOffset(settledIndex, pageWidth.value, hasAdjacentPages);
        if (targetIndex !== null) runOnJS(commitIndex)(targetIndex);
      })
      .onFinalize(() => {
        translateX.value = getWorkspacePagerRestingOffset(
          activeIndexValue.value,
          pageWidth.value,
          hasAdjacentPages,
        );
      }),
    [activeIndexValue, commitIndex, excluded, hasAdjacentPages, itemCountValue, pageWidth, translateX],
  );

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const exclusionValue = useMemo<SwipeGestureExclusionContextValue>(() => ({ setExcluded }), [setExcluded]);
  const safeWindow = Math.max(1, Math.floor(renderWindow));

  if (nativePaging && hasAdjacentPages && renderItem) {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onLayout={handleLayout}
        style={[styles.pager, style]}
        testID={testID}
      >
        <ScrollView
          ref={nativePagerRef}
          horizontal
          pagingEnabled
          directionalLockEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          onMomentumScrollEnd={commitNativePagerPosition}
          onScrollEndDrag={commitNativePagerPosition}
          style={styles.nativePager}
          contentContainerStyle={[styles.nativePagerTrack, fillViewport && styles.nativePagerTrackFill]}
        >
          {items.map((item, index) => {
            const shouldRenderBody = Math.abs(index - activeIndex) <= safeWindow;
            return (
              <View
                key={item}
                style={[styles.pagerPage, fillViewport && styles.pagerPageFill, { width: surfaceWidth }]}
                testID={testID ? `${testID}-pane-${item}` : undefined}
              >
                {shouldRenderBody ? renderItem(item) : <View pointerEvents="none" style={styles.pagerPlaceholder} />}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <SwipeGestureExclusionContext.Provider value={exclusionValue}>
      <GestureDetector gesture={pagerSwipe}>
        <View
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          onLayout={handleLayout}
          style={[styles.pager, style]}
          testID={testID}
        >
          <Animated.View style={[styles.pagerTrack, fillViewport && styles.pagerTrackFill, trackStyle]}>
            {hasAdjacentPages && renderItem ? items.map((item, index) => {
              const shouldRenderBody = Math.abs(index - activeIndex) <= safeWindow;
              return (
                <View
                  key={item}
                  style={[styles.pagerPage, fillViewport && styles.pagerPageFill, { width: surfaceWidth }]}
                  testID={testID ? `${testID}-pane-${item}` : undefined}
                >
                  {shouldRenderBody ? renderItem(item) : <View pointerEvents="none" style={styles.pagerPlaceholder} />}
                </View>
              );
            }) : (
              <View style={[styles.pagerPage, fillViewport && styles.pagerPageFill, { width: surfaceWidth }]}>{children}</View>
            )}
          </Animated.View>
        </View>
      </GestureDetector>
    </SwipeGestureExclusionContext.Provider>
  );
}

const styles = StyleSheet.create({
  gestureSurface: { overflow: 'hidden', minHeight: 0, userSelect: 'none' },
  pager: { overflow: 'hidden', minHeight: 0, width: '100%' },
  pagerTrack: { alignItems: 'flex-start', flexDirection: 'row' },
  pagerTrackFill: { flex: 1 },
  pagerPage: { flexShrink: 0 },
  pagerPageFill: { height: '100%' },
  pagerPlaceholder: { minHeight: 1 },
  nativePager: { flex: 1, minHeight: 0, width: '100%' },
  nativePagerTrack: { alignItems: 'stretch' },
  nativePagerTrackFill: { flexGrow: 1 },
});
