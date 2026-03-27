import { readJson, writeJson } from '@/libs/storage';
import { uuidv4 } from '@/utils/uuid';
import { getAllTransactions } from './transactionService';

export interface BillReminder {
  id: string;
  name: string;
  vendorHint: string;
  category?: string;
  dueDayOfMonth: number;
  expectedAmount: number;
  varianceThresholdPercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillReminderAlert {
  billId: string;
  type: 'due-soon' | 'variance';
  message: string;
  dueDate: string;
  expectedAmount: number;
  actualAmount?: number;
  variancePercent?: number;
}

const BILL_KEY = 'bill_reminders';

export const getBillReminders = async (): Promise<BillReminder[]> => {
  return (await readJson<BillReminder[]>(BILL_KEY)) || [];
};

export const upsertBillReminder = async (input: Omit<BillReminder, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<BillReminder> => {
  const all = await getBillReminders();

  if (input.id) {
    const updated = all.map(item => item.id === input.id ? { ...item, ...input, updatedAt: new Date().toISOString() } : item);
    await writeJson(BILL_KEY, updated);
    const found = updated.find(item => item.id === input.id);
    if (!found) throw new Error('Bill reminder not found');
    return found;
  }

  const created: BillReminder = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...input,
  };

  await writeJson(BILL_KEY, [created, ...all]);
  return created;
};

const getDueDateThisMonth = (day: number, baseDate: Date): Date =>
  new Date(baseDate.getFullYear(), baseDate.getMonth(), Math.min(day, 28));

export const getBillReminderAlerts = async (): Promise<BillReminderAlert[]> => {
  const reminders = (await getBillReminders()).filter(item => item.isActive);
  const transactions = await getAllTransactions();
  const now = new Date();

  const alerts: BillReminderAlert[] = [];

  for (const reminder of reminders) {
    const dueDate = getDueDateThisMonth(reminder.dueDayOfMonth, now);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    if (daysUntilDue >= 0 && daysUntilDue <= 3) {
      alerts.push({
        billId: reminder.id,
        type: 'due-soon',
        message: `${reminder.name} is due in ${daysUntilDue} day(s)`,
        dueDate: dueDate.toISOString(),
        expectedAmount: reminder.expectedAmount,
      });
    }

    const vendorLower = reminder.vendorHint.toLowerCase();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const matchedTx = transactions
      .filter(tx => tx.type === 'expense')
      .filter(tx => (tx.vendor || '').toLowerCase().includes(vendorLower))
      .filter(tx => {
        const date = tx.smsData?.timestamp ? new Date(tx.smsData.timestamp) : new Date(tx.createdAt);
        return date >= currentMonthStart;
      })
      .sort((a, b) => {
        const left = a.smsData?.timestamp ? a.smsData.timestamp : new Date(a.createdAt).getTime();
        const right = b.smsData?.timestamp ? b.smsData.timestamp : new Date(b.createdAt).getTime();
        return right - left;
      })[0];

    if (matchedTx) {
      const variancePercent = reminder.expectedAmount > 0
        ? ((matchedTx.amount - reminder.expectedAmount) / reminder.expectedAmount) * 100
        : 0;

      if (Math.abs(variancePercent) >= reminder.varianceThresholdPercent) {
        alerts.push({
          billId: reminder.id,
          type: 'variance',
          message: `${reminder.name} amount changed by ${variancePercent.toFixed(1)}%`,
          dueDate: dueDate.toISOString(),
          expectedAmount: reminder.expectedAmount,
          actualAmount: matchedTx.amount,
          variancePercent,
        });
      }
    }
  }

  return alerts;
};
