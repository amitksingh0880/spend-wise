import { emitter } from '@/app/libs/emitter';
import { readJson, writeJson } from '@/app/libs/storage';
import { Currency } from '@/app/utils/currency';
import { Theme, UserPreferences } from '@/types';

const PREFERENCES_KEY = 'user_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  currency: 'INR',
  dateFormat: 'MM/dd/yyyy',
  theme: 'dark',
  notifications: {
    budgetAlerts: true,
    goalReminders: true,
    weeklyReports: true,
    monthlyReports: true,
    pushNotifications: true,
  },
  defaultCategories: [],
  sidebarCollapsed: false,
};

export const getUserPreferences = async (): Promise<UserPreferences> => {
  try {
    const preferences = await readJson<UserPreferences>(PREFERENCES_KEY);
    return { ...DEFAULT_PREFERENCES, ...preferences };
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
};

export const saveUserPreferences = async (preferences: Partial<UserPreferences>): Promise<void> => {
  try {
    const currentPreferences = await getUserPreferences();
    const updatedPreferences = { ...currentPreferences, ...preferences };
    await writeJson(PREFERENCES_KEY, updatedPreferences);
    try { emitter.emit('preferences:changed', updatedPreferences); } catch (err) { /* ignore */ }
  } catch (error) {
    console.error('Error saving user preferences:', error);
    throw error;
  }
};

export const updateCurrency = async (currency: Currency): Promise<void> => {
  await saveUserPreferences({ currency });
};

export const updateTheme = async (theme: Theme): Promise<void> => {
  await saveUserPreferences({ theme });
};

export const updateSidebarCollapsed = async (collapsed: boolean): Promise<void> => {
  await saveUserPreferences({ sidebarCollapsed: collapsed });
};

export const getCurrency = async (): Promise<Currency> => {
  const preferences = await getUserPreferences();
  return preferences.currency as Currency;
};