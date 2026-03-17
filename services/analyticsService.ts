import { Budget, getAllBudgets } from './budgetService';
import { getAllTransactions, Transaction } from './transactionService';

export interface FinancialInsight {
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

export interface SpendingPattern {
  category: string;
  averageMonthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  seasonality: {
    month: string;
    amount: number;
  }[];
  peakSpendingDay: string;
  unusualSpending: {
    date: string;
    amount: number;
    deviation: number;
  }[];
}

export interface FinancialHealth {
  score: number; // 0-100
  factors: {
    savingsRate: { score: number; value: number; benchmark: number };
    budgetAdherence: { score: number; value: number; benchmark: number };
    expenseVariability: { score: number; value: number; benchmark: number };
    categoryDiversification: { score: number; value: number; benchmark: number };
  };
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CashFlowAnalysis {
  netCashFlow: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  cashFlowTrend: 'positive' | 'negative' | 'volatile';
  monthlyBreakdown: {
    month: string;
    income: number;
    expenses: number;
    netFlow: number;
  }[];
  projectedBalance: {
    nextMonth: number;
    next3Months: number;
    next6Months: number;
  };
}

export interface GoalProgress {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  estimatedCompletionDate: string;
  monthlyContribution: number;
  recommendedContribution: number;
  onTrack: boolean;
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

// Spending Pattern Analysis
export const analyzeSpendingPatternsByCategory = async (): Promise<SpendingPattern[]> => {
  const transactions = await getAllTransactions();
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const categories = [...new Set(expenses.map(tx => tx.category))];
  const patterns: SpendingPattern[] = [];
  
  for (const category of categories) {
    const categoryExpenses = expenses.filter(tx => tx.category === category);
    
    // Calculate monthly averages
    const monthlyTotals: { [month: string]: number } = {};
    categoryExpenses.forEach(tx => {
      const month = new Date(tx.createdAt).toISOString().substring(0, 7);
      monthlyTotals[month] = (monthlyTotals[month] || 0) + tx.amount;
    });
    
    const months = Object.keys(monthlyTotals).sort();
    const averageMonthly = Object.values(monthlyTotals).reduce((a, b) => a + b, 0) / months.length;
    
    // Calculate trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let trendPercentage = 0;
    
    if (months.length >= 3) {
      const recent = monthlyTotals[months[months.length - 1]];
      const older = monthlyTotals[months[months.length - 3]];
      trendPercentage = ((recent - older) / older) * 100;
      
      if (trendPercentage > 10) trend = 'increasing';
      else if (trendPercentage < -10) trend = 'decreasing';
    }
    
    // Seasonality analysis
    const seasonality = months.map(month => ({
      month,
      amount: monthlyTotals[month]
    }));
    
    // Peak spending day analysis
    const dayTotals: { [day: string]: number } = {};
    categoryExpenses.forEach(tx => {
      const day = new Date(tx.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
      dayTotals[day] = (dayTotals[day] || 0) + tx.amount;
    });
    
    const peakSpendingDay = Object.entries(dayTotals)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
    
    // Unusual spending detection
    const amounts = categoryExpenses.map(tx => tx.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / amounts.length);
    
    const unusualSpending = categoryExpenses
      .filter(tx => Math.abs(tx.amount - mean) > 2 * stdDev)
      .map(tx => ({
        date: tx.createdAt,
        amount: tx.amount,
        deviation: Math.abs(tx.amount - mean) / stdDev
      }))
      .sort((a, b) => b.deviation - a.deviation)
      .slice(0, 5);
    
    patterns.push({
      category,
      averageMonthly,
      trend,
      trendPercentage,
      seasonality,
      peakSpendingDay,
      unusualSpending
    });
  }
  
  return patterns.sort((a, b) => b.averageMonthly - a.averageMonthly);
};

// Financial Health Score
export const calculateFinancialHealthScore = async (): Promise<FinancialHealth> => {
  const transactions = await getAllTransactions();
  const budgets = await getAllBudgets();
  
  const income = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = income.reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = expenses.reduce((sum, tx) => sum + tx.amount, 0);
  
  // Calculate factors
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const savingsScore = Math.min(100, Math.max(0, (savingsRate / 20) * 100)); // 20% savings rate = 100 score
  
  // Budget adherence
  let budgetAdherence = 100;
  if (budgets.length > 0) {
    const adherenceRates = budgets.map(budget => {
      const categoryExpenses = expenses
        .filter(tx => tx.category === budget.category)
        .reduce((sum, tx) => sum + tx.amount, 0);
      return Math.min(100, (budget.amount / Math.max(categoryExpenses, 1)) * 100);
    });
    budgetAdherence = adherenceRates.reduce((a, b) => a + b, 0) / adherenceRates.length;
  }
  
  // Expense variability
  const monthlyExpenses: number[] = [];
  const monthlyTotals: { [month: string]: number } = {};
  expenses.forEach(tx => {
    const month = new Date(tx.createdAt).toISOString().substring(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + tx.amount;
  });
  
  const expenseAmounts = Object.values(monthlyTotals);
  const avgExpense = expenseAmounts.reduce((a, b) => a + b, 0) / expenseAmounts.length;
  const expenseVariability = expenseAmounts.length > 1 
    ? Math.sqrt(expenseAmounts.reduce((sq, n) => sq + Math.pow(n - avgExpense, 2), 0) / expenseAmounts.length) / avgExpense * 100
    : 0;
  const variabilityScore = Math.max(0, 100 - expenseVariability * 2);
  
  // Category diversification
  const categories = [...new Set(expenses.map(tx => tx.category))];
  const diversificationScore = Math.min(100, (categories.length / 8) * 100); // 8 categories = 100 score
  
  const overallScore = (savingsScore + budgetAdherence + variabilityScore + diversificationScore) / 4;
  
  const recommendations: string[] = [];
  if (savingsScore < 50) recommendations.push('Increase your savings rate to at least 10-20% of income');
  if (budgetAdherence < 70) recommendations.push('Improve budget adherence by tracking expenses more closely');
  if (variabilityScore < 60) recommendations.push('Work on stabilizing your monthly expenses');
  if (diversificationScore < 50) recommendations.push('Consider diversifying your spending across more categories');
  
  const riskLevel: 'low' | 'medium' | 'high' = 
    overallScore >= 70 ? 'low' : overallScore >= 40 ? 'medium' : 'high';
  
  return {
    score: Math.round(overallScore),
    factors: {
      savingsRate: { score: Math.round(savingsScore), value: savingsRate, benchmark: 20 },
      budgetAdherence: { score: Math.round(budgetAdherence), value: budgetAdherence, benchmark: 90 },
      expenseVariability: { score: Math.round(variabilityScore), value: expenseVariability, benchmark: 20 },
      categoryDiversification: { score: Math.round(diversificationScore), value: categories.length, benchmark: 8 }
    },
    recommendations,
    riskLevel
  };
};

// Cash Flow Analysis
export const analyzeCashFlow = async (): Promise<CashFlowAnalysis> => {
  const transactions = await getAllTransactions();
  
  const monthlyData: { [month: string]: { income: number; expenses: number } } = {};
  
  transactions.forEach(tx => {
    const month = new Date(tx.createdAt).toISOString().substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expenses: 0 };
    }
    
    if (tx.type === 'income') {
      monthlyData[month].income += tx.amount;
    } else {
      monthlyData[month].expenses += tx.amount;
    }
  });
  
  const months = Object.keys(monthlyData).sort();
  const monthlyBreakdown = months.map(month => ({
    month,
    income: monthlyData[month].income,
    expenses: monthlyData[month].expenses,
    netFlow: monthlyData[month].income - monthlyData[month].expenses
  }));
  
  const averageMonthlyIncome = monthlyBreakdown.reduce((sum, m) => sum + m.income, 0) / monthlyBreakdown.length;
  const averageMonthlyExpenses = monthlyBreakdown.reduce((sum, m) => sum + m.expenses, 0) / monthlyBreakdown.length;
  const netCashFlow = averageMonthlyIncome - averageMonthlyExpenses;
  
  // Determine trend
  let cashFlowTrend: 'positive' | 'negative' | 'volatile' = 'positive';
  if (monthlyBreakdown.length >= 3) {
    const recentFlows = monthlyBreakdown.slice(-3).map(m => m.netFlow);
    const positiveMonths = recentFlows.filter(flow => flow > 0).length;
    
    if (positiveMonths === 0) cashFlowTrend = 'negative';
    else if (positiveMonths === 3) cashFlowTrend = 'positive';
    else cashFlowTrend = 'volatile';
  }
  
  // Project future balance
  const currentBalance = monthlyBreakdown.reduce((sum, m) => sum + m.netFlow, 0);
  
  return {
    netCashFlow,
    averageMonthlyIncome,
    averageMonthlyExpenses,
    cashFlowTrend,
    monthlyBreakdown,
    projectedBalance: {
      nextMonth: currentBalance + netCashFlow,
      next3Months: currentBalance + (netCashFlow * 3),
      next6Months: currentBalance + (netCashFlow * 6)
    }
  };
};

// Export and Reporting
export const generateFinancialReport = async (period: 'monthly' | 'quarterly' | 'yearly' = 'monthly'): Promise<{
  period: string;
  summary: any;
  insights: FinancialInsight[];
  healthScore: FinancialHealth;
  cashFlow: CashFlowAnalysis;
  spendingPatterns: SpendingPattern[];
}> => {
  const [insights, healthScore, cashFlow, spendingPatterns] = await Promise.all([
    generateFinancialInsights(),
    calculateFinancialHealthScore(),
    analyzeCashFlow(),
    analyzeSpendingPatternsByCategory()
  ]);
  
  const transactions = await getAllTransactions();
  const income = transactions.filter(t => t.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
  
  return {
    period: `${period} - ${new Date().toISOString().substring(0, 7)}`,
    summary: {
      totalIncome: income,
      totalExpenses: expenses,
      netAmount: income - expenses,
      transactionCount: transactions.length
    },
    insights,
    healthScore,
    cashFlow,
    spendingPatterns
  };
};

