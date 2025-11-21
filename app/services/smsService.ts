/* smsService.ts
 *
 * Notes:
 * - This module requires native Android modules:
 *     npm install react-native-get-sms-android @ernestbies/react-native-android-sms-listener
 *
 * - Expo managed apps: add android.permissions to app.json and run
 *     npx expo prebuild --platform android
 *   then build a custom dev client or run: npx expo run:android
 *
 * Example app.json snippet:
 * {
 *   "expo": {
 *     "android": {
 *       "permissions": ["READ_SMS","RECEIVE_SMS","SEND_SMS"]
 *     }
 *   }
 * }
 *
 * - This is Android-only. iOS does not allow inbox access.
 */

import { readJson, writeJson } from '@/app/libs/storage';
import { PermissionsAndroid, Platform } from 'react-native';
import { TransactionType, saveTransaction } from './transactionService'; // keep your import
// types from your original file preserved

/* ---------- Types & Interfaces ---------- */
export interface SMSMessage {
  id: string;
  address: string;
  body: string;
  date: number;
  type: number;
}

export interface ExtractedExpense {
  amount: number;
  vendor?: string;
  category?: string;
  type: TransactionType;
  description: string;
  confidence: number; // 0-1 score
  rawMessage: string;
  sender: string;
  timestamp: number;
}

export interface SMSParsingResult {
  success: boolean;
  expenses: ExtractedExpense[];
  totalProcessed: number;
  errors: string[];
  lastSync?: number | null;
}

/* ---------- Native modules (lazy-loaded) ---------- */
let SmsAndroid: any = null; // react-native-get-sms-android
let SmsListenerModule: any = null; // @ernestbies/react-native-android-sms-listener
let smsListenerSubscription: any = null;

/** Try to load native modules once (returns boolean if SmsAndroid is available) */
function tryLoadNativeModules(): boolean {
  if (Platform.OS !== 'android') return false;

  // Already loaded
  if (SmsAndroid !== null) return !!SmsAndroid;

  try {
    // Simple single require; prefer fail-fast so dev knows to rebuild
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const smsPkg = require('react-native-get-sms-android');
    SmsAndroid = smsPkg && (smsPkg.default || smsPkg);

    // Try listener module but it's optional
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const listenerPkg = require('@ernestbies/react-native-android-sms-listener');
      SmsListenerModule = listenerPkg && (listenerPkg.default || listenerPkg);
    } catch (e) {
      SmsListenerModule = null;
    }

    console.log('[smsService] native modules loaded:', !!SmsAndroid, !!SmsListenerModule);
    return !!SmsAndroid;
  } catch (err: any) {
    SmsAndroid = null;
    SmsListenerModule = null;
    console.warn(
      '[smsService] native SMS module not present in this build. Did you prebuild/eject and include react-native-get-sms-android?',
      err?.message ?? err
    );
    return false;
  }
}

/* ---------- Patterns, keywords, and helper lists ---------- */
const TRANSACTION_KEYWORDS = [
  'debited', 'credited', 'paid', 'received', 'transaction', 'purchase', 'spent',
  'withdrawn', 'deposit', 'transfer', 'upi', 'card', 'atm', 'payment',
  'bill', 'recharge', 'refund', 'cashback', 'charged', 'debit', 'credit',
  'balance', 'account', 'bank', 'wallet', 'money', 'rs.', 'inr', '₹',
  'withdrawal', 'deposited', 'transferred', 'sent', 'salary', 'bonus', 'interest',
  'dividend', 'reward', 'reversal', 'charge', 'fee', 'commission',
  'loan', 'emi', 'installment', 'prepaid', 'postpaid', 'subscription',
  'renewal', 'activation', 'deactivation', 'upgrade', 'downgrade'
];

const BANK_SENDER_PATTERNS = [
  // condensed list (keep original list in your project if you prefer longer)
  'SBI','SBICARD','HDFC','HDFCBANK','ICICI','KOTAK','AXIS','PNB','BOI','CANARA',
  'UPI','PAYTM','PHONEPE','GOOGLEPAY','GPAY','BHIM','AMAZONPAY','CRED','YESBANK',
  'RBL','IDFC','INDUSIND','FEDERAL','RUPAY','MASTERCARD','VISA','AMEX',
  'BANK','BANKING','BANKSMS','BANKALERT','WALLET','PAY'
];

const VENDOR_PATTERNS: RegExp[] = [
  /(?:at|to|from)\s+([A-Z][A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /merchant\s*:?\s*([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /(?:paid|payment)\s+(?:to\s+)?([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /(?:upi|pay)\s+(?:to\s+)?([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /(?:sent|transferred)\s+(?:to\s+)?([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /(?:card|purchase)\s+(?:at\s+)?([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /(?:to|from)\s+([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{2})?\s+(?:at\s+)?([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /([A-Za-z\s&\.\-]+?)\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{2})?/i,
];

const AMOUNT_PATTERNS: RegExp[] = [
  /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
  /([0-9,]+(?:\.[0-9]{2})?)\s*(?:rs\.?|inr|₹)/i,
  /\₹\s*([0-9,]+(?:\.[0-9]{2})?)/i,
  /([0-9,]+(?:\.[0-9]{2})?)\s*\₹/i,
  /([0-9,]+(?:\.[0-9]{2})?)\s*(?:usd|eur|gbp|cad|aud|jpy)/i,
  /([0-9,]+(?:\.[0-9]{2})?)/i,
];

const CATEGORY_MAPPING: { [key: string]: string[] } = {
  'food': ['restaurant','hotel','cafe','pizza','dominos','swiggy','zomato','uber eats','food'],
  'transportation': ['uber','ola','taxi','metro','bus','petrol','fuel','parking'],
  'shopping': ['amazon','flipkart','mall','store','shop','market','clothing','fashion'],
  'entertainment': ['movie','cinema','netflix','spotify','game','youtube'],
  'utilities': ['electricity','water','gas','internet','mobile','recharge','bill'],
  'healthcare': ['hospital','medical','pharmacy','doctor','clinic','medicine'],
  'education': ['school','college','university','course','books'],
  'groceries': ['grocery','supermarket','vegetables','fruits','milk','bread'],
};

/* ---------- Permission helpers ---------- */

/** Request runtime READ_SMS permission (shows rationale UI on Android) */
export const requestSMSPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Permission',
        message: 'SpendWise needs access to your SMS messages to automatically track expenses from bank alerts.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('[smsService] requestSMSPermission error', err);
    return false;
  }
};

/** Check if READ_SMS permission already granted */
export const checkSMSPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  } catch (err) {
    console.error('[smsService] checkSMSPermission error', err);
    return false;
  }
};

/* ---------- SMS read/list APIs ---------- */

/**
 * Read SMS messages from device using react-native-get-sms-android
 * options:
 *  - maxCount (default 200)
 *  - indexFrom (default 0)
 *  - minDate, maxDate (timestamps)
 */
export const readSMSMessages = async (options: {
  maxCount?: number;
  indexFrom?: number;
  minDate?: number;
  maxDate?: number;
} = {}): Promise<SMSMessage[]> => {
  if (Platform.OS !== 'android') {
    throw new Error('SMS reading only supported on Android');
  }

  if (!tryLoadNativeModules() || !SmsAndroid) {
    throw new Error('Native SMS module not available. Build app with native modules (expo prebuild / custom dev client).');
  }

  const filter = {
    box: 'inbox',
    maxCount: options.maxCount ?? 200,
    indexFrom: options.indexFrom ?? 0,
    minDate: options.minDate,
    maxDate: options.maxDate,
  };

  return new Promise<SMSMessage[]>((resolve, reject) => {
    try {
      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: any) => {
          console.error('[smsService] SmsAndroid.list failed:', fail);
          reject(new Error('SmsAndroid.list failure: ' + JSON.stringify(fail)));
        },
        (count: number, smsList: string) => {
          try {
            const messages: SMSMessage[] = JSON.parse(smsList);
            resolve(messages);
          } catch (err) {
            console.error('[smsService] Failed to parse smsList', err);
            reject(new Error('Failed to parse SMS list: ' + (err as Error).message));
          }
        }
      );
    } catch (err: any) {
      console.error('[smsService] Error calling SmsAndroid.list', err);
      reject(new Error('Error calling SmsAndroid.list: ' + (err?.message ?? err)));
    }
  });
};

/* ---------- Listener helpers (optional) ---------- */

/** Start listener for incoming SMS. Returns subscription with .remove() */
export const startSmsListener = (onMessage: (m: any) => void) => {
  if (Platform.OS !== 'android') {
    console.warn('[smsService] SMS listener only supported on Android');
    return { remove: () => {} };
  }
  if (!tryLoadNativeModules() || !SmsListenerModule) {
    console.warn('[smsService] SMS listener native module is not available in this build.');
    return { remove: () => {} };
  }

  // stop previous subscription if any
  if (smsListenerSubscription && typeof smsListenerSubscription.remove === 'function') {
    try { smsListenerSubscription.remove(); } catch (e) {}
    smsListenerSubscription = null;
  }

  smsListenerSubscription = SmsListenerModule.addListener((msg: any) => {
    try { onMessage(msg); } catch (e) { console.error(e); }
  });

  return smsListenerSubscription;
};

/** Stop listener started by startSmsListener */
export const stopSmsListener = () => {
  if (smsListenerSubscription && typeof smsListenerSubscription.remove === 'function') {
    try { smsListenerSubscription.remove(); } catch (e) {}
    smsListenerSubscription = null;
  }
};

/* ---------- Heuristics & parsing logic (preserved from your code) ---------- */

export const isBankSMS = (sender: string, message: string): boolean => {
  const upperSender = (sender || '').toUpperCase();
  const upperMessage = (message || '').toUpperCase();

  const isBankSender = BANK_SENDER_PATTERNS.some(pattern =>
    upperSender.includes(pattern) || upperSender.includes(pattern.replace(/[^A-Z0-9]/g, ''))
  );

  const hasBankKeywords = [
    'BANK', 'BANKING', 'ACCOUNT', 'BALANCE', 'TRANSACTION', 'DEBIT', 'CREDIT',
    'UPI', 'CARD', 'ATM', 'PAYMENT', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'RS.', 'INR', '₹'
  ].some(keyword => upperMessage.includes(keyword));

  return isBankSender || hasBankKeywords;
};

export const isTransactionSMS = (message: string): boolean => {
  const lowerMessage = (message || '').toLowerCase();
  // Exclude OTP/verification messages which often contain numeric codes
  if (/\botp\b/i.test(message || '') || /one[\s-]*time[\s-]*password/i.test(message || '') || /verification code/i.test(message || '')) {
    return false;
  }
  return TRANSACTION_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
};

export const extractAmount = (message: string): number | null => {
  if (!message) return null;
  for (const pattern of AMOUNT_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) return amount;
    }
  }
  return null;
};

export const extractVendor = (message: string): string | null => {
  if (!message) return null;
  for (const pattern of VENDOR_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
};

export const determineTransactionType = (message: string): TransactionType => {
  const lowerMessage = (message || '').toLowerCase();
  const incomeKeywords = ['credited', 'received', 'deposit', 'refund', 'cashback', 'salary'];
  if (incomeKeywords.some(k => lowerMessage.includes(k))) return 'income';
  return 'expense';
};

export const categorizeTransaction = (vendor: string | null, message: string): string => {
  const lowerMessage = (message || '').toLowerCase();
  const lowerVendor = (vendor || '').toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAPPING)) {
    if (keywords.some(keyword =>
      lowerMessage.includes(keyword) || lowerVendor.includes(keyword)
    )) {
      return category;
    }
  }
  return 'other';
};

export const calculateConfidence = (expense: Partial<ExtractedExpense>): number => {
  let confidence = 0;
  if (expense.amount && expense.amount > 0) {
    confidence += 0.5;
    if (expense.amount >= 1 && expense.amount <= 1000000) confidence += 0.1;
  }
  if (expense.vendor && expense.vendor.length > 2 && expense.vendor !== 'Unknown') {
    confidence += 0.25;
    if (/^[A-Z][A-Za-z\s&\.\-]+₹/.test(expense.vendor)) confidence += 0.05;
  }
  if (expense.category && expense.category !== 'other') confidence += 0.15;
  if (expense.type) confidence += 0.05;
  if (expense.amount && expense.vendor && expense.vendor !== 'Unknown' && expense.category && expense.category !== 'other') {
    confidence += 0.1;
  }
  return Math.min(confidence, 1.0);
};

export const parseTransactionSMS = (message: SMSMessage): ExtractedExpense | null => {
  if (!isBankSMS(message.address, message.body)) return null;
  if (!isTransactionSMS(message.body)) return null;

  const amount = extractAmount(message.body);
  if (!amount) return null;

  const vendor = extractVendor(message.body);
  const type = determineTransactionType(message.body);
  const category = categorizeTransaction(vendor, message.body);

  const expense: ExtractedExpense = {
    amount,
    vendor: vendor || 'Unknown',
    category,
    type,
    description: (message.body || '').substring(0, 100) + ((message.body || '').length > 100 ? '...' : ''),
    confidence: 0,
    rawMessage: message.body || '',
    sender: message.address || 'Unknown',
    timestamp: message.date || Date.now(),
  };

  expense.confidence = calculateConfidence(expense);

  return expense;
};

export const processSMSMessages = async (messages: SMSMessage[]): Promise<SMSParsingResult> => {
  const result: SMSParsingResult = {
    success: true,
    expenses: [],
    totalProcessed: messages.length,
    errors: [],
  };

  let bankSMSCount = 0;
  let transactionSMSCount = 0;

  for (const message of messages) {
    try {
      if (isBankSMS(message.address, message.body)) bankSMSCount++;
      if (isTransactionSMS(message.body)) transactionSMSCount++;

      const expense = parseTransactionSMS(message);
      if (expense && expense.confidence > 0.2) {
        result.expenses.push(expense);
      }
    } catch (err: any) {
      result.errors.push(`Error processing message: ₹{err?.message ?? err}`);
    }
  }

  result.errors.push(`Debug: Found ₹{bankSMSCount} bank SMS, ₹{transactionSMSCount} transaction SMS, extracted ₹{result.expenses.length} expenses`);
  return result;
};

/* ---------- High-level import function (reads, processes, and optionally saves) ---------- */

export const importExpensesFromSMS = async (options: {
  maxCount?: number;
  daysBack?: number;
  minDate?: number;
  maxDate?: number;
  onlyToday?: boolean;
  autoSave?: boolean;
  filter?: (expense: ExtractedExpense) => boolean;
} = {}): Promise<SMSParsingResult> => {
  try {
    if (Platform.OS !== 'android') {
      throw new Error('SMS import only supported on Android');
    }

    // Ensure native module present
    if (!tryLoadNativeModules() || !SmsAndroid) {
      throw new Error('Native SMS module not available. Build app with native modules (expo prebuild / custom dev client).');
    }

    // Permission check
    const hasPermission = await checkSMSPermission();
    if (!hasPermission) {
      const granted = await requestSMSPermission();
      if (!granted) throw new Error('SMS permission is required to import expenses');
    }

    // Determine date range
    let minDate: number | undefined = undefined;
    let maxDate: number | undefined = undefined;
    let useRange = false;
    if (typeof options.minDate === 'number' || typeof options.maxDate === 'number') {
      minDate = options.minDate;
      maxDate = options.maxDate;
      useRange = true;
      console.log(`Importing SMS for custom range (since ${minDate ? new Date(minDate).toISOString() : 'undefined'} to ${maxDate ? new Date(maxDate).toISOString() : 'undefined'})`);
    } else if (options.onlyToday) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfDay = startOfDay + (24 * 60 * 60 * 1000) - 1;
      minDate = startOfDay;
      maxDate = endOfDay;
      useRange = false;
      console.log(`Importing SMS for current day (since ${new Date(minDate).toISOString()} to ${new Date(maxDate).toISOString()})`);
    } else {
      const daysBack = options.daysBack ?? 30;
      minDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
      maxDate = undefined;
      useRange = false;
      console.log(`Importing SMS from last ${daysBack} days (since ${new Date(minDate).toISOString()})`);
    }

    let messages: SMSMessage[] = [];
    let lastSyncMap: Record<string, number> = {};
    if (useRange && minDate !== undefined && maxDate !== undefined) {
      // For each day in the range, get last sync and fetch messages after that
      const dayMs = 24 * 60 * 60 * 1000;
      let dayStart = new Date(new Date(minDate).setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(new Date(maxDate).setHours(0, 0, 0, 0)).getTime();
      while (dayStart <= dayEnd) {
        const dayKey = getLastSyncKeyForDate(dayStart);
        const lastSync = await getLastSyncForDate(dayStart);
        let fetchMin = lastSync && lastSync >= dayStart ? lastSync + 1 : dayStart;
        let fetchMax = dayStart + dayMs - 1;
        if (fetchMax > maxDate) fetchMax = maxDate;
        // Fetch messages for this day after last sync
        const dayMessages = await readSMSMessages({
          maxCount: options.maxCount ?? 200,
          minDate: fetchMin,
          maxDate: fetchMax,
        });
        messages = messages.concat(dayMessages);
        lastSyncMap[dayKey] = dayMessages.reduce((acc, m) => Math.max(acc, m.date || 0), lastSync || 0);
        dayStart += dayMs;
      }
    } else if (options.onlyToday) {
      // Only today: use last sync for today
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfDay = startOfDay + (24 * 60 * 60 * 1000) - 1;
      let minFetch = startOfDay;
      const lastSyncForToday = await getLastSyncForDate(startOfDay);
      if (lastSyncForToday && lastSyncForToday >= startOfDay) {
        minFetch = lastSyncForToday + 1;
        console.log(`[smsService] Detected last sync for today: ${new Date(lastSyncForToday).toISOString()}, adjusting minDate to ${new Date(minFetch).toISOString()}`);
      }
      messages = await readSMSMessages({
        maxCount: options.maxCount ?? 200,
        minDate: minFetch,
        maxDate: endOfDay,
      });
      lastSyncMap[getLastSyncKeyForDate(startOfDay)] = messages.reduce((acc, m) => Math.max(acc, m.date || 0), lastSyncForToday || 0);
    } else {
      // Default: daysBack, but not a strict range, just use minDate
      messages = await readSMSMessages({
        maxCount: options.maxCount ?? 200,
        minDate,
        maxDate,
      });
    }


    let result = await processSMSMessages(messages);

    // Apply filter if provided
    if (typeof options.filter === 'function') {
      result.expenses = result.expenses.filter(options.filter);
    }

    // Update last sync for each day in the range
    if (useRange && minDate !== undefined && maxDate !== undefined) {
      for (const [dayKey, maxTs] of Object.entries(lastSyncMap)) {
        if (maxTs > 0) {
          // Parse date from key
          const dateStr = dayKey.replace('smsImport:lastSync:', '');
          const [year, month, day] = dateStr.split('-').map(Number);
          const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
          await setLastSyncForDate(dayStart, maxTs);
        }
      }
      // Set lastSync in result as the latest maxTs
      const allMaxTs = Object.values(lastSyncMap).filter(ts => ts > 0);
      result.lastSync = allMaxTs.length > 0 ? Math.max(...allMaxTs) : null;
    } else if (options.onlyToday) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const maxTs = lastSyncMap[getLastSyncKeyForDate(startOfToday)] || 0;
      if (maxTs > 0) {
        await setLastSyncForDate(startOfToday, maxTs);
        result.lastSync = maxTs;
      } else {
        const existing = await getLastSyncForDate(startOfToday);
        result.lastSync = existing ?? null;
      }
    }

    if (options.autoSave !== false) {
      for (const expense of result.expenses) {
        try {
          await saveTransaction({
            amount: expense.amount,
            type: expense.type,
            vendor: expense.vendor ?? 'Unknown',
            category: expense.category ?? 'other',
            description: `SMS Import: ₹{expense.description}`,
            tags: ['sms-import', `confidence:₹{Math.round((expense.confidence ?? 0) * 100)}%`],
            smsData: {
              rawMessage: expense.rawMessage,
              sender: expense.sender || 'Unknown',
              timestamp: expense.timestamp || Date.now(),
            },
          });
        } catch (err: any) {
          result.errors.push(`Failed to save transaction: ₹{err?.message ?? err}`);
        }
      }
    }

    return result;
  } catch (err: any) {
    console.error('[smsService] importExpensesFromSMS error', err);
    return {
      success: false,
      expenses: [],
      totalProcessed: 0,
      errors: [err?.message ?? String(err)],
    };
  }
};

/* ---------- Utility: import stats (placeholder) ---------- */
export const getSMSImportStats = async (): Promise<{
  totalImported: number;
  lastImportDate: string | null;
  averageConfidence: number;
}> => {
  try {
    const todayKey = getLastSyncKeyForDate(Date.now());
    const lastTs = await readJson<number>(todayKey);
    return {
      totalImported: 0,
      lastImportDate: lastTs ? new Date(lastTs).toISOString() : null,
      averageConfidence: 0,
    };
  } catch (err) {
    return {
      totalImported: 0,
      lastImportDate: null,
      averageConfidence: 0,
    };
  }
};

/* ---------- Last sync storage helpers ---------- */
const SMS_LAST_SYNC_KEY_PREFIX = 'smsImport:lastSync:';
const getLastSyncKeyForDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${SMS_LAST_SYNC_KEY_PREFIX}${dateStr}`;
};

export const getLastSyncForDate = async (timestamp: number = Date.now()): Promise<number | null> => {
  const key = getLastSyncKeyForDate(timestamp);
  try {
    const val = await readJson<number>(key);
    return val ?? null;
  } catch (err) {
    console.error('[smsService] getLastSyncForDate error', err);
    return null;
  }
};

export const setLastSyncForDate = async (timestamp: number, valueTs: number): Promise<void> => {
  const key = getLastSyncKeyForDate(timestamp);
  try {
    await writeJson<number>(key, valueTs);
  } catch (err) {
    console.error('[smsService] setLastSyncForDate error', err);
  }
};

/* ---------- Convenience: isNativeAvailable ---------- */
export const isNativeAvailable = (): boolean => {
  return Platform.OS === 'android' && tryLoadNativeModules() && !!SmsAndroid;
};

/* ---------- End of module ---------- */
export default {
  tryLoadNativeModules,
  isNativeAvailable,
  requestSMSPermission,
  checkSMSPermission,
  readSMSMessages,
  startSmsListener,
  stopSmsListener,
  parseTransactionSMS,
  processSMSMessages,
  importExpensesFromSMS,
  getSMSImportStats,
  getLastSyncForDate,
  setLastSyncForDate,
};
