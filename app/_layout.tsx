import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import 'react-native-reanimated';

import { CurrencyProvider } from '@/app/contexts/CurrencyContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import StartupSplash from '@/app/components/StartupSplash';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showStartup, setShowStartup] = useState(true);

  return (
    <CurrencyProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        {showStartup && <StartupSplash visible={showStartup} onFinish={() => setShowStartup(false)} />}
        <StatusBar style="auto" />
      </ThemeProvider>
    </CurrencyProvider>
  );
}
