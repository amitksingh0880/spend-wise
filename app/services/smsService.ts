import { Platform, PermissionsAndroid } from 'react-native';
import { saveTransaction, TransactionType } from './transactionService';
import { uuidv4 } from '../utils/uuid';

// Simple type for SMS Android (fallback to any to avoid type errors)
let SmsAndroid: any = null;

try {
  // Only import on Android platform
  if (Platform.OS === 'android') {
    SmsAndroid = require('react-native-get-sms-android').default;
  }
} catch (error) {
  console.warn('SMS Android package not available');
}

export interface SMSMessage {
  id: string;
  address: string; // sender's phone number
  body: string;
  date: number;
  type: number; // 1 = received, 2 = sent
}

export interface ExtractedExpense {
  amount: number;
  vendor?: string;
  category?: string;
  type: TransactionType;
  description: string;
  confidence: number; // 0-1 score indicating how confident we are about the extraction
  rawMessage: string;
}

export interface SMSParsingResult {
  success: boolean;
  expenses: ExtractedExpense[];
  totalProcessed: number;
  errors: string[];
}

// Common bank/payment keywords that indicate transactions
const TRANSACTION_KEYWORDS = [
  'debited', 'credited', 'paid', 'received', 'transaction', 'purchase', 'spent',
  'withdrawn', 'deposit', 'transfer', 'upi', 'card', 'atm', 'payment',
  'bill', 'recharge', 'refund', 'cashback', 'charged'
];

// Common vendor patterns
const VENDOR_PATTERNS = [
  /(?:at|to|from)\s+([A-Z][A-Za-z\s&]+?)(?:\s|$|\.)/i,
  /merchant\s*:?\s*([A-Za-z\s&]+?)(?:\s|$|\.)/i,
  /(?:paid|payment)\s+(?:to\s+)?([A-Za-z\s&]+?)(?:\s|$|\.)/i,
];

// Amount patterns (supports various currency formats)
const AMOUNT_PATTERNS = [
  /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
  /([0-9,]+(?:\.[0-9]{2})?)\s*(?:rs\.?|inr|₹)/i,
  /\$\s*([0-9,]+(?:\.[0-9]{2})?)/i,
  /([0-9,]+(?:\.[0-9]{2})?)\s*\$/i,
  /([0-9,]+(?:\.[0-9]{2})?)\s*(?:usd|eur|gbp)/i,
];

// Category mapping based on keywords
const CATEGORY_MAPPING: { [key: string]: string[] } = {
  'food': ['restaurant', 'hotel', 'cafe', 'pizza', 'dominos', 'swiggy', 'zomato', 'uber eats', 'food'],
  'transportation': ['uber', 'ola', 'taxi', 'metro', 'bus', 'petrol', 'fuel', 'parking'],
  'shopping': ['amazon', 'flipkart', 'mall', 'store', 'shop', 'market', 'clothing', 'fashion'],
  'entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'game', 'youtube', 'entertainment'],
  'utilities': ['electricity', 'water', 'gas', 'internet', 'mobile', 'recharge', 'bill'],
  'healthcare': ['hospital', 'medical', 'pharmacy', 'doctor', 'clinic', 'medicine'],
  'education': ['school', 'college', 'university', 'course', 'books', 'education'],
  'groceries': ['grocery', 'supermarket', 'vegetables', 'fruits', 'milk', 'bread'],
};

/**
 * Request SMS permissions for Android
 */
export const requestSMSPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false; // SMS reading is primarily for Android
  }

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
  } catch (error) {
    console.error('Error requesting SMS permission:', error);
    return false;
  }
};

/**
 * Check if SMS permission is already granted
 */
export const checkSMSPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    return granted;
  } catch (error) {
    console.error('Error checking SMS permission:', error);
    return false;
  }
};

/**
 * Read SMS messages from the device
 */
export const readSMSMessages = async (options: {
  maxCount?: number;
  indexFrom?: number;
  minDate?: number; // timestamp
  maxDate?: number; // timestamp
}): Promise<SMSMessage[]> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'android') {
      reject(new Error('SMS reading is only supported on Android'));
      return;
    }

    if (!SmsAndroid) {
      reject(new Error('SMS Android package not available'));
      return;
    }

    const filter = {
      box: 'inbox', // 'inbox', 'sent', 'draft', 'outbox', 'failed', 'queued'
      maxCount: options.maxCount || 100,
      indexFrom: options.indexFrom || 0,
      minDate: options.minDate,
      maxDate: options.maxDate,
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: any) => {
        console.error('Failed to get SMS list:', fail);
        reject(new Error('Failed to read SMS messages'));
      },
      (count: number, smsList: string) => {
        try {
          const messages: SMSMessage[] = JSON.parse(smsList);
          resolve(messages);
        } catch (error) {
          reject(new Error('Failed to parse SMS messages'));
        }
      }
    );
  });
};

/**
 * Check if an SMS contains transaction information
 */
export const isTransactionSMS = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  return TRANSACTION_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
};

/**
 * Extract amount from SMS text
 */
export const extractAmount = (message: string): number | null => {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }
  return null;
};

/**
 * Extract vendor/merchant name from SMS text
 */
export const extractVendor = (message: string): string | null => {
  for (const pattern of VENDOR_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
};

/**
 * Determine transaction type (income/expense) from SMS text
 */
export const determineTransactionType = (message: string): TransactionType => {
  const lowerMessage = message.toLowerCase();
  
  // Income indicators
  const incomeKeywords = ['credited', 'received', 'deposit', 'refund', 'cashback', 'salary'];
  if (incomeKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'income';
  }
  
  // Expense indicators (default)
  return 'expense';
};

/**
 * Categorize transaction based on vendor and message content
 */
export const categorizeTransaction = (vendor: string | null, message: string): string => {
  const lowerMessage = message.toLowerCase();
  const lowerVendor = vendor?.toLowerCase() || '';
  
  for (const [category, keywords] of Object.entries(CATEGORY_MAPPING)) {
    if (keywords.some(keyword => 
      lowerMessage.includes(keyword) || lowerVendor.includes(keyword)
    )) {
      return category;
    }
  }
  
  return 'other';
};

/**
 * Calculate confidence score for the extraction
 */
export const calculateConfidence = (expense: Partial<ExtractedExpense>): number => {
  let confidence = 0;
  
  // Amount found
  if (expense.amount && expense.amount > 0) confidence += 0.4;
  
  // Vendor found
  if (expense.vendor && expense.vendor.length > 2) confidence += 0.3;
  
  // Category identified
  if (expense.category && expense.category !== 'other') confidence += 0.2;
  
  // Transaction type determined
  if (expense.type) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
};

/**
 * Parse a single SMS message to extract expense information
 */
export const parseTransactionSMS = (message: SMSMessage): ExtractedExpense | null => {
  if (!isTransactionSMS(message.body)) {
    return null;
  }

  const amount = extractAmount(message.body);
  if (!amount) {
    return null; // No valid amount found
  }

  const vendor = extractVendor(message.body);
  const type = determineTransactionType(message.body);
  const category = categorizeTransaction(vendor, message.body);
  
  const expense: ExtractedExpense = {
    amount,
    vendor: vendor || 'Unknown',
    category,
    type,
    description: message.body.substring(0, 100) + (message.body.length > 100 ? '...' : ''),
    confidence: 0,
    rawMessage: message.body,
  };

  expense.confidence = calculateConfidence(expense);
  
  return expense;
};

/**
 * Process multiple SMS messages and extract expenses
 */
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
      if (expense && expense.confidence > 0.3) { // Only include high-confidence extractions
        result.expenses.push(expense);
      }
    } catch (error) {
      result.errors.push(`Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return result;
};

/**
 * Read and process SMS messages, then save as transactions
 */
export const importExpensesFromSMS = async (options: {
  maxCount?: number;
  daysBack?: number;
  autoSave?: boolean;
}): Promise<SMSParsingResult> => {
  try {
    // Check permissions
    const hasPermission = await checkSMSPermission();
    if (!hasPermission) {
      const granted = await requestSMSPermission();
      if (!granted) {
        throw new Error('SMS permission is required to import expenses');
      }
    }

    // Calculate date range
    const daysBack = options.daysBack || 30;
    const minDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

    // Read SMS messages
    const messages = await readSMSMessages({
      maxCount: options.maxCount || 200,
      minDate,
    });

    // Process messages
    const result = await processSMSMessages(messages);

    // Auto-save transactions if enabled
    if (options.autoSave !== false) {
      for (const expense of result.expenses) {
        try {
          await saveTransaction({
            amount: expense.amount,
            type: expense.type,
            vendor: expense.vendor || 'Unknown',
            category: expense.category || 'other',
            description: `SMS Import: ${expense.description}`,
            tags: ['sms-import', `confidence:${Math.round(expense.confidence * 100)}%`],
          });
        } catch (error) {
          result.errors.push(`Failed to save transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return result;
  } catch (error) {
    return {
      success: false,
      expenses: [],
      totalProcessed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
};

/**
 * Get SMS import statistics
 */
export const getSMSImportStats = async (): Promise<{
  totalImported: number;
  lastImportDate: string | null;
  averageConfidence: number;
}> => {
  // This would typically read from your transaction storage
  // For now, returning placeholder data
  return {
    totalImported: 0,
    lastImportDate: null,
    averageConfidence: 0,
  };
};