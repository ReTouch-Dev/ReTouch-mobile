import { useEffect } from 'react';
import { Redirect, Stack, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { colors } from '../src/theme/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    hydrate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return null;

  const inAuthGroup = segments[0] === 'auth';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* Declarative auth guard — Redirect is integrated with Expo Router's navigation lifecycle */}
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
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
