import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import StartupSplash from '@/app/components/StartupSplash';
import SidebarOverlay from '@/app/components/SidebarLayout';
import { CurrencyProvider } from '@/app/contexts/CurrencyContext';
import { SidebarProvider } from '@/app/contexts/SidebarContext';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/app/contexts/ThemeContext';
import { getUserPreferences } from '@/app/services/preferencesService';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [showStartup, setShowStartup] = useState(true);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (_state) => {
      // Background auth behavior removed
    });
    return () => subscription.remove();
  }, []);

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
            {/* Floating sidebar overlay — sits above all screens */}
            <SidebarOverlay />
            <StatusBar style="auto" />
          </>
        )}
      </ThemeProvider>
    );
  }

  return (
    <CurrencyProvider>
      <AppThemeProvider>
        <SidebarProvider>
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
              <InnerApp />
            </SafeAreaView>
          </SafeAreaProvider>
        </SidebarProvider>
      </AppThemeProvider>
    </CurrencyProvider>
  );
}
