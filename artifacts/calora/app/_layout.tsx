import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { CaloraProvider } from '@/context/CaloraContext';
import { AuthProvider } from '@/context/AuthContext';
import { setBaseUrl } from '@workspace/api-client-react';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
setBaseUrl(process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : null);

// Configure foreground notification display (required by expo-notifications).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable window-focus refetching — on mobile (native) there are no
      // browser focus events. On web preview, focus events from user interaction
      // would trigger mid-click re-renders that swap DOM nodes and break
      // button presses in modals. Individual queries set their own staleTime.
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Listens for notification taps and navigates to the relevant tab.
 * Must be inside the router context so useRouter works.
 */
function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    // Register Android notification channels once on mount.
    if (Platform.OS === 'android') {
      Promise.all([
        Notifications.setNotificationChannelAsync('calora-hydration', {
          name: 'Hydration reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4caf7d',
        }),
        Notifications.setNotificationChannelAsync('calora-meals', {
          name: 'Meal reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4caf7d',
        }),
        Notifications.setNotificationChannelAsync('calora-goal', {
          name: 'Goal check-ins',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4caf7d',
        }),
      ]).catch(() => {});
    }

    // Navigate to home when user taps any CaloraApp notification.
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const category = response.notification.request.content.data?.category;
        if (category === 'hydration' || category === 'meal' || category === 'goal') {
          router.navigate('/');
        }
      },
    );

    return () => subscription.remove();
  }, [router]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <NotificationHandler />
      <Stack screenOptions={{ headerBackTitle: 'Back', contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="coach" options={{ headerShown: false }} />
        <Stack.Screen name="memory" options={{ headerShown: false }} />
        {/* OAuth deep-link callback — caloraapp://auth/callback */}
        <Stack.Screen name="auth/callback" options={{ headerShown: false, presentation: 'transparentModal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <CaloraProvider>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </CaloraProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
