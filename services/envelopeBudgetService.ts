import { readJson, writeJson } from '@/libs/storage';
import { uuidv4 } from '@/utils/uuid';
import { getAllTransactions } from './transactionService';

export interface EnvelopeBudget {
  id: string;
  category: string;
  monthlyCap: number;
  rolloverEnabled: boolean;
  rolloverBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnvelopeUsage {
  envelopeId: string;
  category: string;
  month: string;
  monthlyCap: number;
  rolledOverIn: number;
  spent: number;
  available: number;
  utilizationPercent: number;
}

const ENVELOPE_KEY = 'envelope_budgets';

export const getAllEnvelopes = async (): Promise<EnvelopeBudget[]> => {
  return (await readJson<EnvelopeBudget[]>(ENVELOPE_KEY)) || [];
};

export const upsertEnvelopeBudget = async (input: Omit<EnvelopeBudget, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<EnvelopeBudget> => {
  const all = await getAllEnvelopes();

  if (input.id) {
    const updated = all.map(item =>
      item.id === input.id
        ? { ...item, ...input, updatedAt: new Date().toISOString() }
        : item
    );
    await writeJson(ENVELOPE_KEY, updated);
    const found = updated.find(item => item.id === input.id);
    if (!found) throw new Error('Envelope not found');
    return found;
  }

  const created: EnvelopeBudget = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...input,
  };

  await writeJson(ENVELOPE_KEY, [created, ...all]);
  return created;
};

export const calculateEnvelopeUsage = async (monthDate: Date = new Date()): Promise<EnvelopeUsage[]> => {
  const envelopes = (await getAllEnvelopes()).filter(item => item.isActive);
  const transactions = await getAllTransactions();

  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

  return envelopes.map(envelope => {
    const spent = transactions
      .filter(tx => tx.type === 'expense' && tx.category.toLowerCase() === envelope.category.toLowerCase())
      .filter(tx => {
        const txDate = tx.smsData?.timestamp ? new Date(tx.smsData.timestamp) : new Date(tx.createdAt);
        return txDate >= monthStart && txDate <= monthEnd;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const rolledOverIn = envelope.rolloverEnabled ? Math.max(0, envelope.rolloverBalance) : 0;
    const available = envelope.monthlyCap + rolledOverIn - spent;
    const utilizationPercent = envelope.monthlyCap > 0 ? (spent / (envelope.monthlyCap + rolledOverIn)) * 100 : 0;

    return {
      envelopeId: envelope.id,
      category: envelope.category,
      month: monthKey,
      monthlyCap: envelope.monthlyCap,
      rolledOverIn,
      spent,
      available,
      utilizationPercent,
    };
  });
};

export const applyMonthlyRollover = async (): Promise<void> => {
  const envelopes = await getAllEnvelopes();
  const usage = await calculateEnvelopeUsage(new Date());
  const usageMap = new Map(usage.map(item => [item.envelopeId, item]));

  const updated = envelopes.map(envelope => {
    const current = usageMap.get(envelope.id);
    if (!current || !envelope.rolloverEnabled) return envelope;

    return {
      ...envelope,
      rolloverBalance: Math.max(0, current.available),
      updatedAt: new Date().toISOString(),
    };
  });

  await writeJson(ENVELOPE_KEY, updated);
};
