import { readJson, writeJson } from '../libs/storage';
import { uuidv4 } from '../utils/uuid';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}



const CATEGORIES_STORAGE_KEY = 'categories';

// Default categories that come with the app
const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Income Categories
  { name: 'Salary', type: 'income', icon: '💼', color: '#22c55e', isDefault: true, isActive: true },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#10b981', isDefault: true, isActive: true },
  { name: 'Investment', type: 'income', icon: '📈', color: '#059669', isDefault: true, isActive: true },
  { name: 'Gift', type: 'income', icon: '🎁', color: '#34d399', isDefault: true, isActive: true },
  { name: 'Other Income', type: 'income', icon: '💰', color: '#6ee7b7', isDefault: true, isActive: true },
  
  // Expense Categories
  { name: 'Food & Dining', type: 'expense', icon: '🍽️', color: '#ef4444', isDefault: true, isActive: true },
  { name: 'Groceries', type: 'expense', icon: '🛒', color: '#dc2626', isDefault: true, isActive: true },
  { name: 'Transportation', type: 'expense', icon: '🚗', color: '#f97316', isDefault: true, isActive: true },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#eab308', isDefault: true, isActive: true },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#8b5cf6', isDefault: true, isActive: true },
  { name: 'Bills & Utilities', type: 'expense', icon: '⚡', color: '#3b82f6', isDefault: true, isActive: true },
  { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#06b6d4', isDefault: true, isActive: true },
  { name: 'Education', type: 'expense', icon: '📚', color: '#8b5cf6', isDefault: true, isActive: true },
  { name: 'Travel', type: 'expense', icon: '✈️', color: '#ec4899', isDefault: true, isActive: true },
  { name: 'Personal Care', type: 'expense', icon: '💄', color: '#f59e0b', isDefault: true, isActive: true },
  { name: 'Home & Garden', type: 'expense', icon: '🏠', color: '#84cc16', isDefault: true, isActive: true },
  { name: 'Insurance', type: 'expense', icon: '🛡️', color: '#64748b', isDefault: true, isActive: true },
  { name: 'Taxes', type: 'expense', icon: '📋', color: '#6b7280', isDefault: true, isActive: true },
  { name: 'Budgeting', type: 'expense', icon: '🎯', color: '#f97316', isDefault: true, isActive: true },
  { name: 'Other Expenses', type: 'expense', icon: '📦', color: '#9ca3af', isDefault: true, isActive: true },
];

// Basic CRUD Operations
export const getAllCategories = async (): Promise<Category[]> => {
  let categories = await readJson<Category[]>(CATEGORIES_STORAGE_KEY);
  
  // Initialize with default categories if none exist
  if (!categories || categories.length === 0) {
    categories = await initializeDefaultCategories();
  }
  
  return categories.filter(cat => cat.isActive);
};



// Utility Functions
const initializeDefaultCategories = async (): Promise<Category[]> => {
  const defaultCategories: Category[] = DEFAULT_CATEGORIES.map(cat => ({
    ...cat,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  
  await writeJson(CATEGORIES_STORAGE_KEY, defaultCategories);
  return defaultCategories;
};



