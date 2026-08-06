import { Feather } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text, StyleSheet, View } from 'react-native';

type SaveNoticeColors = {
  card: string;
  border: string;
  foreground: string;
  mutedForeground: string;
  success: string;
};

export function LocalSaveNotice({ visible, message, colors }: { visible: boolean; message: string; colors: SaveNoticeColors }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 260 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 10 * (1 - progress.value) }],
  }));

  return (
    <Animated.View style={[styles.host, { pointerEvents: 'none' }, animatedStyle]}>
      <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.icon, { backgroundColor: colors.success }]}>
          <Feather name="check" size={12} color="#ffffff" />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.foreground }]}>Saved locally</Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 20, right: 20, bottom: 91, zIndex: 20 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, shadowColor: '#10251a', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  icon: { width: 25, height: 25, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  message: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
});