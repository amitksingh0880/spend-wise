import { Budget, getAllBudgets } from './budgetService';
import { getAllTransactions, Transaction } from './transactionService';

interface FinancialInsight {
  id: string;
  type: 'spending_pattern' | 'budget_recommendation' | 'saving_opportunity' | 'trend_analysis';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestion?: string;
  data?: any;
  createdAt: string;
}



// Core Analytics Functions
export const generateFinancialInsights = async (): Promise<FinancialInsight[]> => {
  const transactions = await getAllTransactions();
  const budgets = await getAllBudgets();
  const insights: FinancialInsight[] = [];
  
  // Analyze spending patterns
  const spendingInsights = await analyzeSpendingPatterns(transactions);
  insights.push(...spendingInsights);
  
  // Budget analysis
  const budgetInsights = await analyzeBudgetPerformance(transactions, budgets);
  insights.push(...budgetInsights);
  
  // Saving opportunities
  const savingInsights = await identifySavingOpportunities(transactions);
  insights.push(...savingInsights);
  
  // Trend analysis
  const trendInsights = await analyzeTrends(transactions);
  insights.push(...trendInsights);
  
  return insights.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    return impactOrder[b.impact] - impactOrder[a.impact];
  });
};

const analyzeSpendingPatterns = async (transactions: Transaction[]): Promise<FinancialInsight[]> => {
  const insights: FinancialInsight[] = [];
  const expenses = transactions.filter(t => t.type === 'expense');
  
  // Find top spending categories
  const categoryTotals: { [key: string]: number } = {};
  expenses.forEach(tx => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });
  
  const topCategory = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (topCategory) {
    const [category, amount] = topCategory;
    const totalExpenses = expenses.reduce((sum, tx) => sum + tx.amount, 0);
    const percentage = (amount / totalExpenses) * 100;
    
    if (percentage > 30) {
      insights.push({
        id: `spending-concentration-${Date.now()}`,
        type: 'spending_pattern',
        title: 'High Spending Concentration',
        description: `${percentage.toFixed(1)}% of your expenses are in ${category}`,
        impact: 'medium',
        actionable: true,
        suggestion: `Consider reviewing your ${category} spending for potential savings`,
        data: { category, amount, percentage },
        createdAt: new Date().toISOString()
      });
    }
  }
  
  return insights;
};

const analyzeBudgetPerformance = async (transactions: Transaction[], budgets: Budget[]): Promise<FinancialInsight[]> => {
  const insights: FinancialInsight[] = [];
  
  for (const budget of budgets) {
    const categoryExpenses = transactions
      .filter(tx => tx.type === 'expense' && tx.category === budget.category)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const utilizationRate = (categoryExpenses / budget.amount) * 100;
    
    if (utilizationRate > 90) {
      insights.push({
        id: `budget-exceeded-${budget.id}`,
        type: 'budget_recommendation',
        title: 'Budget Nearly Exceeded',
        description: `Your ${budget.category} budget is ${utilizationRate.toFixed(1)}% utilized`,
        impact: 'high',
        actionable: true,
        suggestion: `Consider reducing ${budget.category} spending or increasing the budget`,
        data: { budgetId: budget.id, utilizationRate },
        createdAt: new Date().toISOString()
      });
    } else if (utilizationRate < 50) {
      insights.push({
        id: `budget-underutilized-${budget.id}`,
        type: 'budget_recommendation',
        title: 'Budget Underutilized',
        description: `Your ${budget.category} budget is only ${utilizationRate.toFixed(1)}% utilized`,
        impact: 'low',
        actionable: true,
        suggestion: `Consider reallocating funds from ${budget.category} to other categories`,
        data: { budgetId: budget.id, utilizationRate },
        createdAt: new Date().toISOString()
      });
    }
  }
  
  return insights;
};

const identifySavingOpportunities = async (transactions: Transaction[]): Promise<FinancialInsight[]> => {
  const insights: FinancialInsight[] = [];
  const expenses = transactions.filter(t => t.type === 'expense');
  
  // Identify recurring subscriptions
  const vendorFrequency: { [vendor: string]: number } = {};
  expenses.forEach(tx => {
    vendorFrequency[tx.vendor] = (vendorFrequency[tx.vendor] || 0) + 1;
  });
  
  const recurringVendors = Object.entries(vendorFrequency)
    .filter(([, count]) => count >= 3)
    .map(([vendor]) => vendor);
  
  if (recurringVendors.length > 0) {
    const totalRecurring = expenses
      .filter(tx => recurringVendors.includes(tx.vendor))
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    insights.push({
      id: `recurring-subscriptions-${Date.now()}`,
      type: 'saving_opportunity',
      title: 'Review Recurring Subscriptions',
      description: `You have ${recurringVendors.length} recurring vendors totaling $${totalRecurring.toFixed(2)}`,
      impact: 'medium',
      actionable: true,
      suggestion: 'Review and cancel unused subscriptions to save money',
      data: { vendors: recurringVendors, totalAmount: totalRecurring },
      createdAt: new Date().toISOString()
    });
  }
  
  return insights;
};

const analyzeTrends = async (transactions: Transaction[]): Promise<FinancialInsight[]> => {
  const insights: FinancialInsight[] = [];
  
  // Analyze monthly spending trend
  const monthlySpending: { [month: string]: number } = {};
  const expenses = transactions.filter(t => t.type === 'expense');
  
  expenses.forEach(tx => {
    const month = new Date(tx.createdAt).toISOString().substring(0, 7); // YYYY-MM
    monthlySpending[month] = (monthlySpending[month] || 0) + tx.amount;
  });
  
  const months = Object.keys(monthlySpending).sort();
  if (months.length >= 3) {
    const recent = monthlySpending[months[months.length - 1]];
    const previous = monthlySpending[months[months.length - 2]];
    const change = ((recent - previous) / previous) * 100;
    
    if (Math.abs(change) > 20) {
      insights.push({
        id: `spending-trend-${Date.now()}`,
        type: 'trend_analysis',
        title: change > 0 ? 'Spending Increased' : 'Spending Decreased',
        description: `Your spending ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% this month`,
        impact: Math.abs(change) > 50 ? 'high' : 'medium',
        actionable: true,
        suggestion: change > 0 ? 'Review recent expenses to identify the cause' : 'Great job reducing your spending!',
        data: { change, recent, previous },
        createdAt: new Date().toISOString()
      });
    }
  }
  
  return insights;
};

