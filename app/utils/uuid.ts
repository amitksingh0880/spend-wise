import * as Crypto from 'expo-crypto';

// Generate a UUID using expo-crypto
export const generateUUID = (): string => {
  return Crypto.randomUUID();
};

// Fallback UUID generator for environments where expo-crypto might not be available
export const generateUUIDFallback = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Main UUID function with fallback
export const uuidv4 = (): string => {
  try {
    return generateUUID();
  } catch (error) {
    console.warn('expo-crypto not available, using fallback UUID generator');
    return generateUUIDFallback();
  }
};

export default uuidv4;

