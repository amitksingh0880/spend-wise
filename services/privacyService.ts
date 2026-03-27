import { getUserPreferences, saveUserPreferences } from './preferencesService';
import { Transaction } from './transactionService';

const hashPin = (pin: string): string => {
  let hash = 0;
  for (let index = 0; index < pin.length; index++) {
    hash = (hash << 5) - hash + pin.charCodeAt(index);
    hash |= 0;
  }
  return `pin_${Math.abs(hash)}`;
};

export const enableTransactionLock = async (pin: string, useBiometric: boolean): Promise<void> => {
  const normalizedPin = (pin || '').trim();
  if (!/^\d{4,6}$/.test(normalizedPin)) {
    throw new Error('PIN must be 4 to 6 digits');
  }

  await saveUserPreferences({
    privacy: {
      transactionLockEnabled: true,
      useBiometric,
      exportMaskingEnabled: true,
      pinHash: hashPin(normalizedPin),
    },
  });
};

export const disableTransactionLock = async (): Promise<void> => {
  const prefs = await getUserPreferences();
  const exportMaskingEnabled = prefs.privacy?.exportMaskingEnabled ?? true;
  await saveUserPreferences({
    privacy: {
      ...(prefs.privacy || {}),
      transactionLockEnabled: false,
      useBiometric: false,
      exportMaskingEnabled,
      pinHash: undefined,
    },
  });
};

export const verifyTransactionPin = async (pin: string): Promise<boolean> => {
  const prefs = await getUserPreferences();
  const expected = prefs.privacy?.pinHash;
  if (!expected) return false;
  return hashPin((pin || '').trim()) === expected;
};

export const isBiometricAvailable = async (): Promise<boolean> => {
  try {
    const localAuth = await import('expo-local-authentication');
    const hasHardware = await localAuth.hasHardwareAsync();
    const isEnrolled = await localAuth.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch (error) {
    return false;
  }
};

export const authenticateForTransactionAccess = async (): Promise<boolean> => {
  const prefs = await getUserPreferences();
  const privacy = prefs.privacy;

  if (!privacy?.transactionLockEnabled) return true;

  if (privacy.useBiometric) {
    try {
      const localAuth = await import('expo-local-authentication');
      const result = await localAuth.authenticateAsync({
        promptMessage: 'Unlock transactions',
        fallbackLabel: 'Use PIN',
      });
      if (result.success) return true;
    } catch (error) {
      return false;
    }
  }

  return false;
};

export const shouldMaskExports = async (): Promise<boolean> => {
  const prefs = await getUserPreferences();
  return !!prefs.privacy?.exportMaskingEnabled;
};

const maskText = (value: string): string => {
  if (!value) return value;
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(2, value.length - 4))}${value.slice(-2)}`;
};

const maskRawMessage = (value?: string): string | undefined => {
  if (!value) return value;
  return value
    .replace(/\b\d{8,16}\b/g, match => `${match.slice(0, 2)}******${match.slice(-2)}`)
    .replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+)/g, (_all, left, right) => `${String(left).slice(0, 2)}***@${String(right)}`);
};

export const maskTransactionForExport = (tx: Transaction): Transaction => {
  const vendorMasked = maskText(tx.vendor || 'Unknown');
  const descriptionMasked = tx.description ? maskText(tx.description) : tx.description;

  return {
    ...tx,
    vendor: vendorMasked,
    description: descriptionMasked,
    smsData: tx.smsData
      ? {
          ...tx.smsData,
          rawMessage: maskRawMessage(tx.smsData.rawMessage) || '',
          sender: maskText(tx.smsData.sender || ''),
        }
      : tx.smsData,
  };
};
