import React from 'react';
import { View, type ViewProps, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useCalora } from '@/context/CaloraContext';
import { shadows, radius as radiusTokens } from '@/constants/tokens';

interface SurfaceProps extends ViewProps {
  tier?: 'inset' | 'flat' | 'raised' | 'floating';
  radius?: keyof typeof radiusTokens;
  border?: boolean;
}

export function Surface({ tier = 'flat', radius = 'lg', border = true, style, ...rest }: SurfaceProps) {
  const { colors, mode } = useCalora();
  const shadowStyle = shadows[mode === 'dark' ? 'dark' : 'light'][tier];
  
  return (
    <View
      style={[
        {
          backgroundColor: tier === 'inset' ? colors.background : colors.card,
          borderRadius: radiusTokens[radius],
        },
        border && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tier === 'inset' ? colors.input : colors.border,
        },
        tier !== 'inset' && shadowStyle,
        style,
      ]}
      {...rest}
    />
  );
}
