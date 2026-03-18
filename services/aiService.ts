// AI Service for SpendWise - Gemini AI Integration
// This service provides AI-powered financial insights and voice assistance

export interface AIInsight {
  id: string;
  type: 'spending_advice' | 'budget_suggestion' | 'saving_tip' | 'trend_analysis' | 'goal_recommendation';
  title: string;
  content: string;
  confidence: number; // 0-1
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: any; // Financial data context used for the response
}

export interface FinancialContext {
  totalIncome: number;
  totalExpenses: number;
  topCategories: { category: string; amount: number }[];
  budgetStatus: { category: string; spent: number; budget: number }[];
  recentTransactions: any[];
  savingsRate: number;
  monthlyTrend: 'increasing' | 'decreasing' | 'stable';
}

// Mock AI responses for demonstration (replace with actual Gemini API calls)
const MOCK_RESPONSES = {
  spending_analysis: [
    "Based on your spending patterns, you're spending 35% of your income on food and dining. Consider meal planning to reduce this by 10-15%.",
    "Your transportation costs have increased 20% this month. Look into carpooling or public transport options.",
    "You have several recurring subscriptions totaling $89/month. Review which ones you actively use.",
  ],
  budget_advice: [
    "Your grocery budget is consistently under-utilized. Consider reallocating $100 to your entertainment budget.",
    "You're exceeding your shopping budget by 25%. Try the 24-hour rule before making non-essential purchases.",
    "Your utility bills are higher than average. Consider energy-saving measures to reduce costs.",
  ],
  saving_tips: [
    "You could save $150/month by cooking at home 3 more times per week instead of dining out.",
    "Setting up automatic transfers of $200/month to savings would help you reach your emergency fund goal 6 months faster.",
    "Your coffee shop visits cost $85/month. A good coffee maker could pay for itself in 2 months.",
  ],
  goal_advice: [
    "At your current savings rate, you'll reach your $5000 emergency fund goal in 8 months. Increase by $50/month to reach it in 6 months.",
    "Your vacation fund is growing well! You're on track to have $2000 by summer.",
    "Consider increasing your retirement contributions by 2% to take advantage of compound growth.",
  ]
};

// AI Service Functions
const getFinancialInsights = async (context: FinancialContext): Promise<AIInsight[]> => {
  const insights: AIInsight[] = [];
  
  // Spending analysis
  if (context.totalExpenses > context.totalIncome * 0.8) {
    insights.push({
      id: `insight-${Date.now()}-1`,
      type: 'spending_advice',
      title: 'High Spending Alert',
      content: `You're spending ${((context.totalExpenses / context.totalIncome) * 100).toFixed(1)}% of your income. Consider reducing expenses.`,
      confidence: 0.9,
      actionable: true,
      priority: 'high',
      createdAt: new Date().toISOString()
    });
  }
  
  // Budget suggestions
  if (context.budgetStatus.some(b => b.spent > b.budget)) {
    const exceededBudgets = context.budgetStatus.filter(b => b.spent > b.budget);
    insights.push({
      id: `insight-${Date.now()}-2`,
      type: 'budget_suggestion',
      title: 'Budget Exceeded',
      content: `You've exceeded budgets in ${exceededBudgets.length} categories: ${exceededBudgets.map(b => b.category).join(', ')}.`,
      confidence: 0.95,
      actionable: true,
      priority: 'high',
      createdAt: new Date().toISOString()
    });
  }
  
  // Savings advice
  if (context.savingsRate < 0.1) {
    insights.push({
      id: `insight-${Date.now()}-3`,
      type: 'saving_tip',
      title: 'Improve Savings Rate',
      content: `Your current savings rate is ${(context.savingsRate * 100).toFixed(1)}%. Aim for at least 10-20%.`,
      confidence: 0.8,
      actionable: true,
      priority: 'medium',
      createdAt: new Date().toISOString()
    });
  }
  
  return insights.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

export const chatWithAI = async (message: string, context: FinancialContext): Promise<string> => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('spending') || lowerMessage.includes('expenses')) {
    return MOCK_RESPONSES.spending_analysis[Math.floor(Math.random() * MOCK_RESPONSES.spending_analysis.length)];
  }
  
  if (lowerMessage.includes('budget')) {
    return MOCK_RESPONSES.budget_advice[Math.floor(Math.random() * MOCK_RESPONSES.budget_advice.length)];
  }
  
  if (lowerMessage.includes('save') || lowerMessage.includes('saving')) {
    return MOCK_RESPONSES.saving_tips[Math.floor(Math.random() * MOCK_RESPONSES.saving_tips.length)];
  }
  
  return "I can help you analyze your spending patterns, create budgets, and find saving opportunities. Try asking me about your spending, budget recommendations, or saving tips!";
};

export const prepareFinancialContext = async (): Promise<FinancialContext> => {
  const { getAllTransactions, getTransactionSummary, getTopCategories } = await import('./transactionService');
  const { getAllBudgets } = await import('./budgetService');
  
  const [transactions, summary, topCategories, budgets] = await Promise.all([
    getAllTransactions(),
    getTransactionSummary(),
    getTopCategories(5),
    getAllBudgets()
  ]);
  
  const recentTransactions = transactions.slice(0, 10);
  
  const budgetStatus = budgets.map(budget => ({
    category: budget.category,
    spent: budget.spent,
    budget: budget.amount
  }));
  
  return {
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    topCategories: topCategories.map(cat => ({ category: cat.category, amount: cat.amount })),
    budgetStatus,
    recentTransactions,
    savingsRate: summary.totalIncome > 0 ? (summary.totalIncome - summary.totalExpenses) / summary.totalIncome : 0,
    monthlyTrend: 'stable'
  };
};

const generateSpendingInsights = async (context: FinancialContext): Promise<string[]> => {
  return MOCK_RESPONSES.spending_analysis;
};

const suggestBudgetOptimizations = async (context: FinancialContext): Promise<string[]> => {
  return MOCK_RESPONSES.budget_advice;
};

const generateSavingRecommendations = async (context: FinancialContext): Promise<string[]> => {
  return MOCK_RESPONSES.saving_tips;
};

const callGeminiAPI = async (prompt: string, context?: any): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return "I've analyzed your data. You're doing well, but consider reducing your dining out expenses to save more.";
};
