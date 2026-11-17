import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ToastProvider } from '@/components/ui';
import { colors, theme } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // Do not retry client errors (wrong id, forbidden); retry network blips once or twice.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

const headerOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.bg },
};

function Gate() {
  const { status, admin } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <Text variant="headlineMedium" style={styles.splashTitle}>
          Thandra Admin
        </Text>
        <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />
      </View>
    );
  }

  const signedIn = status === 'signedIn' && !!admin;
  const mustChange = signedIn && admin.must_change_password;

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen
          name="change-password"
          options={{ title: 'Change password', headerBackVisible: !mustChange, gestureEnabled: !mustChange }}
        />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !mustChange}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="bookings/[id]" options={{ title: 'Booking' }} />
        <Stack.Screen name="cars/new" options={{ title: 'Add car' }} />
        <Stack.Screen name="cars/[id]" options={{ title: 'Car' }} />
        <Stack.Screen name="hubs/index" options={{ title: 'Hubs' }} />
        <Stack.Screen name="hubs/new" options={{ title: 'Add hub' }} />
        <Stack.Screen name="hubs/[id]" options={{ title: 'Hub' }} />
        <Stack.Screen name="customers/index" options={{ title: 'Customers' }} />
        <Stack.Screen name="customers/[id]" options={{ title: 'Customer' }} />
        <Stack.Screen name="notify" options={{ title: 'Send notification' }} />
        <Stack.Screen name="admins/index" options={{ title: 'Admin team' }} />
        <Stack.Screen name="admins/new" options={{ title: 'Add admin' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>
              <StatusBar style="light" />
              <Gate />
            </AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  splashTitle: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.5 },
});
