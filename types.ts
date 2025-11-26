
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
    description?: string;
    tags?: string[];
    createdAt?: string;
    smsData?: {
        rawMessage: string;
        sender: string;
        timestamp: number;
    };
}

export interface BudgetCategory {
    id: string;
    name: string;
    spent: number;
    total: number;
    color: string;
}

// Extended types for enhanced functionality
export interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense' | 'both';
    icon: string;
    color: string;
    isDefault: boolean;
    isActive: boolean;
    parentId?: string;
}

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
}

export interface FinancialGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    isActive: boolean;
}

export interface NotificationSettings {
    budgetAlerts: boolean;
    goalReminders: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
    pushNotifications: boolean;
}

export type Currency = 'USD' | 'INR';

export interface UserPreferences {
    currency: Currency;
    dateFormat: string;
    theme: Theme;
    notifications: NotificationSettings;
    defaultCategories: string[];
    // authentication preferences removed
}
