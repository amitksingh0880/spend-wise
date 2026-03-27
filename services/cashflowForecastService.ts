import { getAllTransactions } from './transactionService';
import { detectRecurringPatterns } from './recurringService';

export interface CashflowForecast {
  days: 7 | 30;
  projectedInflow: number;
  projectedOutflow: number;
  projectedNet: number;
  baselineDailyNet: number;
  recurringImpact: number;
}

const getTxDate = (tx: { createdAt: string; smsData?: { timestamp: number } }): Date =>
  tx.smsData?.timestamp ? new Date(tx.smsData.timestamp) : new Date(tx.createdAt);

export const getCashflowForecast = async (days: 7 | 30): Promise<CashflowForecast> => {
  const transactions = await getAllTransactions();
  const recurring = await detectRecurringPatterns();

  const now = new Date();
  const lookbackStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const lookback = transactions.filter(tx => getTxDate(tx) >= lookbackStart);

  const inflow = lookback.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
  const outflow = lookback.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
  const baselineDailyNet = (inflow - outflow) / 30;

  const recurringDaily = recurring.reduce((sum, item) => sum + (item.averageAmount / Math.max(1, item.frequencyDays)), 0);
  const recurringImpact = recurringDaily * days;

  const projectedNet = baselineDailyNet * days - recurringImpact;

  return {
    days,
    projectedInflow: Math.max(0, inflow / 30 * days),
    projectedOutflow: Math.max(0, outflow / 30 * days + recurringImpact),
    projectedNet,
    baselineDailyNet,
    recurringImpact,
  };
};

export const get7And30DayForecast = async (): Promise<{ sevenDay: CashflowForecast; thirtyDay: CashflowForecast }> => {
  const sevenDay = await getCashflowForecast(7);
  const thirtyDay = await getCashflowForecast(30);
  return { sevenDay, thirtyDay };
};
