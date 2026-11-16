import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { FeedbackProvider } from '@/components/feedback';
import { Shell } from '@/components/shell';
import { StoreProvider, useStore } from '@/data/store';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <StoreProvider>
      <ThemedApp />
    </StoreProvider>
  );
}

function ThemedApp() {
  const { colors, scheme } = useTheme();
  const { status } = useStore();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <FeedbackProvider>
        <Shell>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="habit" />
            <Stack.Screen name="habit-form" options={{ presentation: 'modal' }} />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          </Stack>
        </Shell>
      </FeedbackProvider>
    </ThemeProvider>
  );
}
