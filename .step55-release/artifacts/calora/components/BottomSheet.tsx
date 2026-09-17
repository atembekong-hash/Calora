import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type ModalProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_OVERLAY_COLOR = 'rgba(0,0,0,0.46)';
const MIN_BOTTOM_SPACE = 32;
const BOTTOM_CONTENT_GAP = 16;

export type BottomSheetFrameProps = {
  children: React.ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  maxHeight?: DimensionValue;
  overlayColor?: string;
  onBackdropPress?: () => void;
  sheetProps?: Omit<ViewProps, 'style'>;
};

/**
 * Shared bottom-sheet frame. It deliberately does not own scrolling so each
 * sheet can keep one scroll owner and preserve its existing content behavior.
 * The frame owns the responsive height cap and native home-indicator spacing.
 */
export function BottomSheetFrame({
  children,
  sheetStyle,
  maxHeight = '96%',
  overlayColor = DEFAULT_OVERLAY_COLOR,
  onBackdropPress,
  sheetProps,
}: BottomSheetFrameProps) {
  const insets = useSafeAreaInsets();
  const bottomSpace = Math.max(insets.bottom + BOTTOM_CONTENT_GAP, MIN_BOTTOM_SPACE);

  return (
    <View style={[styles.backdrop, { backgroundColor: overlayColor }]}>
      {onBackdropPress ? (
        <Pressable
          accessibilityLabel="Close sheet"
          onPress={onBackdropPress}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        {...sheetProps}
        accessibilityViewIsModal
        style={[
          styles.sheet,
          sheetStyle,
          {
            maxHeight,
            paddingBottom: bottomSpace,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export type BottomSheetProps = Omit<ModalProps, 'children'> &
  Omit<BottomSheetFrameProps, 'sheetProps'> & {
    children: React.ReactNode;
  };

export function BottomSheet({
  visible,
  onRequestClose,
  children,
  animationType = 'slide',
  transparent = true,
  sheetStyle,
  maxHeight = '96%',
  overlayColor = DEFAULT_OVERLAY_COLOR,
  onBackdropPress,
  ...modalProps
}: BottomSheetProps) {
  return (
    <Modal
      {...modalProps}
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      onRequestClose={onRequestClose}
    >
      <BottomSheetFrame
        sheetStyle={sheetStyle}
        maxHeight={maxHeight}
        overlayColor={overlayColor}
        onBackdropPress={onBackdropPress}
      >
        {children}
      </BottomSheetFrame>
    </Modal>
  );
}

export const bottomSheetConstants = {
  bottomContentGap: BOTTOM_CONTENT_GAP,
  minBottomSpace: MIN_BOTTOM_SPACE,
} as const;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    flexShrink: 1,
    minHeight: 0,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
  },
});