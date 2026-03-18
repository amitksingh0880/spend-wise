import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { readJson, writeJson } from '@/libs/storage';
import { importExpensesFromSMS } from './smsService';
import { getUserPreferences } from './preferencesService';

const SMS_AUTO_FETCH_TASK = 'SMS_AUTO_FETCH_TASK';
const LAST_AUTO_FETCH_RUN_KEY = 'smsAutoFetch:lastRun';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Validates if the task should run (Checks if it's after the user-specified hour and hasn't run today)
 */
const shouldRunAutoFetch = async (): Promise<boolean> => {
  const now = new Date();
  const currentHour = now.getHours();

  const prefs = await getUserPreferences();
  const targetHour = prefs.smsAutoFetchHour ?? 22;

  // Condition 1: Must be the target hour or later
  if (currentHour < targetHour) {
    return false;
  }

  // Condition 2: Must not have run successfully today
  const lastRunTimestamp = await readJson<number>(LAST_AUTO_FETCH_RUN_KEY);
  if (lastRunTimestamp) {
    const lastRunDate = new Date(lastRunTimestamp);
    const isSameDay = 
      now.getFullYear() === lastRunDate.getFullYear() &&
      now.getMonth() === lastRunDate.getMonth() &&
      now.getDate() === lastRunDate.getDate();
    
    if (isSameDay) {
      return false;
    }
  }

  return true;
};

// Define the background task
TaskManager.defineTask(SMS_AUTO_FETCH_TASK, async () => {
  try {
    console.log('[BackgroundTask] Executing SMS_AUTO_FETCH_TASK...');
    
    const canRun = await shouldRunAutoFetch();
    if (!canRun) {
      console.log('[BackgroundTask] Skipping auto-fetch (not time yet or already run today)');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    console.log('[BackgroundTask] Starting daily SMS import at 10 PM...');
    const result = await importExpensesFromSMS({ 
      onlyToday: true, 
      autoSave: true 
    });

    if (result.success) {
      await writeJson(LAST_AUTO_FETCH_RUN_KEY, Date.now());
      console.log(`[BackgroundTask] Auto-fetch successful. Imported ${result.expenses.length} expenses.`);
      
      // Notify the user if expenses were imported
      if (result.expenses.length > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Daily SMS Fetch Complete',
            body: `Automatically imported ${result.expenses.length} new expenses from your SMS. Tap to review.`,
            data: { screen: 'transactions' },
          },
          trigger: null, // send immediately
        });
      }

      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.warn('[BackgroundTask] Auto-fetch failed:', result.errors);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    console.error('[BackgroundTask] Error in SMS_AUTO_FETCH_TASK:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background fetch task
 */
export const registerSmsAutoFetch = async () => {
  if (Platform.OS !== 'android') return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SMS_AUTO_FETCH_TASK);
    if (isRegistered) {
        console.log('[BackgroundTask] Task already registered');
    }

    await BackgroundFetch.registerTaskAsync(SMS_AUTO_FETCH_TASK, {
      minimumInterval: 60 * 30, // 30 minutes (OS determines exact timing)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('[BackgroundTask] Task registered successfully');
  } catch (err) {
    console.error('[BackgroundTask] Registration failed:', err);
  }
};

/**
 * Unregister the background fetch task
 */
export const unregisterSmsAutoFetch = async () => {
  if (Platform.OS !== 'android') return;

  try {
    await BackgroundFetch.unregisterTaskAsync(SMS_AUTO_FETCH_TASK);
    console.log('[BackgroundTask] Task unregistered');
  } catch (err) {
    console.error('[BackgroundTask] Unregistration failed:', err);
  }
};

export const isSmsAutoFetchRegistered = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    return TaskManager.isTaskRegisteredAsync(SMS_AUTO_FETCH_TASK);
};
