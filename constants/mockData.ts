import { BudgetCategory, Transaction } from "@/types";


export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', vendor: 'Starbucks', amount: 5.75, date: '2024-07-21', category: 'Food', type: 'expense' },
  { id: '2', vendor: 'Shell Gas', amount: 45.30, date: '2024-07-21', category: 'Transport', type: 'expense' },
  { id: '3', vendor: 'Netflix', amount: 15.99, date: '2024-07-20', category: 'Entertainment', type: 'expense' },
  { id: '4', vendor: 'Salary Deposit', amount: 2500.00, date: '2024-07-19', category: 'Income', type: 'income' },
  { id: '5', vendor: 'Trader Joe\'s', amount: 124.50, date: '2024-07-18', category: 'Groceries', type: 'expense' },
  { id: '6', vendor: 'Amazon', amount: 89.99, date: '2024-07-17', category: 'Shopping', type: 'expense' },
  { id: '7', vendor: 'Movie Theater', amount: 32.00, date: '2024-07-15', category: 'Entertainment', type: 'expense' },
  { id: '8', vendor: 'Electricity Bill', amount: 75.00, date: '2024-07-14', category: 'Utilities', type: 'expense' },
];

export const MOCK_BUDGETS: BudgetCategory[] = [
  { id: '1', name: 'Groceries', spent: 310, total: 500, color: 'hsl(142, 71%, 45%)' },
  { id: '2', name: 'Shopping', spent: 250, total: 300, color: 'hsl(250, 75%, 60%)' },
  { id: '3', name: 'Entertainment', spent: 95, total: 150, color: 'hsl(346, 84%, 61%)' },
  { id: '4', name: 'Transport', spent: 110, total: 200, color: 'hsl(39, 90%, 55%)' },
  { id: '5', name: 'Utilities', spent: 150, total: 150, color: 'hsl(204, 86%, 53%)' },
];
