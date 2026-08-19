import React, { useMemo, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  getWorkspaceSwipeTargetIndex,
  isWorkspaceSwipeIntent,
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
        isWorkspaceSwipeIntent(gesture.dx, gesture.dy),
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        isWorkspaceSwipeIntent(gesture.dx, gesture.dy),
      onPanResponderRelease: (_event, gesture) => {
        const currentItems = itemsRef.current;
        const currentIndex = currentItems.indexOf(activeItemRef.current);
        const targetIndex = getWorkspaceSwipeTargetIndex(
          currentIndex,
          currentItems.length,
          gesture.dx,
          gesture.dy,
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

const styles = StyleSheet.create({
  gestureSurface: {
    userSelect: 'none',
  },
});