import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import 'react-native-reanimated';

import StartupSplash from '@/app/components/StartupSplash';
import { CurrencyProvider } from '@/app/contexts/CurrencyContext';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/app/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [showStartup, setShowStartup] = useState(true);

  function InnerApp() {
    const colorScheme = useColorScheme();
    const appTheme = useAppTheme();
    const userTheme = appTheme?.theme ?? colorScheme;
    return (
      <ThemeProvider value={userTheme === 'dark' ? DarkTheme : DefaultTheme}>
        {showStartup ? (
          <StartupSplash visible={showStartup} onFinish={() => setShowStartup(false)} />
        ) : (
          <>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </>
        )}
      </ThemeProvider>
    );
  }

  return (
    <CurrencyProvider>
      <AppThemeProvider>
        <InnerApp />
      </AppThemeProvider>
    </CurrencyProvider>
  );
}
