import { getAllTransactions, Transaction, updateTransaction } from './transactionService';
import { parseTransactionSMS, SMSMessage } from './smsService';

export interface CleanupRow {
  transactionId: string;
  action: 'updated' | 'flagged' | 'unchanged';
  beforeVendor: string;
  afterVendor: string;
  beforeAmount: number;
  afterAmount: number;
  confidence?: number;
  reason?: string;
}

export interface CleanupResult {
  totalProcessed: number;
  updated: number;
  flagged: number;
  unchanged: number;
  rows: CleanupRow[];
}

const toSmsMessage = (tx: Transaction): SMSMessage | null => {
  if (!tx.smsData?.rawMessage) return null;
  return {
    id: tx.id,
    address: tx.smsData.sender || 'Unknown',
    body: tx.smsData.rawMessage,
    date: tx.smsData.timestamp || new Date(tx.createdAt).getTime(),
    type: 1,
  };
};

const looksGenericVendor = (vendor: string): boolean => {
  const lower = (vendor || '').toLowerCase();
  return ['unknown', 'debited with', 'credited with', 'ending'].includes(lower) || lower.includes('not you');
};

export const runSmsCleanupWizard = async (): Promise<CleanupResult> => {
  const all = await getAllTransactions();
  const smsImported = all.filter(tx => (tx.tags || []).includes('sms-import'));

  const rows: CleanupRow[] = [];
  let updated = 0;
  let flagged = 0;
  let unchanged = 0;

  for (const tx of smsImported) {
    const sms = toSmsMessage(tx);
    if (!sms) {
      unchanged += 1;
      rows.push({
        transactionId: tx.id,
        action: 'unchanged',
        beforeVendor: tx.vendor,
        afterVendor: tx.vendor,
        beforeAmount: tx.amount,
        afterAmount: tx.amount,
      });
      continue;
    }

    const reparsed = parseTransactionSMS(sms);
    if (!reparsed) {
      flagged += 1;
      rows.push({
        transactionId: tx.id,
        action: 'flagged',
        beforeVendor: tx.vendor,
        afterVendor: tx.vendor,
        beforeAmount: tx.amount,
        afterAmount: tx.amount,
        reason: 'Unable to parse with latest rules',
      });
      continue;
    }

    const vendorChanged = (reparsed.vendor || 'Unknown') !== tx.vendor;
    const amountChanged = Math.abs(reparsed.amount - tx.amount) > 0.0001;

    const shouldUpdate = vendorChanged || amountChanged || (looksGenericVendor(tx.vendor) && !!reparsed.vendor && reparsed.vendor !== 'Unknown');

    if (shouldUpdate) {
      const newVendor = reparsed.vendor || tx.vendor;
      const newAmount = reparsed.amount || tx.amount;
      const newCategory = reparsed.category || tx.category;
      const newType = reparsed.type || tx.type;

      const existingTags = new Set(tx.tags || []);
      existingTags.add(`confidence:${Math.round((reparsed.confidence || 0) * 100)}%`);

      await updateTransaction(tx.id, {
        vendor: newVendor,
        amount: newAmount,
        category: newCategory,
        type: newType,
        tags: [...existingTags],
      });

      updated += 1;
      rows.push({
        transactionId: tx.id,
        action: 'updated',
        beforeVendor: tx.vendor,
        afterVendor: newVendor,
        beforeAmount: tx.amount,
        afterAmount: newAmount,
        confidence: reparsed.confidence,
      });
    } else if ((reparsed.confidence || 0) < 0.75) {
      flagged += 1;
      rows.push({
        transactionId: tx.id,
        action: 'flagged',
        beforeVendor: tx.vendor,
        afterVendor: reparsed.vendor || tx.vendor,
        beforeAmount: tx.amount,
        afterAmount: reparsed.amount || tx.amount,
        confidence: reparsed.confidence,
        reason: 'Low confidence after re-parse',
      });
    } else {
      unchanged += 1;
      rows.push({
        transactionId: tx.id,
        action: 'unchanged',
        beforeVendor: tx.vendor,
        afterVendor: tx.vendor,
        beforeAmount: tx.amount,
        afterAmount: tx.amount,
      });
    }
  }

  return {
    totalProcessed: smsImported.length,
    updated,
    flagged,
    unchanged,
    rows,
  };
};
