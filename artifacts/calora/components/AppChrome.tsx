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
};

export function AppHeader({ title, back = false, onBack, action }: AppHeaderProps) {
  const { colors } = useCalora();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, paddingTop: insets.top, borderBottomColor: colors.border }]}>
      <View style={styles.bar}>
        {back ? (
          <Pressable accessibilityLabel="Go back" onPress={onBack ?? (() => router.back())} hitSlop={10} style={[styles.backButton, { backgroundColor: colors.muted }]}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
        ) : <View style={styles.backSpacer} />}
        <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <View style={styles.action}>{action}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  bar: { minHeight: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  backSpacer: { width: 34 },
  title: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: -0.2 },
  action: { minWidth: 34, alignItems: 'flex-end' },
});