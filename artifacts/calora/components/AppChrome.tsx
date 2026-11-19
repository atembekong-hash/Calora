import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalora } from '@/context/CaloraContext';

export function AppStatusBar() {
  const { colors, mode } = useCalora();
  return (
    <StatusBar
      style={mode === 'dark' ? 'light' : 'dark'}
      backgroundColor={colors.background}
      translucent={Platform.OS === 'android'}
    />
  );
}

type AppHeaderProps = {
  title: string;
  back?: boolean;
  onBack?: () => void;
  action?: React.ReactNode;
  leftAlignTitle?: boolean;
  titleOffset?: number;
  compact?: boolean;
};

export function AppHeader({ title, back = false, onBack, action, leftAlignTitle = false, titleOffset, compact = false }: AppHeaderProps) {
  const { colors } = useCalora();
  const insets = useSafeAreaInsets();
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, paddingTop: insets.top, borderBottomColor: colors.border }]}>
      <View style={[styles.bar, compact && styles.compactBar]}>
        {back ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" accessibilityHint="Returns to the previous screen" onPress={handleBack} hitSlop={10} style={[styles.backButton, compact && styles.compactBackButton, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
        ) : !leftAlignTitle ? <View style={styles.backSpacer} /> : null}
        <Text allowFontScaling maxFontSizeMultiplier={1.5} numberOfLines={1} style={[styles.title, compact && styles.compactTitle, leftAlignTitle && back && styles.leftAlignedTitle, titleOffset !== undefined && { marginLeft: titleOffset }, { color: colors.foreground }]}>{title}</Text>
        <View style={[styles.action, compact && styles.compactAction]}>{action}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  bar: { minHeight: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  compactBar: { minHeight: 52, paddingHorizontal: 20, gap: 6 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  compactBackButton: { width: 24, height: 24, borderRadius: 12 },
  backSpacer: { width: 44 },
  title: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: -0.2 },
  compactTitle: { fontSize: 15 },
  leftAlignedTitle: { marginLeft: -10 },
  action: { minWidth: 34, alignItems: 'flex-end' },
  compactAction: { minWidth: 26 },
});
