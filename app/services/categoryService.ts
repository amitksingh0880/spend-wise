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

export interface CategoryUsage {
  categoryId: string;
  categoryName: string;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  lastUsed: string;
  frequency: 'high' | 'medium' | 'low';
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

export const getCategoryById = async (id: string): Promise<Category | null> => {
  const categories = await getAllCategories();
  return categories.find(cat => cat.id === id) || null;
};

export const createCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
  const categories = await readJson<Category[]>(CATEGORIES_STORAGE_KEY) || [];
  
  const newCategory: Category = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...categoryData,
  };
  
  await writeJson(CATEGORIES_STORAGE_KEY, [newCategory, ...categories]);
  return newCategory;
};

export const updateCategory = async (id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<void> => {
  const categories = await readJson<Category[]>(CATEGORIES_STORAGE_KEY) || [];
  
  const updatedCategories = categories.map(cat =>
    cat.id === id 
      ? { ...cat, ...updates, updatedAt: new Date().toISOString() }
      : cat
  );
  
  await writeJson(CATEGORIES_STORAGE_KEY, updatedCategories);
};

export const deleteCategory = async (id: string): Promise<void> => {
  const category = await getCategoryById(id);
  if (!category) throw new Error('Category not found');
  
  if (category.isDefault) {
    // Don't actually delete default categories, just deactivate them
    await updateCategory(id, { isActive: false });
  } else {
    const categories = await readJson<Category[]>(CATEGORIES_STORAGE_KEY) || [];
    const filtered = categories.filter(cat => cat.id !== id);
    await writeJson(CATEGORIES_STORAGE_KEY, filtered);
  }
};

// Category Management
export const getCategoriesByType = async (type: 'income' | 'expense'): Promise<Category[]> => {
  const categories = await getAllCategories();
  return categories.filter(cat => cat.type === type || cat.type === 'both');
};

export const getParentCategories = async (): Promise<Category[]> => {
  const categories = await getAllCategories();
  return categories.filter(cat => !cat.parentId);
};

export const getSubCategories = async (parentId: string): Promise<Category[]> => {
  const categories = await getAllCategories();
  return categories.filter(cat => cat.parentId === parentId);
};

export const searchCategories = async (query: string): Promise<Category[]> => {
  const categories = await getAllCategories();
  const lowerQuery = query.toLowerCase();
  
  return categories.filter(cat =>
    cat.name.toLowerCase().includes(lowerQuery)
  );
};

// Category Analytics
export const getCategoryUsageStats = async (): Promise<CategoryUsage[]> => {
  const { getAllTransactions } = await import('./transactionService');
  const transactions = await getAllTransactions();
  const categories = await getAllCategories();
  
  const usageStats: CategoryUsage[] = [];
  
  for (const category of categories) {
    const categoryTransactions = transactions.filter(tx => tx.category === category.name);
    
    if (categoryTransactions.length > 0) {
      const totalAmount = categoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const averageAmount = totalAmount / categoryTransactions.length;
      const lastUsed = categoryTransactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        .createdAt;
      
      // Determine frequency based on usage in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentTransactions = categoryTransactions.filter(tx => 
        new Date(tx.createdAt) >= thirtyDaysAgo
      );
      
      let frequency: 'high' | 'medium' | 'low' = 'low';
      if (recentTransactions.length >= 10) frequency = 'high';
      else if (recentTransactions.length >= 3) frequency = 'medium';
      
      usageStats.push({
        categoryId: category.id,
        categoryName: category.name,
        transactionCount: categoryTransactions.length,
        totalAmount,
        averageAmount,
        lastUsed,
        frequency
      });
    }
  }
  
  return usageStats.sort((a, b) => b.transactionCount - a.transactionCount);
};

export const getUnusedCategories = async (): Promise<Category[]> => {
  const { getAllTransactions } = await import('./transactionService');
  const transactions = await getAllTransactions();
  const categories = await getAllCategories();
  
  const usedCategoryNames = new Set(transactions.map(tx => tx.category));
  
  return categories.filter(cat => !usedCategoryNames.has(cat.name));
};

export const suggestCategoriesForTransaction = async (vendor: string, amount: number): Promise<Category[]> => {
  const { getAllTransactions } = await import('./transactionService');
  const transactions = await getAllTransactions();
  const categories = await getAllCategories();
  
  // Find similar transactions by vendor
  const similarTransactions = transactions.filter(tx => 
    tx.vendor.toLowerCase().includes(vendor.toLowerCase()) ||
    vendor.toLowerCase().includes(tx.vendor.toLowerCase())
  );
  
  if (similarTransactions.length > 0) {
    // Return categories used for similar vendors
    const suggestedCategoryNames = Array.from(new Set(similarTransactions.map(tx => tx.category)));
    return categories.filter(cat => suggestedCategoryNames.includes(cat.name));
  }
  
  // Fallback: suggest categories based on amount range
  const amountBasedTransactions = transactions.filter(tx => 
    Math.abs(tx.amount - amount) <= amount * 0.5 // Within 50% of the amount
  );
  
  if (amountBasedTransactions.length > 0) {
    const categoryFrequency: { [name: string]: number } = {};
    amountBasedTransactions.forEach(tx => {
      categoryFrequency[tx.category] = (categoryFrequency[tx.category] || 0) + 1;
    });
    
    const topCategories = Object.entries(categoryFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);
    
    return categories.filter(cat => topCategories.includes(cat.name));
  }
  
  // Default suggestions for expense transactions
  return categories.filter(cat => cat.type === 'expense').slice(0, 5);
};

// Category Import/Export
export const exportCategories = async (): Promise<string> => {
  const categories = await readJson<Category[]>(CATEGORIES_STORAGE_KEY) || [];
  return JSON.stringify(categories, null, 2);
};

export const importCategories = async (categoriesJson: string): Promise<void> => {
  const importedCategories: Category[] = JSON.parse(categoriesJson);
  const existingCategories = await readJson<Category[]>(CATEGORIES_STORAGE_KEY) || [];
  
  // Merge categories, avoiding duplicates by name
  const existingNames = new Set(existingCategories.map(cat => cat.name));
  const newCategories = importedCategories.filter(cat => !existingNames.has(cat.name));
  
  // Assign new IDs and timestamps to imported categories
  const processedCategories = newCategories.map(cat => ({
    ...cat,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  
  await writeJson(CATEGORIES_STORAGE_KEY, [...existingCategories, ...processedCategories]);
};

// Utility Functions
export const initializeDefaultCategories = async (): Promise<Category[]> => {
  const defaultCategories: Category[] = DEFAULT_CATEGORIES.map(cat => ({
    ...cat,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  
  await writeJson(CATEGORIES_STORAGE_KEY, defaultCategories);
  return defaultCategories;
};

export const resetToDefaultCategories = async (): Promise<void> => {
  await initializeDefaultCategories();
};

export const getCategoryColors = (): string[] => [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#84cc16', '#64748b'
];

export const getCategoryIcons = (): string[] => [
  '💼', '💻', '📈', '🎁', '💰', '🍽️', '🛒', '🚗', '🛍️', '🎬',
  '⚡', '🏥', '📚', '✈️', '💄', '🏠', '🛡️', '📋', '📦', '🎯',
  '🏃', '🎵', '📱', '🎮', '☕', '🚌', '⛽', '🧾', '💊', '🔧'
];

