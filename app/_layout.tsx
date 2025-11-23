import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import AuthLock from '@/app/components/AuthLock';
import StartupSplash from '@/app/components/StartupSplash';
import { CurrencyProvider } from '@/app/contexts/CurrencyContext';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/app/contexts/ThemeContext';
import { emitter } from '@/app/libs/emitter';
import authService from '@/app/services/authService';
import { getUserPreferences } from '@/app/services/preferencesService';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [showStartup, setShowStartup] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const hasPin = await authService.hasPin();
        const prefs = await getUserPreferences();
        if (hasPin && prefs.requireAuthOnStartup) {
          if (prefs.biometricEnabled) {
            const available = await authService.isBiometricAvailable();
            if (available) {
              const ok = await authService.authenticateBiometric();
              if (!ok) setIsLocked(true);
            } else setIsLocked(true);
          } else setIsLocked(true);
        }
      } catch (err) {
        console.warn('Auth check failed', err);
      }
    })();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        try {
          const prefs = await getUserPreferences();
          const hasPin = await authService.hasPin();
          if (hasPin && prefs.requireAuthOnStartup) setIsLocked(true);
        } catch (err) {
          // ignore
        }
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsub = emitter.addListener('auth:lock', () => setIsLocked(true));
    return () => { unsub(); };
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
            <StatusBar style="auto" />
          </>
        )}
      </ThemeProvider>
    );
  }

  return (
    <CurrencyProvider>
      <AppThemeProvider>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1 }} edges={[ 'top' ]}>
            <InnerApp />
          </SafeAreaView>
        </SafeAreaProvider>
        {!showStartup && isLocked && (
          <AuthLock visible={true} onSuccess={() => setIsLocked(false)} onCancel={() => {}} />
        )}
      </AppThemeProvider>
    </CurrencyProvider>
  );
}
