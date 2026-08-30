import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCalora } from '@/context/CaloraContext';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { motion } from '@/constants/tokens';

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
  const isDark = mode === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

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
          ...(isWeb ? { height: 84 } : {}),
        },
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
          title: 'Home',
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
          tabBarShowLabel: false,
          tabBarButton: (props) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={props.accessibilityLabel ?? 'Open Smart Scan'}
              accessibilityState={props.accessibilityState}
              testID={props.testID}
              onPress={props.onPress}
              onLongPress={props.onLongPress}
              style={[styles.scanTabButton, props.style]}
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
        name="fitness"
        options={{
          title: 'Fitness',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              {isIOS ? <SymbolView name="figure.run" tintColor={color} size={24} /> : <Feather name="activity" size={22} color={color} />}
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
              {isIOS ? <SymbolView name="ellipsis" tintColor={color} size={24} /> : <Feather name="menu" size={22} color={color} />}
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanTabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    height: 84,
    marginTop: -18,
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
  return <ClassicTabLayout />;
}
