import { PermissionsAndroid, Platform, NativeModules } from 'react-native';
import { saveTransaction, TransactionType } from './transactionService';

// Simple type for SMS Android (fallback to any to avoid type errors)
let SmsAndroid: any = null;

// Function to initialize SMS Android package
const initializeSmsAndroid = () => {
  if (Platform.OS !== 'android') {
    console.log('Platform is not Android, SMS functionality not available');
    return false;
  }

  try {
    // The package exports NativeModules.Sms directly
    // Try to get it from NativeModules first
    if (NativeModules.Sms) {
      SmsAndroid = NativeModules.Sms;
      console.log('SMS Android loaded from NativeModules.Sms');
    } else {
      // Fallback to require if NativeModules doesn't have it
      try {
        SmsAndroid = require('react-native-get-sms-android');
        console.log('SMS Android loaded via require');
      } catch (e) {
        throw new Error(`Failed to load SMS package: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }
    
    // Validate that we have the list method
    if (!SmsAndroid || typeof SmsAndroid.list !== 'function') {
      throw new Error('SMS Android package loaded but list method not available');
    }
    
    console.log('SMS Android package loaded successfully');
    console.log('SMS Android methods available:', Object.keys(SmsAndroid || {}));
    return true;
  } catch (error) {
    console.error('Failed to load SMS Android package:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
};

// Initialize on module load
const isSmsAndroidAvailable = initializeSmsAndroid();

export interface SMSMessage {
  _id: string; // Note: react-native-get-sms-android uses _id, not id
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
  'bill', 'recharge', 'refund', 'cashback', 'charged', 'debit', 'credit',
  'balance', 'account', 'bank', 'wallet', 'money', 'rs.', 'inr', '₹',
  'purchase', 'spent', 'withdrawal', 'deposited', 'transferred', 'sent',
  'received', 'salary', 'bonus', 'interest', 'dividend', 'cashback',
  'reward', 'refund', 'reversal', 'charge', 'fee', 'commission',
  'loan', 'emi', 'installment', 'prepaid', 'postpaid', 'subscription',
  'renewal', 'activation', 'deactivation', 'upgrade', 'downgrade'
];

// Indian bank sender numbers and patterns
const BANK_SENDER_PATTERNS = [
  // Major Indian Banks
  'SBI', 'SBICARD', 'SBICR', 'SBINET', 'SBIUPI', 'SBIPAY',
  'HDFC', 'HDFCBK', 'HDFCBANK', 'HDFCUPI', 'HDFCPAY',
  'ICICI', 'ICICIBK', 'ICICIBANK', 'ICICICR', 'ICICIUPI',
  'KOTAK', 'KOTAKBK', 'KOTAKBANK', 'KOTAKUPI', 'KOTAKPAY',
  'AXIS', 'AXISBANK', 'AXISBK', 'AXISUPI', 'AXISPAY',
  'PNB', 'PNBBANK', 'PNBUPI', 'PNBPAY',
  'BOI', 'BOIBANK', 'BOIUPI', 'BOIPAY',
  'CANARA', 'CANARABK', 'CANARABANK', 'CANARAUPI',
  'UNION', 'UNIONBANK', 'UNIONBK', 'UNIONUPI',
  'BANDHAN', 'BANDHANBANK', 'BANDHANUPI',
  'INDUS', 'INDUSIND', 'INDUSINDBK', 'INDUSUPI',
  'YES', 'YESBANK', 'YESBK', 'YESUPI', 'YESPAY',
  'FEDERAL', 'FEDERALBANK', 'FEDERALBK', 'FEDERALUPI',
  'IDFC', 'IDFCBANK', 'IDFCBK', 'IDFCUPI', 'IDFCPAY',
  'RBL', 'RBLBANK', 'RBLBK', 'RBLUPI', 'RBLPAY',
  'DCB', 'DCBBANK', 'DCBBK', 'DCBUPI', 'DCBPAY',
  'CITY', 'CITYBANK', 'CITYBK', 'CITYUPI',
  'SOUTH', 'SOUTHBANK', 'SOUTHBK', 'SOUTHUPI',
  'UCO', 'UCOBANK', 'UCOBK', 'UCOUPI', 'UCOPAY',
  'BANK', 'BANKING', 'BANKSMS', 'BANKALERT',
  // UPI and Payment Services
  'UPI', 'UPIPAY', 'UPITRANS', 'UPITXN',
  'PAYTM', 'PAYTMUPI', 'PAYTMQR', 'PAYTMWALLET',
  'PHONEPE', 'PHONEPEUPI', 'PHONEPEPAY',
  'GOOGLEPAY', 'GPAY', 'GOOGLEPAYUPI',
  'BHIM', 'BHIMUPI', 'BHIMPAY',
  'AMAZONPAY', 'AMAZONUPI', 'AMAZONPAYUPI',
  'JIO', 'JIOPAY', 'JIOMONEY', 'JIOWALLET',
  'AIRTEL', 'AIRTELPAY', 'AIRTELMONEY', 'AIRTELUPI',
  'FREECHARGE', 'FREECHARGEUPI', 'FREECHARGEPAY',
  'MOBIKWIK', 'MOBIKWIKUPI', 'MOBIKWIKPAY',
  'CRED', 'CREDUPI', 'CREDPAY',
  'ZERODHA', 'ZERODHAUPI', 'ZERODHAPAY',
  'GROWW', 'GROWWUPI', 'GROWWPAY',
  'KUVERA', 'KUVERAUPI', 'KUVERAPAY',
  // Credit Card Companies
  'AMEX', 'AMERICANEXPRESS', 'AMEXCARD',
  'MASTERCARD', 'MASTERCARDUPI',
  'VISA', 'VISAUPI', 'VISACARD',
  'RUPAY', 'RUPAYUPI', 'RUPAYCARD',
  'DINERS', 'DINERSCLUB', 'DINERSCARD',
  // E-commerce and Services
  'AMAZON', 'AMAZONIN', 'AMAZONPAY',
  'FLIPKART', 'FLIPKARTPAY', 'FLIPKARTUPI',
  'SWIGGY', 'SWIGGYPAY', 'SWIGGYUPI',
  'ZOMATO', 'ZOMATOPAY', 'ZOMATOUPI',
  'UBER', 'UBERPAY', 'UBERUPI',
  'OLA', 'OLAPAY', 'OLAUPI',
  'BOOKMYSHOW', 'BMS', 'BMSPAY',
  'NETFLIX', 'NETFLIXPAY', 'NETFLIXUPI',
  'SPOTIFY', 'SPOTIFYPAY', 'SPOTIFYUPI',
  'YOUTUBE', 'YOUTUBEPAY', 'YOUTUBEUPI',
  'GOOGLE', 'GOOGLEPAY', 'GOOGLEUPI',
  'MICROSOFT', 'MICROSOFTPAY', 'MICROSOFTUPI',
  'APPLE', 'APPLEPAY', 'APPLEUPI',
  'ADOBE', 'ADOBEPAY', 'ADOBEUPI',
  'ADOBE', 'ADOBEPAY', 'ADOBEUPI',
  'SALESFORCE', 'SALESFORCEPAY', 'SALESFORCEUPI',
  'ZOOM', 'ZOOMPAY', 'ZOOMUPI',
  'SLACK', 'SLACKPAY', 'SLACKUPI',
  'DISCORD', 'DISCORDPAY', 'DISCORDUPI',
  'TWITTER', 'TWITTERPAY', 'TWITTERUPI',
  'FACEBOOK', 'FACEBOOKPAY', 'FACEBOOKUPI',
  'INSTAGRAM', 'INSTAGRAMPAY', 'INSTAGRAMUPI',
  'WHATSAPP', 'WHATSAPPPAY', 'WHATSAPPUPI',
  'TELEGRAM', 'TELEGRAMPAY', 'TELEGRAMUPI',
  'SIGNAL', 'SIGNALPAY', 'SIGNALUPI',
  'WIRE', 'WIREPAY', 'WIREUPI',
  'SKYPE', 'SKYPEUPI', 'SKYPEUPI',
  'TEAMS', 'TEAMSUPI', 'TEAMSUPI',
  'OUTLOOK', 'OUTLOOKUPI', 'OUTLOOKUPI',
  'GMAIL', 'GMAILUPI', 'GMAILUPI',
  'YAHOO', 'YAHOOUPI', 'YAHOOUPI',
  'HOTMAIL', 'HOTMAILUPI', 'HOTMAILUPI',
  'LIVE', 'LIVEUPI', 'LIVEUPI',
  'MSN', 'MSNUPI', 'MSNUPI',
  'AOL', 'AOLUPI', 'AOLUPI',
  'ICLOUD', 'ICLOUDUPI', 'ICLOUDUPI',
  'DROPBOX', 'DROPBOXUPI', 'DROPBOXUPI',
  'ONEDRIVE', 'ONEDRIVEUPI', 'ONEDRIVEUPI',
  'GOOGLEDRIVE', 'GOOGLEDRIVEUPI', 'GOOGLEDRIVEUPI',
  'MEGA', 'MEGAUPI', 'MEGAUPI',
  'PCLOUD', 'PCLOUDUPI', 'PCLOUDUPI',
  'BOX', 'BOXUPI', 'BOXUPI',
  'MEDIAFIRE', 'MEDIAFIREUPI', 'MEDIAFIREUPI',
  '4SHARED', '4SHAREDUPI', '4SHAREDUPI',
  'RAPIDSHARE', 'RAPIDSHAREUPI', 'RAPIDSHAREUPI',
  'MEGAUPLOAD', 'MEGAUPLOADUPI', 'MEGAUPLOADUPI',
  'FILESERVE', 'FILESERVEUPI', 'FILESERVEUPI',
  'FILESONIC', 'FILESONICUPI', 'FILESONICUPI',
  'WUPLOAD', 'WUPLOADUPI', 'WUPLOADUPI',
  'UPLOADED', 'UPLOADEDUPI', 'UPLOADEDUPI',
  'TURBOBIT', 'TURBOBITUPI', 'TURBOBITUPI',
  'RAPIDGATOR', 'RAPIDGATORUPI', 'RAPIDGATORUPI',
  'NITROFLARE', 'NITROFLAREUPI', 'NITROFLAREUPI',
  'UPLOADGIG', 'UPLOADGIGUPI', 'UPLOADGIGUPI',
  'UPLOADED', 'UPLOADEDUPI', 'UPLOADEDUPI',
  'TURBOBIT', 'TURBOBITUPI', 'TURBOBITUPI',
  'RAPIDGATOR', 'RAPIDGATORUPI', 'RAPIDGATORUPI',
  'NITROFLARE', 'NITROFLAREUPI', 'NITROFLAREUPI',
  'UPLOADGIG', 'UPLOADGIGUPI', 'UPLOADGIGUPI'
];

// Enhanced vendor patterns for better merchant detection
const VENDOR_PATTERNS = [
  // Standard patterns
  /(?:at|to|from)\s+([A-Z][A-Za-z\s&\.\-]+?)(?:\s|$|\.|,)/i,
  /merchant\s*:?\s*([A-Za-z\s&\.\-]+?)(?:\s|$|\.|,)/i,
  /(?:paid|payment)\s+(?:to\s+)?([A-Za-z\s&\.\-]+?)(?:\s|$|\.|,)/i,
  // UPI patterns
  /(?:upi|pay)\s+(?:to\s+)?([A-Za-z\s&\.\-]+?)(?:\s|$|\.|,)/i,
  /(?:sent|transferred)\s+(?:to\s+)?([A-Za-z\s&\.\-]+?)(?:\s|$|\.|,)/i,
  // Card patterns
  /(?:card|purchase)\s+(?:at\s+)?([A-Za-z\s&\.\-]+?)(?:\s|$|\.|,)/i,
  // Bank specific patterns
  /(?:purchase|payment)\s+(?:at\s+)?([A-Za-z\s&\.\-]+?)(?:\s|$|\.|,)/i,
  // Generic patterns
  /(?:to|from)\s+([A-Za-z\s&\.\-]+?)(?:\s|$|\.|,)/i,
  // Amount followed by vendor
  /(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{2})?\s+(?:at\s+)?([A-Za-z\s&\.\-]+?)(?:\s|$|\.|,)/i,
  // Vendor followed by amount
  /([A-Za-z\s&\.\-]+?)\s+(?:rs\.?|inr|₹)\s*[0-9,]+(?:\.[0-9]{2})?/i,
];

// Enhanced amount patterns (supports various currency formats and number styles)
const AMOUNT_PATTERNS = [
  // Indian Rupee patterns
  /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
  /([0-9,]+(?:\.[0-9]{2})?)\s*(?:rs\.?|inr|₹)/i,
  // USD patterns
  /\$\s*([0-9,]+(?:\.[0-9]{2})?)/i,
  /([0-9,]+(?:\.[0-9]{2})?)\s*\$/i,
  // Other currencies
  /([0-9,]+(?:\.[0-9]{2})?)\s*(?:usd|eur|gbp|cad|aud|jpy|chf|sek|nok|dkk|pln|czk|huf|ron|bgn|hrk|rsd|mkd|all|bam|mkn|mdl|uah|byn|rub|kzt|uzs|kgs|tjs|tmt|azn|amd|gel|azn|amd|gel|azn|amd|gel)/i,
  // Generic number patterns
  /([0-9,]+(?:\.[0-9]{2})?)\s*(?:lakh|crore|thousand|million|billion)/i,
  // Amount with commas and decimals
  /([0-9,]+(?:\.[0-9]{2})?)/i,
  // Amount in words (basic)
  /(?:rupees?|rs\.?)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
  // Amount with currency symbol
  /([0-9,]+(?:\.[0-9]{2})?)\s*(?:rupees?|rs\.?)/i,
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
 * Check if SMS Android package is available
 */
export const checkSMSAndroidAvailable = (): boolean => {
  if (Platform.OS !== 'android') {
    return false;
  }
  
  if (!SmsAndroid) {
    const reinitialized = initializeSmsAndroid();
    return reinitialized;
  }
  
  return true;
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
  minDate?: number; // timestamp
  maxDate?: number; // timestamp
}): Promise<SMSMessage[]> => {
  return new Promise((resolve, reject) => {
    console.log('Starting SMS read process...');
    
    if (Platform.OS !== 'android') {
      console.log('Platform is not Android:', Platform.OS);
      reject(new Error('SMS reading is only supported on Android'));
      return;
    }

    // Try to reinitialize if not available
    if (!SmsAndroid) {
      console.log('SMS Android not available, trying to reinitialize...');
      const reinitialized = initializeSmsAndroid();
      if (!reinitialized) {
        console.error('Failed to initialize SMS Android package');
        reject(new Error('SMS Android package not available. Please check if react-native-get-sms-android is properly installed and linked.'));
        return;
      }
    }

    // Validate that list method exists
    if (typeof SmsAndroid.list !== 'function') {
      console.error('SMS Android list method is not a function');
      reject(new Error('SMS Android list method is not available'));
      return;
    }

    // Build filter - note: indexFrom is not supported by react-native-get-sms-android
    const filter: any = {
      box: 'inbox', // 'inbox', 'sent', 'draft', 'outbox', 'failed', 'queued'
      maxCount: options.maxCount || 100,
    };

    // Only add date filters if they are provided
    if (options.minDate !== undefined) {
      filter.minDate = options.minDate;
    }
    if (options.maxDate !== undefined) {
      filter.maxDate = options.maxDate;
    }

    console.log('SMS filter:', JSON.stringify(filter));
    console.log('Calling SmsAndroid.list...');

    try {
      SmsAndroid.list(
        JSON.stringify(filter),
        (fail: any) => {
          console.error('Failed to get SMS list:', fail);
          reject(new Error(`Failed to read SMS messages: ${JSON.stringify(fail)}`));
        },
        (count: number, smsList: string) => {
          try {
            console.log(`Received ${count} SMS messages from SmsAndroid.list`);
            
            if (!smsList || smsList.trim() === '') {
              console.log('Empty SMS list returned');
              resolve([]);
              return;
            }
            
            console.log('SMS list preview (first 200 chars):', smsList.substring(0, 200) + '...');
            
            const messages: SMSMessage[] = JSON.parse(smsList);
            console.log(`Parsed ${messages.length} SMS messages successfully`);
            
            // Log first message for debugging
            if (messages.length > 0) {
              console.log('First SMS sample:', {
                _id: messages[0]._id,
                address: messages[0].address,
                body: messages[0].body?.substring(0, 50),
                date: messages[0].date,
                type: messages[0].type
              });
            }
            
            resolve(messages);
          } catch (error) {
            console.error('Failed to parse SMS messages:', error);
            console.error('SMS list that failed to parse (first 500 chars):', smsList?.substring(0, 500));
            reject(new Error(`Failed to parse SMS messages: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        }
      );
    } catch (error) {
      console.error('Error calling SmsAndroid.list:', error);
      reject(new Error(`Error calling SMS Android: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
};

/**
 * Check if an SMS is from a bank or financial institution
 */
export const isBankSMS = (sender: string, message: string): boolean => {
  const upperSender = sender.toUpperCase();
  const upperMessage = message.toUpperCase();
  
  // Check if sender matches bank patterns
  const isBankSender = BANK_SENDER_PATTERNS.some(pattern => 
    upperSender.includes(pattern) || upperSender.includes(pattern.replace(/[^A-Z0-9]/g, ''))
  );
  
  // Check if message contains bank-related keywords
  const hasBankKeywords = [
    'bank', 'banking', 'account', 'balance', 'transaction', 'debit', 'credit',
    'upi', 'card', 'atm', 'payment', 'transfer', 'deposit', 'withdrawal',
    'rs.', 'inr', '₹', 'rupees', 'amount', 'balance', 'available'
  ].some(keyword => upperMessage.includes(keyword));
  
  return isBankSender || hasBankKeywords;
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
  
  // Amount found (most important)
  if (expense.amount && expense.amount > 0) {
    confidence += 0.5;
    
    // Bonus for reasonable amounts (not too small or too large)
    if (expense.amount >= 1 && expense.amount <= 1000000) {
      confidence += 0.1;
    }
  }
  
  // Vendor found
  if (expense.vendor && expense.vendor.length > 2 && expense.vendor !== 'Unknown') {
    confidence += 0.25;
    
    // Bonus for known vendor patterns
    if (expense.vendor.match(/^[A-Z][A-Za-z\s&\.\-]+$/)) {
      confidence += 0.05;
    }
  }
  
  // Category identified
  if (expense.category && expense.category !== 'other') {
    confidence += 0.15;
  }
  
  // Transaction type determined
  if (expense.type) {
    confidence += 0.05;
  }
  
  // Bonus for complete information
  if (expense.amount && expense.vendor && expense.vendor !== 'Unknown' && expense.category && expense.category !== 'other') {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 1.0);
};

/**
 * Parse a single SMS message to extract expense information
 */
export const parseTransactionSMS = (message: SMSMessage): ExtractedExpense | null => {
  // First check if it's a bank SMS
  if (!isBankSMS(message.address, message.body)) {
    return null;
  }
  
  // Then check if it contains transaction information
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

  let bankSMSCount = 0;
  let transactionSMSCount = 0;

  for (const message of messages) {
    try {
      // Count bank SMS for debugging
      if (isBankSMS(message.address, message.body)) {
        bankSMSCount++;
      }
      
      // Count transaction SMS for debugging
      if (isTransactionSMS(message.body)) {
        transactionSMSCount++;
      }
      
      const expense = parseTransactionSMS(message);
      if (expense && expense.confidence > 0.2) { // Lowered threshold for better detection
        result.expenses.push(expense);
      }
    } catch (error) {
      result.errors.push(`Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Add debug information
  result.errors.push(`Debug: Found ${bankSMSCount} bank SMS, ${transactionSMSCount} transaction SMS, extracted ${result.expenses.length} expenses`);

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
    // Check if SMS Android package is available
    if (!checkSMSAndroidAvailable()) {
      throw new Error('SMS Android package is not available. Please ensure react-native-get-sms-android is properly installed and linked.');
    }

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

    console.log(`Importing SMS from last ${daysBack} days (since ${new Date(minDate).toISOString()})`);

    // Read SMS messages
    const messages = await readSMSMessages({
      maxCount: options.maxCount || 200,
      minDate,
    });

    console.log(`Found ${messages.length} SMS messages to process`);

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
    console.error('SMS import error:', error);
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