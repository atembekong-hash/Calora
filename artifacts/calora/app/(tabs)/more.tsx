import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCalora } from '@/context/CaloraContext';
import { AppHeader } from '@/components/AppChrome';
import { Surface } from '@/components/Surface';
import { ScalePressable } from '@/components/ScalePressable';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BRAND } from '@/lib/brand';

type CaloraColors = ReturnType<typeof useCalora>['colors'];

function RouteCard({ 
  title, 
  subtitle, 
  icon, 
  onPress, 
  colors,
  testID,
  scale = 1
}: { 
  title: string; 
  subtitle: string; 
  icon: keyof typeof Feather.glyphMap; 
  onPress: () => void;
  colors: CaloraColors;
  testID?: string;
  scale?: number;
}) {
  return (
    <ScalePressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} onPress={onPress} scale={0.96} testID={testID}>
      <Surface tier="raised" style={[styles.routeCard, { backgroundColor: colors.hero }]}>
        <View style={[styles.routeIconWrap, { backgroundColor: colors.primary }]}>
          <Feather name={icon} size={24} color={colors.primaryForeground} />
        </View>
        <View style={styles.routeInfo}>
          <Text style={[styles.routeTitle, { color: colors.onHero, fontSize: 18 * scale }]}>{title}</Text>
          <Text style={[styles.routeSubtitle, { color: colors.heroMuted, fontSize: 14 * scale }]}>{subtitle}</Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.heroMuted} />
      </Surface>
    </ScalePressable>
  );
}

function SmallRouteRow({ 
  title, 
  icon, 
  onPress, 
  colors,
  testID,
  scale = 1
}: { 
  title: string; 
  icon: keyof typeof Feather.glyphMap; 
  onPress: () => void;
  colors: CaloraColors;
  testID?: string;
  scale?: number;
}) {
  return (
    <ScalePressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} onPress={onPress} scale={0.98} testID={testID}>
      <Surface tier="flat" style={[styles.smallRouteRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.smallIconWrap, { backgroundColor: colors.muted }]}>
          <Feather name={icon} size={18} color={colors.foreground} />
        </View>
        <Text style={[styles.smallRouteTitle, { color: colors.foreground, fontSize: 16 * scale }]}>{title}</Text>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </Surface>
    </ScalePressable>
  );
}

export default function MoreScreen() {
  const { colors, fontScale } = useCalora();
  const insets = useSafeAreaInsets();
  const scale = fontScale ?? 1;

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: insets.bottom + 120,
      gap: 24,
    },
    header: {
      gap: 8,
      marginBottom: 8,
    },
    title: {
      fontFamily: 'Inter_700Bold',
      fontSize: 28 * scale,
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontFamily: 'Inter_400Regular',
      fontSize: 16 * scale,
      color: colors.mutedForeground,
    },
    mainRoutes: {
      gap: 16,
    },
    secondaryRoutes: {
      gap: 12,
      marginTop: 8,
    },
    sectionTitle: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14 * scale,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
      marginLeft: 4,
    }
  }), [colors, fontScale, insets.bottom]);

  return (
    <View style={dynamicStyles.container} testID="more-screen">
      <AppHeader title="More" />
      
      <ScrollView 
        contentContainerStyle={dynamicStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={dynamicStyles.header}>
          <Text style={dynamicStyles.title}>Plan, progress, and settings</Text>
          <Text style={dynamicStyles.subtitle}>Keep the rest of {BRAND.name} organized in one place.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={dynamicStyles.mainRoutes}>
          <RouteCard
            title="Plan"
            subtitle="Plan meals, organize your week, and build your shopping list"
            icon="calendar"
            onPress={() => router.navigate('/(tabs)/planner')}
            colors={colors}
            testID="more-route-planner"
            scale={scale}
          />
          <RouteCard
            title="Progress"
            subtitle="Review trends, check-ins, weight, and trusted health signals"
            icon="bar-chart-2"
            onPress={() => router.navigate('/(tabs)/insights')}
            colors={colors}
            testID="more-route-insights"
            scale={scale}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={dynamicStyles.secondaryRoutes}>
          <Text style={dynamicStyles.sectionTitle}>Account</Text>
          <SmallRouteRow
            title="Profile & Settings"
            icon="user"
            onPress={() => router.navigate('/(tabs)/profile')}
            colors={colors}
            testID="more-route-profile"
            scale={scale}
          />
          <SmallRouteRow
            title="Membership"
            icon="star"
            onPress={() => router.navigate('/(tabs)/profile?tab=membership')}
            colors={colors}
            testID="more-route-membership"
            scale={scale}
          />
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 16,
  },
  routeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfo: {
    flex: 1,
    gap: 4,
  },
  routeTitle: {
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.3,
  },
  routeSubtitle: {
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  smallRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  smallIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallRouteTitle: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
  },
});
