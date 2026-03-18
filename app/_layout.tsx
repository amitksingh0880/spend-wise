import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
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
import { registerSmsAutoFetch } from '@/services/backgroundTaskService';
import { 
  useFonts, 
  JetBrainsMono_400Regular, 
  JetBrainsMono_500Medium, 
  JetBrainsMono_600SemiBold, 
  JetBrainsMono_700Bold 
} from '@expo-google-fonts/jetbrains-mono';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { OpenSans_400Regular, OpenSans_500Medium, OpenSans_600SemiBold, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [showStartup, setShowStartup] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Listener for notification responses (when user taps a notification)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { screen } = response.notification.request.content.data;
      if (screen === 'transactions') {
        router.push('/(tabs)/transaction');
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Authentication flow removed for now
    
    // Register background tasks if enabled
    const initBackgroundTasks = async () => {
      try {
        const prefs = await getUserPreferences();
        if (prefs.smsAutoFetch) {
          // Request notification permissions
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          
          if (finalStatus === 'granted') {
            await registerSmsAutoFetch();
          } else {
             console.warn('Notification permission not granted, but SMS auto-fetch is enabled.');
             // We still register the task, but notify user that notifications won't work
             await registerSmsAutoFetch();
          }
        }
      } catch (error) {
        console.error('Failed to initialize background tasks', error);
      }
    };
    
    initBackgroundTasks();
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
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
    OpenSans_400Regular,
    OpenSans_500Medium,
    OpenSans_600SemiBold,
    OpenSans_700Bold,
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
        <View style={{ flex: 1, width: '100%' }}>
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
          <SafeAreaView style={{ flex: 1, width: '100%' }} edges={['top']}>
            <InnerApp />
          </SafeAreaView>
        </SafeAreaProvider>
      </AppThemeProvider>
    </CurrencyProvider>
  );
}
