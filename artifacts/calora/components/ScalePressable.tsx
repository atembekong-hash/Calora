/**
 * ScalePressable — drop-in Pressable replacement with spring scale feedback
 * and optional haptic response. Used app-wide for Tier 1 animation polish.
 */
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { motion } from '@/constants/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ScalePressableProps extends Omit<PressableProps, 'style'> {
  /** Scale factor when pressed. Default 0.96 */
  scale?: number;
  /**
   * Haptic style on press.
   * 'light' | 'medium' | 'heavy' | 'selection' | 'none'
   * Default 'light'
   */
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function ScalePressable({
  scale = 0.96,
  haptic = 'light',
  onPress,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: ScalePressableProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(pressed.value ? scale : 1, {
          ...motion.micro.spring,
          reduceMotion: ReduceMotion.System,
        }),
      },
    ],
  }));

  const handlePressIn: PressableProps['onPressIn'] = (e) => {
    pressed.value = 1;
    onPressIn?.(e);
  };

  const handlePressOut: PressableProps['onPressOut'] = (e) => {
    pressed.value = 0;
    onPressOut?.(e);
  };

  const handlePress: PressableProps['onPress'] = (e) => {
    if (haptic !== 'none') {
      if (haptic === 'selection') {
        Haptics.selectionAsync();
      } else {
        Haptics.impactAsync(
          haptic === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : haptic === 'heavy'
              ? Haptics.ImpactFeedbackStyle.Heavy
              : Haptics.ImpactFeedbackStyle.Light,
        );
      }
    }
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[animatedStyle, style] as StyleProp<ViewStyle>}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
