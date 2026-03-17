import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import StartupSplash from '@/components/StartupSplash';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
// Auth code removed
import { getUserPreferences } from '@/services/preferencesService';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { 
  useFonts, 
  JetBrainsMono_400Regular, 
  JetBrainsMono_500Medium, 
  JetBrainsMono_600SemiBold, 
  JetBrainsMono_700Bold 
} from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [showStartup, setShowStartup] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    // Authentication flow removed for now
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      // Background auth behavior removed
    });
    return () => subscription.remove();
  }, []);

  // auth emitter removed

  const [fontsLoaded] = useFonts({
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // Or a minimal fallback view if preferred
  }

  function InnerApp() {
    const colorScheme = useColorScheme();
    const appTheme = useAppTheme();
    const userTheme = appTheme?.theme ?? colorScheme;
    return (
      /* @ts-ignore */
      <ThemeProvider value={userTheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1 }}>
          {showStartup ? (
            <StartupSplash visible={showStartup} onFinish={() => setShowStartup(false)} />
          ) : (
            <>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="auto" />
            </>
          )}
        </View>
      </ThemeProvider>
    );
  }

  return (
    <CurrencyProvider>
      <AppThemeProvider>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <InnerApp />
          </SafeAreaView>
        </SafeAreaProvider>
      </AppThemeProvider>
    </CurrencyProvider>
  );
}
