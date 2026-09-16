/**
 * SettingRowPressable — the Pressable that powers every settings row in profile.tsx.
 *
 * Extracted as a named component so rendering tests can mount it directly with
 * controlled props (no ProfileScreen native dependencies required) and assert that
 * the `disabled` and `accessibilityState` wiring is intact.
 *
 * The disabled prop and accessibilityState must always stay in sync:
 *   disabled={disabled}                  — prevents onPress from firing
 *   accessibilityState={{ disabled }}    — informs assistive technology
 *
 * If either is removed, the export row guard (and any other guarded row) will
 * silently regress — the rendering tests that import this component catch that.
 *
 * Production usage (profile.tsx):
 *   <SettingRowPressable
 *     testID="export-data-row"
 *     onPress={handleExport}
 *     disabled={!hasExportData || isExporting}
 *     style={[styles.settingRow, { opacity: disabled ? 0.4 : 1 }]}
 *   >
 *     {... row content ...}
 *   </SettingRowPressable>
 */

import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

export interface SettingRowPressableProps {
  testID?: string;
  onPress: (() => void) | undefined;
  /**
   * When true the Pressable is inert:
   *   – onPress is not invoked when the row is tapped
   *   – accessibilityState.disabled is set to true so screen readers announce
   *     the row as non-interactive
   */
  disabled: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function SettingRowPressable({
  testID,
  onPress,
  disabled,
  style,
  children,
}: SettingRowPressableProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={style}
    >
      {children}
    </Pressable>
  );
}
