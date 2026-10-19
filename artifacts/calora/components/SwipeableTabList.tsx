import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
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
import Animated, { runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import {
  getWorkspacePagerRestingOffset,
  getWorkspaceSwipeOffset,
  getWorkspaceSwipePreviewIndex,
  getWorkspaceSwipeTargetIndex,
  isWorkspaceSwipeIntent,
  isWorkspaceSwipeVelocityIntent,
  WORKSPACE_SWIPE_ACTIVATION_DISTANCE,
} from '@/lib/workspaceSwipe';

type SwipeableTabListProps<T extends string> = {
  items: readonly T[];
  activeItem: T;
  onPreviewChange?: (item: T | null) => void;
  onChange: (item: T) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  testID?: string;
};

type SwipeableSectionPagerProps<T extends string> = {
  items: readonly T[];
  activeItem: T;
  onPreviewChange?: (item: T | null) => void;
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

type SwipeMenuHighlightContextValue = {
  items: readonly string[];
  visualIndex: SharedValue<number>;
  setTabStripPreview: (index: number | null) => void;
};
const SwipeMenuHighlightContext = React.createContext<SwipeMenuHighlightContextValue | null>(null);

function clampSwipeMenuIndex(index: number, itemCount: number): number {
  'worklet';
  return Math.max(0, Math.min(Math.max(0, itemCount - 1), index));
}

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

/** Shares a menu rail with its pager, so both follow the same UI-thread position. */
export function SwipeMenuHighlightProvider<T extends string>({
  items,
  activeItem,
  children,
}: {
  items: readonly T[];
  activeItem: T;
  children: React.ReactNode;
}) {
  const activeIndex = getActiveIndex(items, activeItem);
  const activeIndexValue = useSharedValue(activeIndex);
  const visualIndex = useSharedValue(activeIndex);

  useEffect(() => {
    activeIndexValue.value = activeIndex;
    visualIndex.value = activeIndex;
  }, [activeIndex, activeIndexValue, visualIndex]);

  const setTabStripPreview = useCallback((index: number | null) => {
    visualIndex.value = index === null
      ? activeIndexValue.value
      : clampSwipeMenuIndex(index, items.length);
  }, [activeIndexValue, items.length, visualIndex]);

  const value = useMemo<SwipeMenuHighlightContextValue>(() => ({
    items,
    visualIndex,
    setTabStripPreview,
  }), [items, setTabStripPreview, visualIndex]);

  return <SwipeMenuHighlightContext.Provider value={value}>{children}</SwipeMenuHighlightContext.Provider>;
}

/** A single bold rail that moves beneath equal-width menu labels without obscuring them. */
export function SwipeMenuHighlight({
  color,
  horizontalPadding = 0,
  gap = 0,
  inset = 8,
  height = 4,
  bottom = 3,
  testID,
}: {
  color: string;
  horizontalPadding?: number;
  gap?: number;
  inset?: number;
  height?: number;
  bottom?: number;
  testID?: string;
}) {
  const highlight = React.useContext(SwipeMenuHighlightContext);
  const fallbackVisualIndex = useSharedValue(0);
  const visualIndex = highlight?.visualIndex ?? fallbackVisualIndex;
  const itemCount = highlight?.items.length ?? 0;
  const trackWidth = useSharedValue(0);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    trackWidth.value = event.nativeEvent.layout.width;
  }, [trackWidth]);
  const animatedStyle = useAnimatedStyle(() => {
    if (itemCount <= 0 || trackWidth.value <= 0) return { opacity: 0 };
    const availableWidth = Math.max(0, trackWidth.value - horizontalPadding * 2 - gap * (itemCount - 1));
    const itemWidth = availableWidth / itemCount;
    const railWidth = Math.max(0, itemWidth - inset * 2);
    return {
      opacity: 1,
      width: railWidth,
      transform: [{ translateX: horizontalPadding + inset + (itemWidth + gap) * visualIndex.value }],
    };
  }, [gap, horizontalPadding, inset, itemCount, visualIndex]);

  if (!highlight) return null;

  return (
    <View
      pointerEvents="none"
      onLayout={handleLayout}
      style={[styles.menuHighlightTrack, { bottom, height }]}
      testID={testID}
    >
      <Animated.View
        style={[styles.menuHighlightRail, { backgroundColor: color, height, borderRadius: height / 2 }, animatedStyle]}
      />
    </View>
  );
}

/** Keeps tab presses intact while allowing a deliberate swipe across the tab strip. */
export function SwipeableTabList<T extends string>({
  items,
  activeItem,
  onPreviewChange,
  onChange,
  children,
  style,
  accessibilityLabel,
  testID,
}: SwipeableTabListProps<T>) {
  const menuHighlight = React.useContext(SwipeMenuHighlightContext);
  const itemsRef = useRef(items);
  const activeItemRef = useRef(activeItem);
  const onChangeRef = useRef(onChange);
  const onPreviewChangeRef = useRef(onPreviewChange);
  const menuHighlightRef = useRef(menuHighlight);
  const lastPreviewIndexRef = useRef<number | null>(null);
  itemsRef.current = items;
  activeItemRef.current = activeItem;
  onChangeRef.current = onChange;
  onPreviewChangeRef.current = onPreviewChange;
  menuHighlightRef.current = menuHighlight;

  const previewIndex = (index: number | null) => {
    if (lastPreviewIndexRef.current === index) return;
    lastPreviewIndexRef.current = index;
    menuHighlightRef.current?.setTabStripPreview(index);
    onPreviewChangeRef.current?.(index === null ? null : itemsRef.current[index] ?? null);
  };

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
      onPanResponderMove: (_event, gesture) => {
        const currentItems = itemsRef.current;
        const currentIndex = currentItems.indexOf(activeItemRef.current);
        previewIndex(getWorkspaceSwipePreviewIndex(currentIndex, currentItems.length, gesture.dx));
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
        previewIndex(null);
        if (targetIndex !== null) onChangeRef.current(currentItems[targetIndex]);
      },
      onPanResponderTerminate: () => previewIndex(null),
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
  onPreviewChange,
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
  const menuHighlight = React.useContext(SwipeMenuHighlightContext);
  const menuVisualIndex = menuHighlight?.visualIndex;
  const [surfaceWidth, setSurfaceWidth] = useState(windowWidth);
  const activeIndex = getActiveIndex(items, activeItem);
  const hasAdjacentPages = Boolean(renderItem);
  // React Native Web exposes a ScrollView ref, but its imperative horizontal
  // scroll does not reliably move an already rendered paging viewport after a
  // tab press. Keep web on the translated direct-manipulation track so the
  // visible pane always follows activeItem; native retains platform paging for
  // its vertical-scroll arbitration.
  const useNativePaging = nativePaging && Platform.OS !== 'web';
  const pageWidth = useSharedValue(windowWidth);
  const translateX = useSharedValue(getWorkspacePagerRestingOffset(activeIndex, windowWidth, hasAdjacentPages));
  const activeIndexValue = useSharedValue(activeIndex);
  const itemCountValue = useSharedValue(items.length);
  const [excluded, setExcludedState] = useState(false);
  const itemsRef = useRef(items);
  const onChangeRef = useRef(onChange);
  const onPreviewChangeRef = useRef(onPreviewChange);
  const lastPreviewIndexRef = useRef<number | null>(null);
  const nativePagerRef = useRef<React.ComponentRef<typeof Animated.ScrollView>>(null);
  itemsRef.current = items;
  onChangeRef.current = onChange;
  onPreviewChangeRef.current = onPreviewChange;

  useEffect(() => {
    activeIndexValue.value = activeIndex;
    itemCountValue.value = items.length;
    translateX.value = getWorkspacePagerRestingOffset(activeIndex, pageWidth.value, hasAdjacentPages);
  }, [activeIndex, activeIndexValue, hasAdjacentPages, itemCountValue, items.length, pageWidth, translateX]);

  const previewIndex = useCallback((index: number | null) => {
    if (lastPreviewIndexRef.current === index) return;
    lastPreviewIndexRef.current = index;
    onPreviewChangeRef.current?.(index === null ? null : itemsRef.current[index] ?? null);
  }, []);

  const clearPreview = useCallback(() => {
    previewIndex(null);
  }, [previewIndex]);

  const commitIndex = useCallback((index: number) => {
    const nextItem = itemsRef.current[index];
    if (nextItem) {
      clearPreview();
      onChangeRef.current(nextItem);
    }
  }, [clearPreview]);

  const getPreviewIndex = useCallback((index: number, offset: number) => {
    return getWorkspaceSwipePreviewIndex(index, itemsRef.current.length, offset);
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
    if (!useNativePaging || surfaceWidth <= 0) return;
    const targetIndex = Math.round(event.nativeEvent.contentOffset.x / surfaceWidth);
    const nextItem = itemsRef.current[targetIndex];
    if (nextItem && targetIndex !== getActiveIndex(itemsRef.current, activeItem)) {
      clearPreview();
      onChangeRef.current(nextItem);
    } else {
      clearPreview();
    }
  }, [activeItem, clearPreview, surfaceWidth, useNativePaging]);

  useEffect(() => {
    if (!useNativePaging || surfaceWidth <= 0) return;
    nativePagerRef.current?.getNode().scrollTo({ x: activeIndex * surfaceWidth, animated: false });
  }, [activeIndex, surfaceWidth, useNativePaging]);

  const nativePagerScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const width = pageWidth.value;
      if (width <= 0) return;
      const nextVisualIndex = clampSwipeMenuIndex(event.contentOffset.x / width, itemCountValue.value);
      if (menuVisualIndex) menuVisualIndex.value = nextVisualIndex;
      const offset = event.contentOffset.x - activeIndexValue.value * width;
      runOnJS(previewIndex)(getWorkspaceSwipePreviewIndex(activeIndexValue.value, itemCountValue.value, offset));
    },
  }, [activeIndexValue, itemCountValue, menuVisualIndex, pageWidth, previewIndex]);

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
        if (menuVisualIndex) {
          menuVisualIndex.value = clampSwipeMenuIndex(
            activeIndexValue.value - dragOffset / pageWidth.value,
            itemCountValue.value,
          );
        }
        runOnJS(previewIndex)(getPreviewIndex(activeIndexValue.value, event.translationX));
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
        if (menuVisualIndex) menuVisualIndex.value = settledIndex;
        if (targetIndex !== null) runOnJS(commitIndex)(targetIndex);
        else runOnJS(previewIndex)(null);
      })
      .onFinalize(() => {
        translateX.value = getWorkspacePagerRestingOffset(
          activeIndexValue.value,
          pageWidth.value,
          hasAdjacentPages,
        );
        if (menuVisualIndex) menuVisualIndex.value = activeIndexValue.value;
        runOnJS(previewIndex)(null);
      }),
    [activeIndexValue, commitIndex, excluded, getPreviewIndex, hasAdjacentPages, itemCountValue, menuVisualIndex, pageWidth, previewIndex, translateX],
  );

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const exclusionValue = useMemo<SwipeGestureExclusionContextValue>(() => ({ setExcluded }), [setExcluded]);
  const safeWindow = Math.max(1, Math.floor(renderWindow));

  if (useNativePaging && hasAdjacentPages && renderItem) {
    return (
      <SwipeGestureExclusionContext.Provider value={exclusionValue}>
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onLayout={handleLayout}
        style={[styles.pager, style]}
        testID={testID}
      >
        <Animated.ScrollView
          ref={nativePagerRef}
          horizontal
          pagingEnabled
          directionalLockEnabled
          nestedScrollEnabled
          scrollEnabled={!excluded}
          // Let the native scroll views negotiate the initial vertical drag.
          // This avoids the outer horizontal JS responder retaining touches
          // intended for Plus/Create/Profile/Progress vertical panes on Android.
          disableScrollViewPanResponder
          showsHorizontalScrollIndicator={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          onMomentumScrollEnd={commitNativePagerPosition}
          onScrollEndDrag={commitNativePagerPosition}
          onScroll={nativePagerScrollHandler}
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
        </Animated.ScrollView>
      </View>
      </SwipeGestureExclusionContext.Provider>
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
  menuHighlightTrack: { left: 0, position: 'absolute', right: 0 },
  menuHighlightRail: { bottom: 0, position: 'absolute' },
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
