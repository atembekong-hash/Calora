import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCalora } from '@/context/CaloraContext';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion } from '@/constants/tokens';
import { getRootAccessGateState } from '@/lib/rootAccessGate';

function AnimatedTabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(focused ? 1.18 : 1, {
      ...motion.micro.spring,
      damping: 14,
      stiffness: 220,
      mass: 0.7,
      reduceMotion: ReduceMotion.System,
    });
  }, [focused, scale]);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

function ClassicTabLayout() {
  const { colors, mode } = useCalora();
  const insets = useSafeAreaInsets();
  const isDark = mode === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  // The raised Scan button contains both a 62dp circle and a text label.
  // Android's default 56dp bar cannot contain that layout, which pushed the
  // label below the system navigation area on edge-to-edge devices. Keep a
  // single, inset-aware native bar height so every sibling label and the
  // custom Scan label remain in the touchable, visible application viewport.
  const tabBarHeight = isWeb ? 84 : Math.max(88, 56 + insets.bottom);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          height: tabBarHeight,
          paddingTop: isWeb ? 0 : 4,
          paddingBottom: isWeb ? 0 : Math.max(insets.bottom, 4),
        },
        tabBarItemStyle: styles.tabBarItem,
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              {isIOS ? <SymbolView name="house" tintColor={color} size={24} /> : <Feather name="home" size={22} color={color} />}
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              {isIOS ? <SymbolView name="book.closed" tintColor={color} size={22} /> : <Feather name="book-open" size={21} color={color} />}
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          // Keep labels enabled at the navigator level. The custom button
          // renders Scan's label itself; disabling labels here causes the
          // native tab navigator to hide sibling labels when Scan is focused.
          tabBarShowLabel: true,
          tabBarButton: (props) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={props.accessibilityLabel ?? 'Open Smart Scan'}
              accessibilityState={props.accessibilityState}
              testID={props.testID}
              onPress={props.onPress}
              onLongPress={props.onLongPress}
              // Navigator item styles may include the platform's compact
              // default height. Apply the Scan geometry last so it cannot be
              // compressed into the Android system-navigation area.
              style={[props.style, styles.scanTabButton]}
            >
              <View style={[styles.scanTabCircle, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                <Feather name="camera" size={24} color={colors.primaryForeground} />
              </View>
              <Text style={[styles.scanTabLabel, { color: colors.primary }]}>Scan</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              {isIOS ? <SymbolView name="calendar" tintColor={color} size={23} /> : <Feather name="calendar" size={22} color={color} />}
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              {isIOS ? <SymbolView name="ellipsis.circle" tintColor={color} size={23} /> : <Feather name="more-horizontal" size={23} color={color} />}
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen name="insights" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bootstrap: {
    flex: 1,
  },
  tabBarItem: {
    minHeight: 44,
  },
  scanTabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    height: 88,
    marginTop: -24,
  },
  scanTabCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    shadowColor: '#17231f',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  scanTabLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    marginTop: 2,
  },
});

export default function TabLayout() {
  const {
    colors,
    hydrated,
    hydrationError,
    profileSyncReady,
    onboardingComplete,
  } = useCalora();
  const { applicationReady } = getRootAccessGateState({
    hydrated,
    hydrationError,
    profileSyncReady,
    onboardingComplete,
    reviewRequested: false,
  });

  // Root registration keeps a valid cold-load tab URL out of generic not-found
  // recovery. Keep that registration non-sensitive until the same secure gate
  // admits the application.
  if (!applicationReady) {
    return <View testID="tab-route-bootstrap" style={[styles.bootstrap, { backgroundColor: colors.background }]} />;
  }

  return <ClassicTabLayout />;
}
