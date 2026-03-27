import { readJson, writeJson } from '@/libs/storage';
import { uuidv4 } from '@/utils/uuid';
import { getAllTransactions } from './transactionService';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  linkedCategories?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalEta {
  goalId: string;
  goalName: string;
  monthsToGoal: number | null;
  etaDate: string | null;
  requiredMonthlySaving: number;
  projectedMonthlySaving: number;
  estimatedSpendingCutPerMonth: number;
}

const GOALS_KEY = 'savings_goals';

export const getAllGoals = async (): Promise<SavingsGoal[]> => {
  return (await readJson<SavingsGoal[]>(GOALS_KEY)) || [];
};

export const createGoal = async (input: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavingsGoal> => {
  const goals = await getAllGoals();
  const goal: SavingsGoal = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...input,
  };

  await writeJson(GOALS_KEY, [goal, ...goals]);
  return goal;
};

export const updateGoal = async (id: string, updates: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>): Promise<void> => {
  const goals = await getAllGoals();
  const updated = goals.map(goal => (goal.id === id ? { ...goal, ...updates, updatedAt: new Date().toISOString() } : goal));
  await writeJson(GOALS_KEY, updated);
};

export const deleteGoal = async (id: string): Promise<void> => {
  const goals = await getAllGoals();
  await writeJson(GOALS_KEY, goals.filter(goal => goal.id !== id));
};

const getMonthlyAverageSavings = async (): Promise<number> => {
  const transactions = await getAllTransactions();
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const monthly = new Map<string, { income: number; expense: number }>();

  for (const tx of transactions) {
    const date = tx.smsData?.timestamp ? new Date(tx.smsData.timestamp) : new Date(tx.createdAt);
    if (date < threeMonthsAgo) continue;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const row = monthly.get(key) || { income: 0, expense: 0 };
    if (tx.type === 'income') row.income += tx.amount;
    if (tx.type === 'expense') row.expense += tx.amount;
    monthly.set(key, row);
  }

  const netSavings = [...monthly.values()].map(row => row.income - row.expense);
  if (!netSavings.length) return 0;

  return netSavings.reduce((sum, value) => sum + value, 0) / netSavings.length;
};

export const getGoalEta = async (): Promise<GoalEta[]> => {
  const goals = (await getAllGoals()).filter(goal => goal.isActive);
  const projectedMonthlySaving = await getMonthlyAverageSavings();

  return goals.map(goal => {
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

    const requiredMonthlySaving = goal.targetDate
      ? (() => {
          const now = new Date();
          const target = new Date(goal.targetDate);
          const monthsLeft = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
          return remaining / monthsLeft;
        })()
      : 0;

    const monthsToGoal = projectedMonthlySaving > 0 ? Math.ceil(remaining / projectedMonthlySaving) : null;
    const etaDate = monthsToGoal === null
      ? null
      : new Date(new Date().getFullYear(), new Date().getMonth() + monthsToGoal, 1).toISOString();

    const estimatedSpendingCutPerMonth = Math.max(0, requiredMonthlySaving - projectedMonthlySaving);

    return {
      goalId: goal.id,
      goalName: goal.name,
      monthsToGoal,
      etaDate,
      requiredMonthlySaving,
      projectedMonthlySaving,
      estimatedSpendingCutPerMonth,
    };
  });
};
