import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { saveUserPreferences } from './preferencesService';

const PIN_KEY = 'user_pin_hash';

let secureStoreAvailable: boolean | null = null;
let localAuthAvailable: boolean | null = null;

async function getSecureStoreModule() {
  if (secureStoreAvailable !== null) return secureStoreAvailable ? await import('expo-secure-store').then(m => m.default || m) : null;
  try {
    // dynamic import so it won't crash on web / expo go without native modules
    const m = await import('expo-secure-store');
    secureStoreAvailable = true;
    return (m && (m.default || m));
  } catch (err) {
    secureStoreAvailable = false;
    return null;
  }
}

async function getLocalAuthModule() {
  if (localAuthAvailable !== null) return localAuthAvailable ? await import('expo-local-authentication').then(m => m.default || m) : null;
  try {
    const m = await import('expo-local-authentication');
    localAuthAvailable = true;
    return (m && (m.default || m));
  } catch (err) {
    localAuthAvailable = false;
    return null;
  }
}

export const hashPin = async (pin: string) => {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
};

export const setPin = async (pin: string) => {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be 4 digits');
  const hashed = await hashPin(pin);
  try {
    const SecureStore = await getSecureStoreModule();
    if (SecureStore) {
      await SecureStore.setItemAsync(PIN_KEY, hashed, { keychainAccessible: SecureStore.ALWAYS_THIS_DEVICE_ONLY });
    } else {
      // fallback to AsyncStorage (less secure)
      await AsyncStorage.setItem(PIN_KEY, hashed);
    }
  } catch (err) {
    console.error('Failed to set PIN in secure store:', err);
    await AsyncStorage.setItem(PIN_KEY, hashed);
  }
  // Ensure preferences set to indicate PIN set
  await saveUserPreferences({});
};

export const hasPin = async (): Promise<boolean> => {
  try {
    const SecureStore = await getSecureStoreModule();
    const val = SecureStore ? await SecureStore.getItemAsync(PIN_KEY) : await AsyncStorage.getItem(PIN_KEY);
    return !!val;
  } catch (err) {
    return false;
  }
};

export const removePin = async (): Promise<void> => {
  try {
    const SecureStore = await getSecureStoreModule();
    if (SecureStore) await SecureStore.deleteItemAsync(PIN_KEY);
    else await AsyncStorage.removeItem(PIN_KEY);
  } catch (err) {
    console.warn('Failed to remove PIN', err);
  }
};

export const verifyPin = async (pin: string): Promise<boolean> => {
  try {
    const SecureStore = await getSecureStoreModule();
    const stored = SecureStore ? await SecureStore.getItemAsync(PIN_KEY) : await AsyncStorage.getItem(PIN_KEY);
    if (!stored) return false;
    const hashed = await hashPin(pin);
    return hashed === stored;
  } catch (err) {
    console.error('verifyPin error', err);
    return false;
  }
};

export const isBiometricAvailable = async () => {
  try {
    const LocalAuthentication = await getLocalAuthModule();
    if (!LocalAuthentication) return false;
    const result = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return result && enrolled;
  } catch (err) {
    console.warn('LocalAuthentication check failed', err);
    return false;
  }
};

export const authenticateBiometric = async () => {
  try {
    const LocalAuthentication = await getLocalAuthModule();
    if (!LocalAuthentication) return false;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Authenticate', fallbackLabel: 'Use PIN' });
    return result.success;
  } catch (err) {
    console.warn('authenticateBiometric failed', err);
    return false;
  }
};

export const isSecureStoreAvailable = async () => {
  const SecureStore = await getSecureStoreModule();
  return !!SecureStore;
};

export default {
  setPin,
  hasPin,
  verifyPin,
  removePin,
  isBiometricAvailable,
  authenticateBiometric,
  isSecureStoreAvailable,
};
