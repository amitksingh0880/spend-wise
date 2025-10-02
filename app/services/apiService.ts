// Main API Service - Central hub for all SpendWise API operations
// This service provides a unified interface for all data operations

import * as AIService from './aiService';
import * as AnalyticsService from './analyticsService';
import * as BudgetService from './budgetService';
import * as CategoryService from './categoryService';
import * as ExportService from './exportService';
import * as TransactionService from './transactionService';

// Re-export all service functions for easy access
export {

    // AI Services
    AIService,
    // Analytics Services
    AnalyticsService,
    // Budget Services  
    BudgetService,

    // Category Services
    CategoryService,
    // Export Services
    ExportService,
    // Transaction Services
    TransactionService
};

// Unified API interface
export class SpendWiseAPI {
  
  // Transaction Operations
  static transactions = {
    getAll: TransactionService.getAllTransactions,
    getById: TransactionService.getTransactionById,
    create: TransactionService.saveTransaction,
    update: TransactionService.updateTransaction,
    delete: TransactionService.deleteTransaction,
    search: TransactionService.searchTransactions,
    filter: TransactionService.getFilteredTransactions,
    getRecent: TransactionService.getRecentTransactions,
    getSummary: TransactionService.getTransactionSummary,
    getTopCategories: TransactionService.getTopCategories,
    import: TransactionService.importTransactions,
    export: TransactionService.exportTransactions,
    clear: TransactionService.clearAllTransactions,
  };

  // Budget Operations
  static budgets = {
    getAll: BudgetService.getAllBudgets,
    getById: BudgetService.getBudgetById,
    create: BudgetService.createBudget,
    update: BudgetService.updateBudget,
    delete: BudgetService.deleteBudget,
    getActive: BudgetService.getActiveBudgets,
    getByCategory: BudgetService.getBudgetsByCategory,
    getProgress: BudgetService.getBudgetProgress,
    updateSpending: BudgetService.updateBudgetSpending,
    getSummary: BudgetService.getBudgetSummary,
    getTrends: BudgetService.getBudgetTrends,
    checkAlerts: BudgetService.checkBudgetAlerts,
    dismissAlert: BudgetService.dismissAlert,
    createTemplate: BudgetService.createBudgetTemplate,
    getTemplates: BudgetService.getBudgetTemplates,
  };

  // Category Operations
  static categories = {
    getAll: CategoryService.getAllCategories,
    getById: CategoryService.getCategoryById,
    create: CategoryService.createCategory,
    update: CategoryService.updateCategory,
    delete: CategoryService.deleteCategory,
    getByType: CategoryService.getCategoriesByType,
    search: CategoryService.searchCategories,
    getUsageStats: CategoryService.getCategoryUsageStats,
    getUnused: CategoryService.getUnusedCategories,
    suggest: CategoryService.suggestCategoriesForTransaction,
    import: CategoryService.importCategories,
    export: CategoryService.exportCategories,
    initializeDefaults: CategoryService.initializeDefaultCategories,
    reset: CategoryService.resetToDefaultCategories,
  };

  // Analytics Operations
  static analytics = {
    getInsights: AnalyticsService.generateFinancialInsights,
    getSpendingPatterns: AnalyticsService.analyzeSpendingPatternsByCategory,
    getHealthScore: AnalyticsService.calculateFinancialHealthScore,
    getCashFlow: AnalyticsService.analyzeCashFlow,
    generateReport: AnalyticsService.generateFinancialReport,
  };

  // Export Operations
  static export = {
    transactions: ExportService.exportTransactions,
    budgets: ExportService.exportBudgets,
    generateReport: ExportService.generateFinancialReportFile,
    importFromCSV: ExportService.importTransactionsFromCSV,
    getFormats: ExportService.getExportFormats,
    validateOptions: ExportService.validateExportOptions,
  };

  // AI Operations
  static ai = {
    getInsights: AIService.getFinancialInsights,
    chat: AIService.chatWithAI,
    generateSpendingInsights: AIService.generateSpendingInsights,
    suggestBudgetOptimizations: AIService.suggestBudgetOptimizations,
    generateSavingRecommendations: AIService.generateSavingRecommendations,
    prepareContext: AIService.prepareFinancialContext,
  };

  // Utility Operations
  static utils = {
    initializeApp: async () => {
      // Initialize default categories if none exist
      const categories = await CategoryService.getAllCategories();
      if (categories.length === 0) {
        await CategoryService.initializeDefaultCategories();
      }
      
      // Update budget spending calculations
      await BudgetService.updateBudgetSpending();
      
      // Check for budget alerts
      await BudgetService.checkBudgetAlerts();
    },

    getDashboardData: async () => {
      const [
        transactions,
        budgets,
        summary,
        insights,
        healthScore
      ] = await Promise.all([
        TransactionService.getRecentTransactions(10),
        BudgetService.getActiveBudgets(),
        TransactionService.getTransactionSummary(),
        AnalyticsService.generateFinancialInsights(),
        AnalyticsService.calculateFinancialHealthScore()
      ]);

      return {
        recentTransactions: transactions,
        activeBudgets: budgets,
        summary,
        insights: insights.slice(0, 3), // Top 3 insights
        healthScore,
        totalIncome: summary.totalIncome,
        totalExpenses: summary.totalExpenses,
        netAmount: summary.netAmount,
        savingsRate: summary.totalIncome > 0 ? ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100 : 0
      };
    },

    getTransactionPageData: async (searchQuery?: string, filters?: any) => {
      let transactions;
      
      if (searchQuery) {
        transactions = await TransactionService.searchTransactions(searchQuery);
      } else if (filters) {
        transactions = await TransactionService.getFilteredTransactions(filters);
      } else {
        transactions = await TransactionService.getAllTransactions();
      }

      const categories = await CategoryService.getCategoriesByType('expense');
      
      return {
        transactions,
        categories,
        totalCount: transactions.length
      };
    },

    getBudgetPageData: async () => {
      const [
        budgets,
        summary,
        alerts,
        templates
      ] = await Promise.all([
        BudgetService.getAllBudgets(),
        BudgetService.getBudgetSummary(),
        BudgetService.checkBudgetAlerts(),
        BudgetService.getBudgetTemplates()
      ]);

      return {
        budgets,
        summary,
        alerts,
        templates
      };
    },

    getSettingsData: async () => {
      const [
        categories,
        budgets,
        transactions
      ] = await Promise.all([
        CategoryService.getAllCategories(),
        BudgetService.getAllBudgets(),
        TransactionService.getAllTransactions()
      ]);

      return {
        dataStats: {
          categoriesCount: categories.length,
          budgetsCount: budgets.length,
          transactionsCount: transactions.length,
          dataSize: JSON.stringify({ categories, budgets, transactions }).length
        }
      };
    },

    performDataMaintenance: async () => {
      // Update all budget spending
      await BudgetService.updateBudgetSpending();
      
      // Check for alerts
      const alerts = await BudgetService.checkBudgetAlerts();
      
      // Clean up old inactive budgets (older than 1 year)
      const budgets = await BudgetService.getAllBudgets();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      for (const budget of budgets) {
        if (!budget.isActive && new Date(budget.endDate) < oneYearAgo) {
          await BudgetService.deleteBudget(budget.id);
        }
      }
      
      return {
        alertsGenerated: alerts.length,
        budgetsCleaned: budgets.filter(b => !b.isActive && new Date(b.endDate) < oneYearAgo).length
      };
    },

    exportAllData: async (format: 'json' | 'csv' = 'json') => {
      const options: ExportService.ExportOptions = {
        format,
        includeTransactions: true,
        includeBudgets: true,
        includeAnalytics: true
      };
      
      return await ExportService.exportTransactions(options);
    },

    getAppStatistics: async () => {
      const [
        transactions,
        budgets,
        categories,
        summary,
        healthScore
      ] = await Promise.all([
        TransactionService.getAllTransactions(),
        BudgetService.getAllBudgets(),
        CategoryService.getAllCategories(),
        TransactionService.getTransactionSummary(),
        AnalyticsService.calculateFinancialHealthScore()
      ]);

      const categoryUsage = await CategoryService.getCategoryUsageStats();
      
      return {
        totalTransactions: transactions.length,
        totalBudgets: budgets.length,
        totalCategories: categories.length,
        activeBudgets: budgets.filter(b => b.isActive).length,
        totalIncome: summary.totalIncome,
        totalExpenses: summary.totalExpenses,
        netWorth: summary.netAmount,
        healthScore: healthScore.score,
        mostUsedCategory: categoryUsage[0]?.categoryName || 'None',
        averageTransactionAmount: summary.averageTransaction,
        transactionsThisMonth: transactions.filter(tx => {
          const txDate = new Date(tx.createdAt);
          const now = new Date();
          return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        }).length
      };
    }
  };
}

// Default export for easy importing
export default SpendWiseAPI;

// Helper functions for common operations
export const quickActions = {
  addTransaction: async (vendor: string, amount: number, category: string, type: 'income' | 'expense') => {
    return await TransactionService.saveTransaction({
      vendor,
      amount,
      category,
      type
    });
  },

  createMonthlyBudget: async (category: string, amount: number) => {
    const { startDate, endDate } = BudgetService.generateBudgetPeriod('monthly');
    const colors = BudgetService.getDefaultBudgetColors();
    
    return await BudgetService.createBudget({
      name: `${category} Budget`,
      category,
      amount,
      period: 'monthly',
      startDate,
      endDate,
      color: colors[Math.floor(Math.random() * colors.length)],
      isActive: true
    });
  },

  getQuickInsights: async () => {
    const context = await AIService.prepareFinancialContext();
    const insights = await AIService.getFinancialInsights(context);
    
    return {
      topInsight: insights[0],
      savingsRate: (context.savingsRate * 100).toFixed(1) + '%',
      monthlyTrend: context.monthlyTrend,
      topSpendingCategory: context.topCategories[0]?.category || 'None'
    };
  }
};

// Type definitions for API responses
export interface DashboardData {
  recentTransactions: any[];
  activeBudgets: any[];
  summary: any;
  insights: any[];
  healthScore: any;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  savingsRate: number;
}

export interface TransactionPageData {
  transactions: any[];
  categories: any[];
  totalCount: number;
}

export interface BudgetPageData {
  budgets: any[];
  summary: any;
  alerts: any[];
  templates: any[];
}

export interface AppStatistics {
  totalTransactions: number;
  totalBudgets: number;
  totalCategories: number;
  activeBudgets: number;
  totalIncome: number;
  totalExpenses: number;
  netWorth: number;
  healthScore: number;
  mostUsedCategory: string;
  averageTransactionAmount: number;
  transactionsThisMonth: number;
}

