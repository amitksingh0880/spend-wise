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
export const getFinancialInsights = async (context: FinancialContext): Promise<AIInsight[]> => {
  // In a real implementation, this would call the Gemini API
  // For now, we'll generate mock insights based on the context
  
  const insights: AIInsight[] = [];
  
  // Spending analysis
  if (context.totalExpenses > context.totalIncome * 0.8) {
    insights.push({
      id: `insight-${Date.now()}-1`,
      type: 'spending_advice',
      title: 'High Spending Alert',
      content: `You're spending ${((context.totalExpenses / context.totalIncome) * 100).toFixed(1)}% of your income. Consider reducing expenses in your top spending categories.`,
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
      content: `You've exceeded budgets in ${exceededBudgets.length} categories: ${exceededBudgets.map(b => b.category).join(', ')}. Consider adjusting these budgets or reducing spending.`,
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
      content: `Your current savings rate is ${(context.savingsRate * 100).toFixed(1)}%. Aim for at least 10-20% by reducing expenses in your top spending categories.`,
      confidence: 0.8,
      actionable: true,
      priority: 'medium',
      createdAt: new Date().toISOString()
    });
  }
  
  // Trend analysis
  if (context.monthlyTrend === 'increasing') {
    insights.push({
      id: `insight-${Date.now()}-4`,
      type: 'trend_analysis',
      title: 'Spending Trend Alert',
      content: 'Your spending has been increasing over the past few months. Review your recent transactions to identify the cause and take corrective action.',
      confidence: 0.85,
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
  // In a real implementation, this would call the Gemini API with the user's message and financial context
  // For now, we'll provide mock responses based on keywords
  
  const lowerMessage = message.toLowerCase();
  
  // Spending analysis queries
  if (lowerMessage.includes('spending') || lowerMessage.includes('expenses')) {
    const responses = MOCK_RESPONSES.spending_analysis;
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Budget queries
  if (lowerMessage.includes('budget')) {
    const responses = MOCK_RESPONSES.budget_advice;
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Saving queries
  if (lowerMessage.includes('save') || lowerMessage.includes('saving')) {
    const responses = MOCK_RESPONSES.saving_tips;
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Goal queries
  if (lowerMessage.includes('goal') || lowerMessage.includes('target')) {
    const responses = MOCK_RESPONSES.goal_advice;
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Category-specific queries
  if (lowerMessage.includes('food') || lowerMessage.includes('dining')) {
    return `Your food and dining expenses are $${context.topCategories.find(c => c.category.toLowerCase().includes('food'))?.amount.toFixed(2) || '0'} this month. Consider meal planning and cooking at home more often to reduce costs.`;
  }
  
  if (lowerMessage.includes('transport')) {
    return `Your transportation costs are $${context.topCategories.find(c => c.category.toLowerCase().includes('transport'))?.amount.toFixed(2) || '0'} this month. Look into carpooling, public transport, or walking/biking for short trips.`;
  }
  
  // General financial advice
  if (lowerMessage.includes('advice') || lowerMessage.includes('tip')) {
    const allResponses = [
      ...MOCK_RESPONSES.spending_analysis,
      ...MOCK_RESPONSES.budget_advice,
      ...MOCK_RESPONSES.saving_tips,
      ...MOCK_RESPONSES.goal_advice
    ];
    return allResponses[Math.floor(Math.random() * allResponses.length)];
  }
  
  // Income vs expenses
  if (lowerMessage.includes('income') || lowerMessage.includes('earn')) {
    const savingsRate = ((context.totalIncome - context.totalExpenses) / context.totalIncome) * 100;
    return `Your income is $${context.totalIncome.toFixed(2)} and expenses are $${context.totalExpenses.toFixed(2)}, giving you a savings rate of ${savingsRate.toFixed(1)}%. ${savingsRate < 10 ? 'Try to increase this to at least 10-20%.' : 'Great job maintaining a healthy savings rate!'}`;
  }
  
  // Default response
  return "I can help you analyze your spending patterns, create budgets, find saving opportunities, and provide personalized financial advice. Try asking me about your spending in specific categories, budget recommendations, or saving tips!";
};

export const generateSpendingInsights = async (transactions: any[]): Promise<string[]> => {
  const insights: string[] = [];
  
  // Analyze spending patterns
  const categoryTotals: { [key: string]: number } = {};
  const vendorFrequency: { [key: string]: number } = {};
  
  transactions.forEach(tx => {
    if (tx.type === 'expense') {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
      vendorFrequency[tx.vendor] = (vendorFrequency[tx.vendor] || 0) + 1;
    }
  });
  
  // Top spending category
  const topCategory = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (topCategory) {
    const [category, amount] = topCategory;
    insights.push(`Your highest spending category is ${category} at $${amount.toFixed(2)}.`);
  }
  
  // Frequent vendors
  const frequentVendors = Object.entries(vendorFrequency)
    .filter(([,count]) => count >= 3)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);
  
  if (frequentVendors.length > 0) {
    insights.push(`You frequently shop at: ${frequentVendors.map(([vendor]) => vendor).join(', ')}.`);
  }
  
  // Recent spending trend
  const last7Days = transactions.filter(tx => {
    const txDate = new Date(tx.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return txDate >= weekAgo && tx.type === 'expense';
  });
  
  const weeklySpending = last7Days.reduce((sum, tx) => sum + tx.amount, 0);
  insights.push(`You've spent $${weeklySpending.toFixed(2)} in the last 7 days.`);
  
  return insights;
};

export const suggestBudgetOptimizations = async (budgets: any[], transactions: any[]): Promise<string[]> => {
  const suggestions: string[] = [];
  
  for (const budget of budgets) {
    const categorySpending = transactions
      .filter(tx => tx.type === 'expense' && tx.category === budget.category)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const utilizationRate = (categorySpending / budget.amount) * 100;
    
    if (utilizationRate > 90) {
      suggestions.push(`Consider increasing your ${budget.category} budget or reducing spending in this category.`);
    } else if (utilizationRate < 50) {
      suggestions.push(`Your ${budget.category} budget seems too high. Consider reallocating funds to other categories.`);
    }
  }
  
  return suggestions;
};

export const generateSavingRecommendations = async (context: FinancialContext): Promise<string[]> => {
  const recommendations: string[] = [];
  
  // High spending categories
  const topSpendingCategories = context.topCategories.slice(0, 3);
  
  topSpendingCategories.forEach(category => {
    if (category.category.toLowerCase().includes('food') || category.category.toLowerCase().includes('dining')) {
      recommendations.push(`Reduce dining out expenses by meal planning and cooking at home. Potential savings: $${(category.amount * 0.3).toFixed(2)}/month.`);
    } else if (category.category.toLowerCase().includes('shopping')) {
      recommendations.push(`Implement a 24-hour waiting period for non-essential purchases. Potential savings: $${(category.amount * 0.2).toFixed(2)}/month.`);
    } else if (category.category.toLowerCase().includes('entertainment')) {
      recommendations.push(`Look for free or low-cost entertainment alternatives. Potential savings: $${(category.amount * 0.25).toFixed(2)}/month.`);
    }
  });
  
  // Subscription optimization
  recommendations.push("Review all recurring subscriptions and cancel unused ones. This could save $20-50/month on average.");
  
  // Automatic savings
  if (context.savingsRate < 0.15) {
    const suggestedSavings = Math.min(context.totalIncome * 0.1, 200);
    recommendations.push(`Set up automatic transfers of $${suggestedSavings.toFixed(0)}/month to your savings account.`);
  }
  
  return recommendations;
};

// Utility functions for AI integration
export const prepareFinancialContext = async (): Promise<FinancialContext> => {
  const { getAllTransactions, getTransactionSummary, getTopCategories } = await import('./transactionService');
  const { getAllBudgets } = await import('./budgetService');
  
  const [transactions, summary, topCategories, budgets] = await Promise.all([
    getAllTransactions(),
    getTransactionSummary(),
    getTopCategories(5),
    getAllBudgets()
  ]);
  
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  
  const budgetStatus = budgets.map(budget => ({
    category: budget.category,
    spent: budget.spent,
    budget: budget.amount
  }));
  
  // Calculate monthly trend
  const monthlyTotals: { [month: string]: number } = {};
  transactions.filter(tx => tx.type === 'expense').forEach(tx => {
    const month = new Date(tx.createdAt).toISOString().substring(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + tx.amount;
  });
  
  const months = Object.keys(monthlyTotals).sort();
  let monthlyTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  
  if (months.length >= 2) {
    const recent = monthlyTotals[months[months.length - 1]];
    const previous = monthlyTotals[months[months.length - 2]];
    const change = ((recent - previous) / previous) * 100;
    
    if (change > 10) monthlyTrend = 'increasing';
    else if (change < -10) monthlyTrend = 'decreasing';
  }
  
  return {
    totalIncome: summary.totalIncome,
    totalExpenses: summary.totalExpenses,
    topCategories: topCategories.map(cat => ({ category: cat.category, amount: cat.amount })),
    budgetStatus,
    recentTransactions,
    savingsRate: summary.totalIncome > 0 ? (summary.totalIncome - summary.totalExpenses) / summary.totalIncome : 0,
    monthlyTrend
  };
};

// Mock function to simulate Gemini API call
// In production, replace this with actual Gemini API integration
export const callGeminiAPI = async (prompt: string, context?: any): Promise<string> => {
  // This is where you would integrate with Google's Gemini API
  // For now, return a mock response
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  
  return "This is a mock response. In production, this would be replaced with actual Gemini API integration to provide personalized financial insights based on your spending data.";
};

export const formatPromptForGemini = (userMessage: string, context: FinancialContext): string => {
  return `
    You are a personal finance AI assistant. Based on the user's financial data and question, provide helpful, actionable advice.
    
    User's Financial Context:
    - Total Income: $${context.totalIncome.toFixed(2)}
    - Total Expenses: $${context.totalExpenses.toFixed(2)}
    - Savings Rate: ${(context.savingsRate * 100).toFixed(1)}%
    - Top Spending Categories: ${context.topCategories.map(c => `${c.category}: $${c.amount.toFixed(2)}`).join(', ')}
    - Monthly Trend: ${context.monthlyTrend}
    
    User's Question: ${userMessage}
    
    Please provide a helpful, personalized response with specific actionable advice based on their financial situation.
  `;
};

