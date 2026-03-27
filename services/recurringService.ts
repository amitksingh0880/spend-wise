import { getAllTransactions, Transaction } from './transactionService';

export interface RecurringPattern {
  vendor: string;
  averageAmount: number;
  frequencyDays: number;
  occurrences: number;
  nextExpectedDate: string;
  type: 'subscription' | 'emi' | 'sip' | 'recurring';
  suggestion: string;
}

const getDate = (tx: Transaction): Date => tx.smsData?.timestamp ? new Date(tx.smsData.timestamp) : new Date(tx.createdAt);

const classifyPattern = (vendor: string, description?: string): RecurringPattern['type'] => {
  const content = `${vendor} ${description || ''}`.toLowerCase();
  if (content.includes('sip')) return 'sip';
  if (content.includes('emi')) return 'emi';
  if (content.includes('netflix') || content.includes('spotify') || content.includes('prime')) return 'subscription';
  return 'recurring';
};

export const detectRecurringPatterns = async (): Promise<RecurringPattern[]> => {
  const transactions = await getAllTransactions();
  const expenses = transactions.filter(tx => tx.type === 'expense');

  const byVendor = new Map<string, Transaction[]>();
  for (const tx of expenses) {
    const key = (tx.vendor || 'Unknown').toLowerCase();
    const list = byVendor.get(key) || [];
    list.push(tx);
    byVendor.set(key, list);
  }

  const patterns: RecurringPattern[] = [];

  for (const [_, txs] of byVendor) {
    if (txs.length < 3) continue;

    const sorted = txs.slice().sort((a, b) => getDate(a).getTime() - getDate(b).getTime());
    const gaps: number[] = [];

    for (let index = 1; index < sorted.length; index++) {
      const gapDays = Math.round((getDate(sorted[index]).getTime() - getDate(sorted[index - 1]).getTime()) / (24 * 60 * 60 * 1000));
      if (gapDays > 0) gaps.push(gapDays);
    }

    if (!gaps.length) continue;

    const averageGap = gaps.reduce((sum, value) => sum + value, 0) / gaps.length;
    const averageAmount = sorted.reduce((sum, tx) => sum + tx.amount, 0) / sorted.length;

    const stableFrequency = averageGap >= 20 && averageGap <= 40;
    if (!stableFrequency) continue;

    const lastTx = sorted[sorted.length - 1];
    const nextExpectedDate = new Date(getDate(lastTx).getTime() + averageGap * 24 * 60 * 60 * 1000);
    const vendor = lastTx.vendor || 'Unknown';
    const type = classifyPattern(vendor, lastTx.description);

    patterns.push({
      vendor,
      averageAmount,
      frequencyDays: Math.round(averageGap),
      occurrences: sorted.length,
      nextExpectedDate: nextExpectedDate.toISOString(),
      type,
      suggestion: `Consider pausing ${vendor} if you no longer use it.`,
    });
  }

  return patterns.sort((left, right) => right.averageAmount - left.averageAmount);
};
