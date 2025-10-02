import { readJson, writeJson } from '../libs/storage';
import { uuidv4 } from '../utils/uuid';
import { getAllTransactions } from './transactionService';

export interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  type: 'warning' | 'exceeded' | 'approaching';
  threshold: number; // percentage (e.g., 80 for 80%)
  message: string;
  isActive: boolean;
  createdAt: string;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  budgetsCount: number;
  exceededBudgets: number;
  warningBudgets: number;
  onTrackBudgets: number;
  categoryBreakdown: {
    category: string;
    budgeted: number;
    spent: number;
    remaining: number;
    percentage: number;
  }[];
}

const BUDGETS_STORAGE_KEY = 'budgets';
const BUDGET_ALERTS_STORAGE_KEY = 'budget_alerts';

// Basic CRUD Operations
export const getAllBudgets = async (): Promise<Budget[]> => {
  return (await readJson<Budget[]>(BUDGETS_STORAGE_KEY)) || [];
};

export const getBudgetById = async (id: string): Promise<Budget | null> => {
  const budgets = await getAllBudgets();
  return budgets.find(budget => budget.id === id) || null;
};

export const createBudget = async (budgetData: Omit<Budget, 'id' | 'spent' | 'createdAt' | 'updatedAt'>): Promise<Budget> => {
  const budgets = await getAllBudgets();
  const newBudget: Budget = {
    id: uuidv4(),
    spent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...budgetData,
  };
  
  await writeJson(BUDGETS_STORAGE_KEY, [newBudget, ...budgets]);
  return newBudget;
};

export const updateBudget = async (id: string, updates: Partial<Omit<Budget, 'id' | 'createdAt'>>): Promise<void> => {
  const budgets = await getAllBudgets();
  const updatedBudgets = budgets.map(budget =>
    budget.id === id 
      ? { ...budget, ...updates, updatedAt: new Date().toISOString() }
      : budget
  );
  await writeJson(BUDGETS_STORAGE_KEY, updatedBudgets);
};

export const deleteBudget = async (id: string): Promise<void> => {
  const budgets = await getAllBudgets();
  const filtered = budgets.filter(budget => budget.id !== id);
  await writeJson(BUDGETS_STORAGE_KEY, filtered);
  
  // Also delete related alerts
  const alerts = await getAllBudgetAlerts();
  const filteredAlerts = alerts.filter(alert => alert.budgetId !== id);
  await writeJson(BUDGET_ALERTS_STORAGE_KEY, filteredAlerts);
};

// Budget Calculation and Updates
export const updateBudgetSpending = async (): Promise<void> => {
  const budgets = await getAllBudgets();
  const transactions = await getAllTransactions();
  
  const updatedBudgets = await Promise.all(budgets.map(async (budget) => {
    const spent = calculateSpentAmount(budget, transactions);
    return { ...budget, spent, updatedAt: new Date().toISOString() };
  }));
  
  await writeJson(BUDGETS_STORAGE_KEY, updatedBudgets);
};

const calculateSpentAmount = (budget: Budget, transactions: any[]): number => {
  const budgetStart = new Date(budget.startDate);
  const budgetEnd = new Date(budget.endDate);
  
  return transactions
    .filter(tx => 
      tx.type === 'expense' &&
      tx.category === budget.category &&
      new Date(tx.createdAt) >= budgetStart &&
      new Date(tx.createdAt) <= budgetEnd
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
};

export const getBudgetProgress = async (budgetId: string): Promise<{
  budget: Budget;
  percentage: number;
  remaining: number;
  daysLeft: number;
  dailyBudget: number;
  projectedSpending: number;
  status: 'on-track' | 'warning' | 'exceeded';
}> => {
  const budget = await getBudgetById(budgetId);
  if (!budget) throw new Error('Budget not found');
  
  await updateBudgetSpending();
  const updatedBudget = await getBudgetById(budgetId);
  if (!updatedBudget) throw new Error('Budget not found after update');
  
  const percentage = (updatedBudget.spent / updatedBudget.amount) * 100;
  const remaining = updatedBudget.amount - updatedBudget.spent;
  
  const now = new Date();
  const endDate = new Date(updatedBudget.endDate);
  const startDate = new Date(updatedBudget.startDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = totalDays - daysLeft;
  
  const dailyBudget = updatedBudget.amount / totalDays;
  const projectedSpending = daysElapsed > 0 ? (updatedBudget.spent / daysElapsed) * totalDays : 0;
  
  let status: 'on-track' | 'warning' | 'exceeded' = 'on-track';
  if (percentage >= 100) status = 'exceeded';
  else if (percentage >= 80) status = 'warning';
  
  return {
    budget: updatedBudget,
    percentage,
    remaining,
    daysLeft: Math.max(0, daysLeft),
    dailyBudget,
    projectedSpending,
    status
  };
};

// Budget Categories and Templates
export const getBudgetsByCategory = async (category: string): Promise<Budget[]> => {
  const budgets = await getAllBudgets();
  return budgets.filter(budget => budget.category === category && budget.isActive);
};

export const getActiveBudgets = async (): Promise<Budget[]> => {
  const budgets = await getAllBudgets();
  const now = new Date();
  return budgets.filter(budget => 
    budget.isActive && 
    new Date(budget.startDate) <= now && 
    new Date(budget.endDate) >= now
  );
};

export const createBudgetTemplate = async (name: string, categories: { category: string; amount: number; color: string }[]): Promise<void> => {
  const templates = (await readJson<any[]>('budget_templates')) || [];
  const newTemplate = {
    id: uuidv4(),
    name,
    categories,
    createdAt: new Date().toISOString()
  };
  await writeJson('budget_templates', [newTemplate, ...templates]);
};

export const getBudgetTemplates = async (): Promise<any[]> => {
  return (await readJson<any[]>('budget_templates')) || [];
};

// Budget Alerts
export const getAllBudgetAlerts = async (): Promise<BudgetAlert[]> => {
  return (await readJson<BudgetAlert[]>(BUDGET_ALERTS_STORAGE_KEY)) || [];
};

export const createBudgetAlert = async (alertData: Omit<BudgetAlert, 'id' | 'createdAt'>): Promise<BudgetAlert> => {
  const alerts = await getAllBudgetAlerts();
  const newAlert: BudgetAlert = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...alertData,
  };
  
  await writeJson(BUDGET_ALERTS_STORAGE_KEY, [newAlert, ...alerts]);
  return newAlert;
};

export const checkBudgetAlerts = async (): Promise<BudgetAlert[]> => {
  const budgets = await getActiveBudgets();
  const existingAlerts = await getAllBudgetAlerts();
  const newAlerts: BudgetAlert[] = [];
  
  for (const budget of budgets) {
    const progress = await getBudgetProgress(budget.id);
    
    // Check if we need to create new alerts
    if (progress.percentage >= 100 && !existingAlerts.some(a => a.budgetId === budget.id && a.type === 'exceeded')) {
      newAlerts.push({
        id: uuidv4(),
        budgetId: budget.id,
        type: 'exceeded',
        threshold: 100,
        message: `Budget "${budget.name}" has been exceeded by $${(progress.budget.spent - progress.budget.amount).toFixed(2)}`,
        isActive: true,
        createdAt: new Date().toISOString()
      });
    } else if (progress.percentage >= 80 && !existingAlerts.some(a => a.budgetId === budget.id && a.type === 'warning')) {
      newAlerts.push({
        id: uuidv4(),
        budgetId: budget.id,
        type: 'warning',
        threshold: 80,
        message: `Budget "${budget.name}" is at ${progress.percentage.toFixed(1)}% of limit`,
        isActive: true,
        createdAt: new Date().toISOString()
      });
    }
  }
  
  if (newAlerts.length > 0) {
    await writeJson(BUDGET_ALERTS_STORAGE_KEY, [...newAlerts, ...existingAlerts]);
  }
  
  return newAlerts;
};

export const dismissAlert = async (alertId: string): Promise<void> => {
  const alerts = await getAllBudgetAlerts();
  const updatedAlerts = alerts.map(alert =>
    alert.id === alertId ? { ...alert, isActive: false } : alert
  );
  await writeJson(BUDGET_ALERTS_STORAGE_KEY, updatedAlerts);
};

// Budget Analytics and Reporting
export const getBudgetSummary = async (): Promise<BudgetSummary> => {
  const budgets = await getActiveBudgets();
  await updateBudgetSpending();
  const updatedBudgets = await getActiveBudgets();
  
  const totalBudgeted = updatedBudgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = updatedBudgets.reduce((sum, budget) => sum + budget.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  
  let exceededBudgets = 0;
  let warningBudgets = 0;
  let onTrackBudgets = 0;
  
  const categoryBreakdown = updatedBudgets.map(budget => {
    const percentage = (budget.spent / budget.amount) * 100;
    const remaining = budget.amount - budget.spent;
    
    if (percentage >= 100) exceededBudgets++;
    else if (percentage >= 80) warningBudgets++;
    else onTrackBudgets++;
    
    return {
      category: budget.category,
      budgeted: budget.amount,
      spent: budget.spent,
      remaining,
      percentage
    };
  });
  
  return {
    totalBudgeted,
    totalSpent,
    totalRemaining,
    budgetsCount: updatedBudgets.length,
    exceededBudgets,
    warningBudgets,
    onTrackBudgets,
    categoryBreakdown
  };
};

export const getBudgetTrends = async (months: number = 6): Promise<{
  month: string;
  budgeted: number;
  spent: number;
  variance: number;
}[]> => {
  const budgets = await getAllBudgets();
  const trends: { month: string; budgeted: number; spent: number; variance: number }[] = [];
  
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const monthBudgets = budgets.filter(budget => {
      const budgetStart = new Date(budget.startDate);
      const budgetEnd = new Date(budget.endDate);
      return budgetStart <= monthEnd && budgetEnd >= monthStart;
    });
    
    const budgeted = monthBudgets.reduce((sum, budget) => sum + budget.amount, 0);
    const spent = monthBudgets.reduce((sum, budget) => sum + budget.spent, 0);
    const variance = budgeted - spent;
    
    trends.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      budgeted,
      spent,
      variance
    });
  }
  
  return trends;
};

// Utility Functions
export const generateBudgetPeriod = (period: 'weekly' | 'monthly' | 'yearly', startDate?: Date): { startDate: string; endDate: string } => {
  const start = startDate || new Date();
  let end: Date;
  
  switch (period) {
    case 'weekly':
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      break;
    case 'yearly':
      end = new Date(start.getFullYear(), 11, 31);
      break;
  }
  
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString()
  };
};

export const getDefaultBudgetColors = (): string[] => [
  '#ef4444', // red
  '#f97316', // orange  
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
  '#78716c', // stone
];

