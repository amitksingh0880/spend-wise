
export enum Screen {
    Dashboard = 'dashboard',
    Transactions = 'transactions',
    Budget = 'budget',
    Voice = 'voice',
    Settings = 'settings',
}

export type Theme = 'light' | 'dark';

export interface Transaction {
    id: string;
    vendor: string;
    amount: number;
    date: string;
    category: string;
    type: 'income' | 'expense';
}

export interface BudgetCategory {
    id: string;
    name: string;
    spent: number;
    total: number;
    color: string;
}
