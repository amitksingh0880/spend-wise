import Constants from 'expo-constants';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule> | null = null;

export const isExpoGoRuntime = (): boolean => Constants.appOwnership === 'expo';

export const getNotificationsModule = async (): Promise<NotificationsModule | null> => {
  if (isExpoGoRuntime()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications');
  }

  try {
    return await notificationsModulePromise;
  } catch {
    notificationsModulePromise = null;
    return null;
  }
};
