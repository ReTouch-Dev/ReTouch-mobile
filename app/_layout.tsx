import { useEffect } from 'react';
import { Redirect, Stack, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useTheme } from '../src/hooks/useTheme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,    // 5 min default
      gcTime:    30 * 60_000,   // 30 min gc
    },
  },
});

function AppNavigator() {
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const { colors } = useTheme();
  const segments = useSegments();

  useEffect(() => {
    hydrate();
    hydrateTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return null;

  const inAuthGroup = segments[0] === 'auth';

  return (
    <>
      {!isAuthenticated && !inAuthGroup && <Redirect href="/auth/login" />}
      {isAuthenticated && inAuthGroup && <Redirect href="/(tabs)/receipts" />}

      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen
          name="receipt/[id]"
          options={{
            headerShown: true,
            title: 'Receipt',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text1,
            headerTitleStyle: { color: colors.text1, fontWeight: '700' },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="change-password"
          options={{
            headerShown: true,
            title: 'Change Password',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text1,
            headerTitleStyle: { color: colors.text1, fontWeight: '700' },
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
