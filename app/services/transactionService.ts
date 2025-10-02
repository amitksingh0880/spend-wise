import { readJson, writeJson } from '../libs/storage';
import { uuidv4 } from '../utils/uuid';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  vendor: string;
  category: string;
  createdAt: string;
  description?: string;
  tags?: string[];
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: string;
  vendor?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  averageTransaction: number;
  categoryBreakdown: { [category: string]: number };
  monthlyTrend: { month: string; income: number; expenses: number }[];
}

const STORAGE_KEY = 'transactions';

// Basic CRUD Operations
export const getAllTransactions = async (): Promise<Transaction[]> => {
  return (await readJson<Transaction[]>(STORAGE_KEY)) || [];
};

export const getTransactionById = async (id: string): Promise<Transaction | null> => {
  const all = await getAllTransactions();
  return all.find(tx => tx.id === id) || null;
};

export const saveTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
  const all = await getAllTransactions();
  const newTx: Transaction = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...tx,
  };
  await writeJson(STORAGE_KEY, [newTx, ...all]);
  return newTx;
};

export const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<void> => {
  const all = await getAllTransactions();
  const updated = all.map(tx =>
    tx.id === id ? { ...tx, ...updates } : tx
  );
  await writeJson(STORAGE_KEY, updated);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const all = await getAllTransactions();
  const filtered = all.filter(tx => tx.id !== id);
  await writeJson(STORAGE_KEY, filtered);
};

export const clearAllTransactions = async (): Promise<void> => {
  await writeJson(STORAGE_KEY, []);
};

// Advanced Filtering and Search
export const getFilteredTransactions = async (filters: TransactionFilters): Promise<Transaction[]> => {
  const all = await getAllTransactions();
  
  return all.filter(tx => {
    if (filters.type && tx.type !== filters.type) return false;
    if (filters.category && tx.category !== filters.category) return false;
    if (filters.vendor && !tx.vendor.toLowerCase().includes(filters.vendor.toLowerCase())) return false;
    if (filters.dateFrom && new Date(tx.createdAt) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(tx.createdAt) > new Date(filters.dateTo)) return false;
    if (filters.minAmount && tx.amount < filters.minAmount) return false;
    if (filters.maxAmount && tx.amount > filters.maxAmount) return false;
    if (filters.tags && filters.tags.length > 0) {
      const txTags = tx.tags || [];
      if (!filters.tags.some(tag => txTags.includes(tag))) return false;
    }
    return true;
  });
};

export const searchTransactions = async (query: string): Promise<Transaction[]> => {
  const all = await getAllTransactions();
  const lowerQuery = query.toLowerCase();
  
  return all.filter(tx => 
    tx.vendor.toLowerCase().includes(lowerQuery) ||
    tx.category.toLowerCase().includes(lowerQuery) ||
    (tx.description && tx.description.toLowerCase().includes(lowerQuery)) ||
    (tx.tags && tx.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
  );
};

// Analytics and Reporting
export const getTransactionSummary = async (dateFrom?: string, dateTo?: string): Promise<TransactionSummary> => {
  const all = await getAllTransactions();
  
  let filtered = all;
  if (dateFrom || dateTo) {
    filtered = all.filter(tx => {
      const txDate = new Date(tx.createdAt);
      if (dateFrom && txDate < new Date(dateFrom)) return false;
      if (dateTo && txDate > new Date(dateTo)) return false;
      return true;
    });
  }

  const totalIncome = filtered
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpenses = filtered
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const categoryBreakdown: { [category: string]: number } = {};
  filtered.forEach(tx => {
    if (tx.type === 'expense') {
      categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + tx.amount;
    }
  });

  // Generate monthly trend for last 12 months
  const monthlyTrend: { month: string; income: number; expenses: number }[] = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const monthTransactions = all.filter(tx => {
      const txDate = new Date(tx.createdAt);
      return txDate >= monthStart && txDate <= monthEnd;
    });
    
    const monthIncome = monthTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const monthExpenses = monthTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    monthlyTrend.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      income: monthIncome,
      expenses: monthExpenses
    });
  }

  return {
    totalIncome,
    totalExpenses,
    netAmount: totalIncome - totalExpenses,
    transactionCount: filtered.length,
    averageTransaction: filtered.length > 0 ? (totalIncome + totalExpenses) / filtered.length : 0,
    categoryBreakdown,
    monthlyTrend
  };
};

export const getTopCategories = async (limit: number = 5, type: TransactionType = 'expense'): Promise<{ category: string; amount: number; count: number }[]> => {
  const all = await getAllTransactions();
  const filtered = all.filter(tx => tx.type === type);
  
  const categoryStats: { [category: string]: { amount: number; count: number } } = {};
  
  filtered.forEach(tx => {
    if (!categoryStats[tx.category]) {
      categoryStats[tx.category] = { amount: 0, count: 0 };
    }
    categoryStats[tx.category].amount += tx.amount;
    categoryStats[tx.category].count += 1;
  });
  
  return Object.entries(categoryStats)
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
};

export const getRecentTransactions = async (limit: number = 10): Promise<Transaction[]> => {
  const all = await getAllTransactions();
  return all
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
};

// Bulk Operations
export const importTransactions = async (transactions: Omit<Transaction, 'id' | 'createdAt'>[]): Promise<void> => {
  const existing = await getAllTransactions();
  const newTransactions = transactions.map(tx => ({
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...tx
  }));
  
  await writeJson(STORAGE_KEY, [...newTransactions, ...existing]);
};

export const exportTransactions = async (format: 'json' | 'csv' = 'json'): Promise<string> => {
  const all = await getAllTransactions();
  
  if (format === 'csv') {
    const headers = ['ID', 'Date', 'Vendor', 'Category', 'Type', 'Amount', 'Description', 'Tags'];
    const csvRows = [
      headers.join(','),
      ...all.map(tx => [
        tx.id,
        tx.createdAt,
        `"${tx.vendor}"`,
        `"${tx.category}"`,
        tx.type,
        tx.amount,
        `"${tx.description || ''}"`,
        `"${(tx.tags || []).join(';')}"`
      ].join(','))
    ];
    return csvRows.join('\n');
  }
  
  return JSON.stringify(all, null, 2);
};
