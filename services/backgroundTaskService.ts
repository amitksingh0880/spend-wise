import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { readJson, writeJson } from '@/libs/storage';
import { checkSMSPermission, importExpensesFromSMS } from './smsService';
import { getUserPreferences } from './preferencesService';
import { getNotificationsModule } from './notificationsRuntime';
import { generateHumorousNotification } from './aiService';

const SMS_AUTO_FETCH_TASK = 'SMS_AUTO_FETCH_TASK';
const LAST_AUTO_FETCH_RUN_KEY = 'smsAutoFetch:lastRun';

export interface SmsAutoFetchRegistrationResult {
  ok: boolean;
  reason?: string;
}

let notificationHandlerConfigured = false;

const ensureNotificationHandler = async (): Promise<void> => {
  if (notificationHandlerConfigured) return;

  const notifications = await getNotificationsModule();
  if (!notifications) return;

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  notificationHandlerConfigured = true;
};

/**
 * Validates if the task should run (Checks if it's after the user-specified hour and hasn't run today)
 */
/**
 * Validates if the task should run
 * (Runs if auto-fetch is enabled and hasn't run in the last 30 minutes)
 * We removed the strict targetHour check to allow it to be more "automatic"
 * as requested by the user, but it still focuses on "current day" messages.
 */
const shouldRunAutoFetch = async (): Promise<boolean> => {
  const prefs = await getUserPreferences();
  if (!prefs.smsAutoFetch) {
    return false;
  }

  // Frequency capping: at most once every 15 minutes to be polite to the OS
  const lastRunTimestamp = await readJson<number>(LAST_AUTO_FETCH_RUN_KEY);
  if (lastRunTimestamp) {
    const minWait = 15 * 60 * 1000; // 15 mins
    if (Date.now() - lastRunTimestamp < minWait) {
      return false;
    }
  }

  return true;
};

// Define the background task
TaskManager.defineTask(SMS_AUTO_FETCH_TASK, async () => {
  try {
    console.log('[BackgroundTask] Executing SMS_AUTO_FETCH_TASK...');

    const hasSmsPermission = await checkSMSPermission();
    if (!hasSmsPermission) {
      console.warn('[BackgroundTask] READ_SMS permission not granted. Skipping auto-fetch.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
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
      // LAST_AUTO_FETCH_RUN_KEY is used by shouldRunAutoFetch for frequency capping
      await writeJson(LAST_AUTO_FETCH_RUN_KEY, Date.now());
      console.log(`[BackgroundTask] Auto-fetch successful. Processed ${result.expenses.length} expenses for today.`);
      
      // Notify the user if expenses were imported
      if (result.expenses.length > 0) {
        const notifications = await getNotificationsModule();
        if (notifications) {
          // Build a concise event description for the AI
          let eventDesc: string;
          if (result.expenses.length === 1) {
            const exp = result.expenses[0];
            eventDesc = `${exp.type === 'expense' ? 'spent' : 'received'} ₹${exp.amount} at ${exp.vendor}`;
          } else {
            const total = result.expenses.reduce((s, e) => s + e.amount, 0);
            eventDesc = `imported ${result.expenses.length} transactions totaling ₹${total.toFixed(0)}`;
          }

          // Generate a humorous AI notification
          const { title, body } = await generateHumorousNotification(eventDesc);

          await notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: { screen: 'transactions' },
            },
            trigger: null,
          });
        }
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
  if (Platform.OS !== 'android') {
    return { ok: false, reason: 'SMS auto-fetch is Android-only.' };
  }

  try {
    await ensureNotificationHandler();

    const fetchStatus = await BackgroundFetch.getStatusAsync();
    if (fetchStatus !== BackgroundFetch.BackgroundFetchStatus.Available) {
      return {
        ok: false,
        reason: 'Background fetch is not available on this device state.',
      };
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(SMS_AUTO_FETCH_TASK);
    if (isRegistered) {
      console.log('[BackgroundTask] Task already registered');
      return { ok: true };
    }

    await BackgroundFetch.registerTaskAsync(SMS_AUTO_FETCH_TASK, {
      minimumInterval: 60 * 30, // 30 minutes (OS determines exact timing)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('[BackgroundTask] Task registered successfully');
    return { ok: true };
  } catch (err) {
    console.error('[BackgroundTask] Registration failed:', err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Task registration failed',
    };
  }
};

/**
 * Unregister the background fetch task
 */
export const unregisterSmsAutoFetch = async () => {
  if (Platform.OS !== 'android') return false;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SMS_AUTO_FETCH_TASK);
    if (!isRegistered) {
      return true;
    }
    await BackgroundFetch.unregisterTaskAsync(SMS_AUTO_FETCH_TASK);
    console.log('[BackgroundTask] Task unregistered');
    return true;
  } catch (err) {
    console.error('[BackgroundTask] Unregistration failed:', err);
    return false;
  }
};

export const isSmsAutoFetchRegistered = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    return TaskManager.isTaskRegisteredAsync(SMS_AUTO_FETCH_TASK);
};
