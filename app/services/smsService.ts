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
import { TransactionType, saveTransaction } from './transactionService';

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
  suspicious?: ExtractedExpense[];
}

/* ---------- Native modules (lazy-loaded) ---------- */
let SmsAndroid: any = null;
let SmsListenerModule: any = null;
let smsListenerSubscription: any = null;

function tryLoadNativeModules(): boolean {
  if (Platform.OS !== 'android') return false;
  if (SmsAndroid !== null) return !!SmsAndroid;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const smsPkg = require('react-native-get-sms-android');
    SmsAndroid = smsPkg && (smsPkg.default || smsPkg);

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const listenerPkg = require('@ernestbies/react-native-android-sms-listener');
      SmsListenerModule = listenerPkg && (listenerPkg.default || listenerPkg);
    } catch (e) {
      SmsListenerModule = null;
    }

    return !!SmsAndroid;
  } catch (err: any) {
    SmsAndroid = null;
    SmsListenerModule = null;
    console.warn('[smsService] native SMS module not available.', err?.message ?? err);
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
  'dividend', 'reward', 'reversal', 'charge', 'fee',
  'loan', 'emi', 'installment',
];

const BANK_SENDER_PATTERNS = [
  'SBI', 'SBICARD', 'HDFC', 'HDFCBANK', 'ICICI', 'KOTAK', 'AXIS', 'PNB', 'BOI', 'CANARA',
  'UPI', 'PAYTM', 'PHONEPE', 'GOOGLEPAY', 'GPAY', 'BHIM', 'AMAZONPAY', 'CRED', 'YESBANK',
  'RBL', 'IDFC', 'INDUSIND', 'FEDERAL', 'RUPAY', 'MASTERCARD', 'VISA', 'AMEX',
  'BANK', 'BANKING', 'BANKSMS', 'BANKALERT', 'WALLET', 'PAY',
];

const VENDOR_PATTERNS: RegExp[] = [
  /(?:at|to|from)\s+([A-Z][A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /merchant\s*:?\s*([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /(?:paid|payment)\s+(?:to\s+)?([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /(?:upi|pay)\s+(?:to\s+)?([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /(?:sent|transferred)\s+(?:to\s+)?([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /(?:card|purchase)\s+(?:at\s+)?([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
  /(?:to|from)\s+([A-Za-z\s&\.\-]+?)(?:\s|₹|\.|,)/i,
];

/**
 * Amount extraction patterns — ordered from most specific (currency-tagged) to least.
 * The catch-all bare-number regex has been intentionally removed to avoid matching
 * OTP codes, reference numbers, and other non-monetary digit sequences.
 *
 * Each capture group [1] contains only the numeric portion (no currency symbol).
 */
const AMOUNT_PATTERNS: RegExp[] = [
  // ₹1,234.56 or ₹1234
  /₹\s*([1-9][0-9,]*(?:\.[0-9]{1,2})?)/,
  // Rs. 1,234.56 or INR 1,234.56  (case insensitive)
  /(?:rs\.?|inr)\s*([1-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
  // 1,234.56 Rs. / INR  (amount before symbol)
  /([1-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)/i,
  // "amount of 1,234.56" — explicit keyword context only
  /(?:amount\s+of|amt\.?\s*:?)\s*([1-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
  // "debited/credited 1,234.56" — action-verb immediately before a number
  /(?:debited|credited|paid|received|spent|charged|withdrawal|deposited)\s+(?:rs\.?\s*|inr\s*|₹\s*)?([1-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
];

// Hard bounds for valid transaction amounts (₹1 to ₹1 crore per transaction)
const AMOUNT_MIN = 1;
const AMOUNT_MAX = 10_000_000;

const CATEGORY_MAPPING: { [key: string]: string[] } = {
  'food': ['restaurant', 'hotel', 'cafe', 'pizza', 'dominos', 'swiggy', 'zomato', 'uber eats', 'food'],
  'transportation': ['uber', 'ola', 'taxi', 'metro', 'bus', 'petrol', 'fuel', 'parking'],
  'shopping': ['amazon', 'flipkart', 'mall', 'store', 'shop', 'market', 'clothing', 'fashion'],
  'entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'game', 'youtube'],
  'utilities': ['electricity', 'water', 'gas', 'internet', 'mobile', 'recharge', 'bill'],
  'healthcare': ['hospital', 'medical', 'pharmacy', 'doctor', 'clinic', 'medicine'],
  'education': ['school', 'college', 'university', 'course', 'books'],
  'groceries': ['grocery', 'supermarket', 'vegetables', 'fruits', 'milk', 'bread'],
};

/* ---------- Permission helpers ---------- */

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
        (_count: number, smsList: string) => {
          try {
            const messages: SMSMessage[] = JSON.parse(smsList);
            resolve(messages);
          } catch (err) {
            reject(new Error('Failed to parse SMS list: ' + (err as Error).message));
          }
        }
      );
    } catch (err: any) {
      reject(new Error('Error calling SmsAndroid.list: ' + (err?.message ?? err)));
    }
  });
};

/* ---------- Listener helpers ---------- */

export const startSmsListener = (onMessage: (m: any) => void) => {
  if (Platform.OS !== 'android') {
    return { remove: () => { } };
  }
  if (!tryLoadNativeModules() || !SmsListenerModule) {
    console.warn('[smsService] SMS listener native module is not available in this build.');
    return { remove: () => { } };
  }

  if (smsListenerSubscription && typeof smsListenerSubscription.remove === 'function') {
    try { smsListenerSubscription.remove(); } catch (e) { }
    smsListenerSubscription = null;
  }

  smsListenerSubscription = SmsListenerModule.addListener((msg: any) => {
    try { onMessage(msg); } catch (e) { console.error(e); }
  });

  return smsListenerSubscription;
};

export const stopSmsListener = () => {
  if (smsListenerSubscription && typeof smsListenerSubscription.remove === 'function') {
    try { smsListenerSubscription.remove(); } catch (e) { }
    smsListenerSubscription = null;
  }
};

/* ---------- Heuristics & parsing logic ---------- */

export const isBankSMS = (sender: string, message: string): boolean => {
  const upperSender = (sender || '').toUpperCase();
  const upperMessage = (message || '').toUpperCase();

  const isBankSender = BANK_SENDER_PATTERNS.some(pattern =>
    upperSender.includes(pattern) || upperSender.includes(pattern.replace(/[^A-Z0-9]/g, ''))
  );

  const hasBankKeywords = [
    'BANK', 'BANKING', 'ACCOUNT', 'BALANCE', 'TRANSACTION', 'DEBIT', 'CREDIT',
    'UPI', 'CARD', 'ATM', 'PAYMENT', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'RS.', 'INR', '₹',
  ].some(keyword => upperMessage.includes(keyword));

  return isBankSender || hasBankKeywords;
};

export const isTransactionSMS = (message: string): boolean => {
  const msg = message || '';

  // Exclude OTP/verification messages — they contain 4–8 digit codes but no monetary info
  if (
    /\botp\b/i.test(msg) ||
    /one[\s-]*time[\s-]*password/i.test(msg) ||
    /verification\s*code/i.test(msg) ||
    /\b\d{4,8}\s+is\s+(your|the)\s+(otp|code|password|pin)\b/i.test(msg) ||
    /do\s+not\s+share\s+(otp|this|the\s+code)/i.test(msg)
  ) {
    return false;
  }

  const lowerMessage = msg.toLowerCase();
  return TRANSACTION_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
};

export const extractAmount = (message: string): number | null => {
  if (!message) return null;

  for (const pattern of AMOUNT_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount >= AMOUNT_MIN && amount <= AMOUNT_MAX) {
        return amount;
      }
    }
  }
  return null;
};

export const extractVendor = (message: string): string | null => {
  if (!message) return null;
  for (const pattern of VENDOR_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const vendor = match[1].trim();
      // Sanity: skip very short or all-numeric matches
      if (vendor.length > 2 && !/^\d+$/.test(vendor)) {
        return vendor;
      }
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

  if (expense.amount && expense.amount >= AMOUNT_MIN && expense.amount <= AMOUNT_MAX) {
    confidence += 0.5;
    // Bonus for reasonable everyday transaction amounts
    if (expense.amount >= 10 && expense.amount <= 500_000) confidence += 0.1;
  }
  if (expense.vendor && expense.vendor.length > 2 && expense.vendor !== 'Unknown') {
    confidence += 0.25;
  }
  if (expense.category && expense.category !== 'other') confidence += 0.15;
  if (expense.type) confidence += 0.05;
  // Bonus for fully resolved transactions
  if (
    expense.amount &&
    expense.vendor && expense.vendor !== 'Unknown' &&
    expense.category && expense.category !== 'other'
  ) {
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
  const body = message.body || '';

  const expense: ExtractedExpense = {
    amount,
    vendor: vendor || 'Unknown',
    category,
    type,
    description: body.length > 100 ? body.substring(0, 100) + '…' : body,
    confidence: 0,
    rawMessage: body,
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

  for (const message of messages) {
    try {
      const expense = parseTransactionSMS(message);
      if (expense && expense.confidence > 0.2) {
        result.expenses.push(expense);
      }
    } catch (err: any) {
      // Keep errors for genuinely failed parse attempts, not debug info
      result.errors.push(`Error processing message: ${err?.message ?? err}`);
    }
  }

  console.log(`[smsService] Processed ${messages.length} messages, extracted ${result.expenses.length} expenses`);
  return result;
};

/* ---------- High-level import function ---------- */

export const importExpensesFromSMS = async (options: {
  maxCount?: number;
  daysBack?: number;
  minDate?: number;
  maxDate?: number;
  onlyToday?: boolean;
  autoSave?: boolean;
  filter?: (expense: ExtractedExpense) => boolean;
  suspiciousThreshold?: number;
} = {}): Promise<SMSParsingResult> => {
  try {
    if (Platform.OS !== 'android') {
      throw new Error('SMS import only supported on Android');
    }

    if (!tryLoadNativeModules() || !SmsAndroid) {
      throw new Error('Native SMS module not available. Build app with native modules (expo prebuild / custom dev client).');
    }

    const hasPermission = await checkSMSPermission();
    if (!hasPermission) {
      const granted = await requestSMSPermission();
      if (!granted) throw new Error('SMS permission is required to import expenses');
    }

    // Determine date range
    let minDate: number | undefined;
    let maxDate: number | undefined;

    if (typeof options.minDate === 'number' || typeof options.maxDate === 'number') {
      minDate = options.minDate;
      maxDate = options.maxDate;
      console.log(`[smsService] Custom range: ${minDate ? new Date(minDate).toISOString() : 'no start'} → ${maxDate ? new Date(maxDate).toISOString() : 'no end'}`);
    } else if (options.onlyToday) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      minDate = startOfDay;
      maxDate = startOfDay + 24 * 60 * 60 * 1000 - 1;
      // Respect last sync to avoid re-importing
      const lastSyncForToday = await getLastSyncForDate(startOfDay);
      if (lastSyncForToday && lastSyncForToday >= startOfDay) {
        minDate = lastSyncForToday + 1;
      }
      console.log(`[smsService] Today: ${new Date(minDate).toISOString()} → ${new Date(maxDate).toISOString()}`);
    } else {
      const daysBack = options.daysBack ?? 30;
      minDate = Date.now() - daysBack * 24 * 60 * 60 * 1000;
      console.log(`[smsService] Last ${daysBack} days since ${new Date(minDate).toISOString()}`);
    }

    const messages = await readSMSMessages({
      maxCount: options.maxCount ?? 200,
      minDate,
      maxDate,
    });

    let result = await processSMSMessages(messages);

    // Apply caller-provided filter
    if (typeof options.filter === 'function') {
      result.expenses = result.expenses.filter(options.filter);
    }

    // Update last-sync timestamp for today's import
    if (options.onlyToday) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const maxTs = messages.reduce((acc, m) => Math.max(acc, m.date || 0), 0);
      if (maxTs > 0) {
        await setLastSyncForDate(startOfToday, maxTs);
        result.lastSync = maxTs;
      } else {
        result.lastSync = await getLastSyncForDate(startOfToday);
      }
    }

    // Auto-save: split normal vs suspicious
    if (options.autoSave !== false) {
      const SUSPICIOUS_THRESHOLD = options.suspiciousThreshold ?? 100_000;
      result.suspicious = result.expenses.filter(e => e.amount > SUSPICIOUS_THRESHOLD);
      const toSave = result.expenses.filter(e => e.amount <= SUSPICIOUS_THRESHOLD);

      for (const expense of toSave) {
        try {
          await saveTransaction({
            amount: expense.amount,
            type: expense.type,
            vendor: expense.vendor ?? 'Unknown',
            category: expense.category ?? 'other',
            description: `SMS Import: ${expense.description}`,
            tags: ['sms-import', `confidence:${Math.round((expense.confidence ?? 0) * 100)}%`],
            smsData: {
              rawMessage: expense.rawMessage,
              sender: expense.sender || 'Unknown',
              timestamp: expense.timestamp || Date.now(),
            },
          });
        } catch (err: any) {
          result.errors.push(`Failed to save transaction: ${err?.message ?? err}`);
        }
      }

      result.expenses = toSave;
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

/* ---------- Import stats ---------- */
export const getSMSImportStats = async (): Promise<{
  totalImported: number;
  lastImportDate: string | null;
  averageConfidence: number;
}> => {
  try {
    const lastTs = await getLastSyncForDate(Date.now());
    return {
      totalImported: 0,
      lastImportDate: lastTs ? new Date(lastTs).toISOString() : null,
      averageConfidence: 0,
    };
  } catch {
    return { totalImported: 0, lastImportDate: null, averageConfidence: 0 };
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

/* ---------- Convenience ---------- */
export const isNativeAvailable = (): boolean =>
  Platform.OS === 'android' && tryLoadNativeModules() && !!SmsAndroid;

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
