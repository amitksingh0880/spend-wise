import * as Notifications from 'expo-notifications';
import { writeJson } from '@/libs/storage';
import { runBudgetWarningAutomation } from './budgetService';
import { getBillReminderAlerts } from './billReminderService';
import { detectRecurringPatterns } from './recurringService';
import { get7And30DayForecast } from './cashflowForecastService';
import { getUserPreferences } from './preferencesService';

export const runAllFinanceAutomations = async (): Promise<void> => {
  await runBudgetWarningAutomation();

  const prefs = await getUserPreferences();
  const canNotify = !!prefs.notifications?.pushNotifications;

  const billAlerts = await getBillReminderAlerts();
  await writeJson('bill_reminder_alerts', billAlerts);

  const recurring = await detectRecurringPatterns();
  await writeJson('recurring_patterns', recurring);

  const forecast = await get7And30DayForecast();
  await writeJson('cashflow_forecast', forecast);

  if (canNotify && prefs.notifications?.billReminders) {
    for (const alert of billAlerts.slice(0, 3)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: alert.type === 'due-soon' ? 'Bill Due Soon' : 'Bill Amount Variance',
          body: alert.message,
          data: { screen: 'transaction' },
        },
        trigger: null,
      });
    }
  }
};
