import { getAllTransactions, Transaction } from './transactionService';

export interface MerchantSummary {
  vendor: string;
  totalAmount: number;
  transactionCount: number;
  lastTransactionAt: string;
}

export interface MerchantTrend {
  vendor: string;
  currentMonthAmount: number;
  previousMonthAmount: number;
  deltaAmount: number;
  deltaPercent: number;
}

export interface MerchantSpike {
  vendor: string;
  averageAmount: number;
  spikeAmount: number;
  spikeDate: string;
  multiplier: number;
}

const getTxDate = (tx: Transaction): Date =>
  tx.smsData?.timestamp ? new Date(tx.smsData.timestamp) : new Date(tx.createdAt);

export const getTopMerchants = async (limit: number = 10): Promise<MerchantSummary[]> => {
  const transactions = await getAllTransactions();
  const expenses = transactions.filter(tx => tx.type === 'expense');

  const aggregate = new Map<string, MerchantSummary>();

  for (const tx of expenses) {
    const vendor = tx.vendor || 'Unknown';
    const key = vendor.toLowerCase();
    const current = aggregate.get(key);
    const txDateIso = getTxDate(tx).toISOString();

    if (!current) {
      aggregate.set(key, {
        vendor,
        totalAmount: tx.amount,
        transactionCount: 1,
        lastTransactionAt: txDateIso,
      });
      continue;
    }

    current.totalAmount += tx.amount;
    current.transactionCount += 1;
    if (new Date(txDateIso) > new Date(current.lastTransactionAt)) {
      current.lastTransactionAt = txDateIso;
    }
  }

  return [...aggregate.values()]
    .sort((left, right) => right.totalAmount - left.totalAmount)
    .slice(0, limit);
};

export const getMerchantTrendsVsPreviousMonth = async (): Promise<MerchantTrend[]> => {
  const transactions = await getAllTransactions();
  const expenses = transactions.filter(tx => tx.type === 'expense');

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const currentMap = new Map<string, { vendor: string; total: number }>();
  const previousMap = new Map<string, { vendor: string; total: number }>();

  for (const tx of expenses) {
    const date = getTxDate(tx);
    const key = (tx.vendor || 'Unknown').toLowerCase();
    const vendor = tx.vendor || 'Unknown';

    if (date >= currentMonthStart) {
      const row = currentMap.get(key) || { vendor, total: 0 };
      row.total += tx.amount;
      currentMap.set(key, row);
    } else if (date >= previousMonthStart && date <= previousMonthEnd) {
      const row = previousMap.get(key) || { vendor, total: 0 };
      row.total += tx.amount;
      previousMap.set(key, row);
    }
  }

  const keys = new Set([...currentMap.keys(), ...previousMap.keys()]);
  const trends: MerchantTrend[] = [];

  for (const key of keys) {
    const current = currentMap.get(key);
    const previous = previousMap.get(key);

    const currentMonthAmount = current?.total || 0;
    const previousMonthAmount = previous?.total || 0;
    const deltaAmount = currentMonthAmount - previousMonthAmount;
    const deltaPercent = previousMonthAmount > 0 ? (deltaAmount / previousMonthAmount) * 100 : (currentMonthAmount > 0 ? 100 : 0);

    trends.push({
      vendor: current?.vendor || previous?.vendor || key,
      currentMonthAmount,
      previousMonthAmount,
      deltaAmount,
      deltaPercent,
    });
  }

  return trends.sort((left, right) => Math.abs(right.deltaAmount) - Math.abs(left.deltaAmount));
};

export const getUnusualMerchantSpikes = async (minMultiplier: number = 2): Promise<MerchantSpike[]> => {
  const transactions = await getAllTransactions();
  const expenses = transactions.filter(tx => tx.type === 'expense');

  const grouped = new Map<string, Transaction[]>();
  for (const tx of expenses) {
    const key = (tx.vendor || 'Unknown').toLowerCase();
    const current = grouped.get(key) || [];
    current.push(tx);
    grouped.set(key, current);
  }

  const spikes: MerchantSpike[] = [];

  for (const [_, txList] of grouped) {
    if (txList.length < 3) continue;

    const vendor = txList[0].vendor || 'Unknown';
    const sorted = txList.slice().sort((a, b) => getTxDate(a).getTime() - getTxDate(b).getTime());
    const amounts = sorted.map(tx => tx.amount);
    const averageAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;

    const largest = sorted.reduce((maxTx, tx) => (tx.amount > maxTx.amount ? tx : maxTx), sorted[0]);
    if (averageAmount <= 0) continue;

    const multiplier = largest.amount / averageAmount;
    if (multiplier >= minMultiplier) {
      spikes.push({
        vendor,
        averageAmount,
        spikeAmount: largest.amount,
        spikeDate: getTxDate(largest).toISOString(),
        multiplier,
      });
    }
  }

  return spikes.sort((left, right) => right.multiplier - left.multiplier);
};
