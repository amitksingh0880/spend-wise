import type { Budget } from './budgetService';
import type { Transaction } from './transactionService';

export interface ReceiptLineItem {
  id: string;
  name: string;
  amount: number;
  quantity?: number;
  categoryHint?: string;
  confidence: number;
}

export interface SmartSplitTarget {
  id: string;
  type: 'person' | 'project' | 'category';
  name: string;
  weight: number;
}

export interface SmartSplitResult {
  lineItemId: string;
  splits: Array<{ targetId: string; amount: number }>;
}

export interface ReceiptOcrResult {
  vendor?: string;
  timestamp?: string;
  totalAmount?: number;
  taxAmount?: number;
  lineItems: ReceiptLineItem[];
  confidence: number;
}

export interface OfflineCopilotResponse {
  intent: 'unusual-spend' | 'top-categories' | 'budget-status' | 'unsupported';
  answer: string;
  data?: Record<string, unknown>;
}

export interface WhatIfImpact {
  category: string;
  baseline: number;
  percentChange: number;
  projected: number;
  delta: number;
}

export interface WhatIfSimulationResult {
  baselineTotal: number;
  projectedTotal: number;
  delta: number;
  impacts: WhatIfImpact[];
  assumptions: string[];
}

export interface TimelineDayPoint {
  date: string;
  total: number;
  txCount: number;
  isSpike: boolean;
}

export interface TimelineViewResult {
  month: string;
  heatmap: TimelineDayPoint[];
  recurringOutflows: Array<{ vendor: string; averageAmount: number; occurrences: number }>;
}

export interface ExplainableAnomalyReason {
  code: 'amount-zscore' | 'unusual-time' | 'unusual-vendor' | 'rapid-repeat';
  message: string;
  weight: number;
}

export interface ExplainableAnomaly {
  transactionId: string;
  score: number;
  reasons: ExplainableAnomalyReason[];
  summary: string;
}

export interface ContextualNudge {
  id: string;
  title: string;
  body: string;
  action: 'review-budget' | 'move-budget' | 'set-rule' | 'snooze';
  severity: 'low' | 'medium' | 'high';
}

export interface FeatureCapability {
  feature:
    | 'receipt-ocr-smart-split'
    | 'offline-copilot'
    | 'what-if-simulator'
    | 'calendar-timeline'
    | 'contextual-nudges'
    | 'automation-builder'
    | 'multi-vault'
    | 'explainable-anomaly'
    | 'home-widgets'
    | 'voice-offline-capture';
  status: 'ready' | 'scaffolded' | 'planned';
  notes: string;
}

const getTxDate = (tx: Transaction): Date => {
  if (tx.smsData?.timestamp) return new Date(tx.smsData.timestamp);
  return new Date(tx.createdAt);
};

const normalize = (value?: string): string => (value || '').trim().toLowerCase();

const groupExpenseByCategory = (transactions: Transaction[]): Record<string, number> => {
  return transactions
    .filter(tx => tx.type === 'expense')
    .reduce<Record<string, number>>((acc, tx) => {
      const category = normalize(tx.category) || 'other';
      acc[category] = (acc[category] || 0) + tx.amount;
      return acc;
    }, {});
};

const getThisWeekBounds = (): { start: Date; end: Date } => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;

  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getStdDev = (values: number[]): number => {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, n) => sum + n, 0) / values.length;
  const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

export const queryOfflineCopilot = async (
  question: string,
  transactions: Transaction[],
  budgets: Budget[] = []
): Promise<OfflineCopilotResponse> => {
  const lower = normalize(question);

  if (lower.includes('unusual') && lower.includes('food') && lower.includes('week')) {
    const { start, end } = getThisWeekBounds();
    const weeklyFood = transactions.filter(tx => {
      const date = getTxDate(tx);
      return (
        tx.type === 'expense' &&
        normalize(tx.category).includes('food') &&
        date >= start &&
        date <= end
      );
    });

    const amounts = weeklyFood.map(tx => tx.amount);
    const mean = amounts.length ? amounts.reduce((sum, n) => sum + n, 0) / amounts.length : 0;
    const stdDev = getStdDev(amounts);
    const unusual = weeklyFood.filter(tx => stdDev > 0 && Math.abs(tx.amount - mean) > 2 * stdDev);

    if (!unusual.length) {
      return {
        intent: 'unusual-spend',
        answer: 'No unusual food spends this week based on your current history.',
        data: { count: 0 },
      };
    }

    return {
      intent: 'unusual-spend',
      answer: `I found ${unusual.length} unusual food spend(s) this week. Highest was ${unusual[0].amount.toFixed(2)}.` ,
      data: {
        count: unusual.length,
        transactions: unusual.map(tx => ({ id: tx.id, amount: tx.amount, vendor: tx.vendor, createdAt: tx.createdAt })),
      },
    };
  }

  if (lower.includes('top') && (lower.includes('category') || lower.includes('categories'))) {
    const byCategory = Object.entries(groupExpenseByCategory(transactions))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      intent: 'top-categories',
      answer: byCategory.length
        ? `Top categories are ${byCategory.map(([cat]) => cat).join(', ')}.`
        : 'No expense data available yet.',
      data: { topCategories: byCategory },
    };
  }

  if (lower.includes('budget')) {
    const activeBudgets = budgets.filter(b => b.isActive);
    if (!activeBudgets.length) {
      return { intent: 'budget-status', answer: 'No active budgets found.', data: { activeBudgets: 0 } };
    }

    const over = activeBudgets.filter(b => b.spent > b.amount).length;
    const warning = activeBudgets.filter(b => b.spent / Math.max(1, b.amount) >= 0.8).length;

    return {
      intent: 'budget-status',
      answer: `You have ${activeBudgets.length} active budgets. ${over} exceeded and ${warning} in warning range.`,
      data: { activeBudgets: activeBudgets.length, over, warning },
    };
  }

  return {
    intent: 'unsupported',
    answer: 'I can currently help with unusual spends, top categories, and budget status queries offline.',
  };
};

export const simulateWhatIfScenario = async (
  scenario: string,
  transactions: Transaction[]
): Promise<WhatIfSimulationResult> => {
  const expenseByCategory = groupExpenseByCategory(transactions);
  const baselineTotal = Object.values(expenseByCategory).reduce((sum, n) => sum + n, 0);

  const parts = scenario.split(',').map(p => p.trim()).filter(Boolean);
  const parsed = parts
    .map(part => {
      const match = part.match(/^(.+?)\s*([+-]\d+(?:\.\d+)?)%$/i);
      if (!match) return null;
      return { categoryInput: normalize(match[1]), percentChange: Number(match[2]) };
    })
    .filter((item): item is { categoryInput: string; percentChange: number } => !!item);

  const impacts: WhatIfImpact[] = [];
  const assumptions: string[] = [];

  for (const item of parsed) {
    const matchedCategory = Object.keys(expenseByCategory).find(cat =>
      cat.includes(item.categoryInput) || item.categoryInput.includes(cat)
    );

    if (!matchedCategory) {
      assumptions.push(`No category match found for "${item.categoryInput}".`);
      continue;
    }

    const baseline = expenseByCategory[matchedCategory] || 0;
    const projected = baseline * (1 + item.percentChange / 100);
    const delta = projected - baseline;

    impacts.push({
      category: matchedCategory,
      baseline,
      percentChange: item.percentChange,
      projected,
      delta,
    });
  }

  const projectedTotal = baselineTotal + impacts.reduce((sum, item) => sum + item.delta, 0);

  return {
    baselineTotal,
    projectedTotal,
    delta: projectedTotal - baselineTotal,
    impacts,
    assumptions,
  };
};

export const buildCalendarTimelineView = async (
  transactions: Transaction[],
  month: string = new Date().toISOString().slice(0, 7)
): Promise<TimelineViewResult> => {
  const monthly = transactions.filter(tx => getTxDate(tx).toISOString().slice(0, 7) === month);
  const byDay: Record<string, { total: number; txCount: number }> = {};

  for (const tx of monthly) {
    if (tx.type !== 'expense') continue;
    const day = getTxDate(tx).toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = { total: 0, txCount: 0 };
    byDay[day].total += tx.amount;
    byDay[day].txCount += 1;
  }

  const totals = Object.values(byDay).map(v => v.total);
  const mean = totals.length ? totals.reduce((sum, n) => sum + n, 0) / totals.length : 0;
  const stdDev = getStdDev(totals);

  const heatmap: TimelineDayPoint[] = Object.entries(byDay)
    .map(([date, stats]) => ({
      date,
      total: stats.total,
      txCount: stats.txCount,
      isSpike: stdDev > 0 && stats.total > mean + 1.5 * stdDev,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const vendorCounts: Record<string, { total: number; count: number }> = {};
  for (const tx of monthly) {
    if (tx.type !== 'expense') continue;
    const key = normalize(tx.vendor) || 'unknown';
    if (!vendorCounts[key]) vendorCounts[key] = { total: 0, count: 0 };
    vendorCounts[key].total += tx.amount;
    vendorCounts[key].count += 1;
  }

  const recurringOutflows = Object.entries(vendorCounts)
    .filter(([, stats]) => stats.count >= 3)
    .map(([vendor, stats]) => ({
      vendor,
      averageAmount: stats.total / stats.count,
      occurrences: stats.count,
    }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 10);

  return { month, heatmap, recurringOutflows };
};

export const scoreExplainableAnomalies = async (transactions: Transaction[]): Promise<ExplainableAnomaly[]> => {
  const expenses = transactions.filter(tx => tx.type === 'expense');
  const byCategory: Record<string, number[]> = {};

  for (const tx of expenses) {
    const category = normalize(tx.category) || 'other';
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(tx.amount);
  }

  const results: ExplainableAnomaly[] = [];

  for (const tx of expenses) {
    const reasons: ExplainableAnomalyReason[] = [];
    const category = normalize(tx.category) || 'other';
    const amounts = byCategory[category] || [];

    if (amounts.length >= 3) {
      const mean = amounts.reduce((sum, n) => sum + n, 0) / amounts.length;
      const stdDev = getStdDev(amounts);
      if (stdDev > 0) {
        const z = Math.abs((tx.amount - mean) / stdDev);
        if (z >= 2) {
          reasons.push({
            code: 'amount-zscore',
            message: `Amount is ${z.toFixed(1)}x away from your ${category} norm.`,
            weight: Math.min(60, z * 15),
          });
        }
      }
    }

    const hour = getTxDate(tx).getHours();
    if (hour <= 5 || hour >= 23) {
      reasons.push({
        code: 'unusual-time',
        message: `Transaction happened at unusual time (${hour}:00).`,
        weight: 20,
      });
    }

    const vendorCount = expenses.filter(item => normalize(item.vendor) === normalize(tx.vendor)).length;
    if (vendorCount <= 1) {
      reasons.push({
        code: 'unusual-vendor',
        message: 'Vendor is rarely seen in your history.',
        weight: 15,
      });
    }

    const txTime = getTxDate(tx).getTime();
    const rapidRepeats = expenses.filter(item => {
      if (item.id === tx.id) return false;
      const delta = Math.abs(getTxDate(item).getTime() - txTime);
      return normalize(item.vendor) === normalize(tx.vendor) && delta <= 30 * 60 * 1000;
    }).length;

    if (rapidRepeats >= 2) {
      reasons.push({
        code: 'rapid-repeat',
        message: `${rapidRepeats + 1} similar vendor transactions happened within 30 minutes.`,
        weight: 20,
      });
    }

    const score = Math.min(100, reasons.reduce((sum, r) => sum + r.weight, 0));
    if (score < 35) continue;

    results.push({
      transactionId: tx.id,
      score,
      reasons,
      summary: reasons.map(reason => reason.message).join(' '),
    });
  }

  return results.sort((a, b) => b.score - a.score);
};

export const generateContextualNudges = async (
  transactions: Transaction[],
  budgets: Budget[]
): Promise<ContextualNudge[]> => {
  const nudges: ContextualNudge[] = [];
  const today = new Date().toISOString().slice(0, 10);

  const todaySpend = transactions
    .filter(tx => tx.type === 'expense' && getTxDate(tx).toISOString().slice(0, 10) === today)
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (todaySpend > 0) {
    nudges.push({
      id: `today-spend-${today}`,
      title: 'Daily spend check',
      body: `You have spent ${todaySpend.toFixed(2)} today. Consider reviewing your top expense category.`,
      action: 'review-budget',
      severity: todaySpend > 1000 ? 'high' : 'medium',
    });
  }

  for (const budget of budgets.filter(b => b.isActive)) {
    const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
    if (percent >= 90) {
      nudges.push({
        id: `budget-${budget.id}`,
        title: `${budget.category} budget risk`,
        body: `You're at ${percent.toFixed(0)}% of your ${budget.category} budget.`,
        action: 'move-budget',
        severity: percent >= 100 ? 'high' : 'medium',
      });
    }
  }

  return nudges;
};

export const getModernFeatureCapabilityMatrix = (): FeatureCapability[] => {
  return [
    {
      feature: 'receipt-ocr-smart-split',
      status: 'scaffolded',
      notes: 'Types and split models ready; OCR adapter needs platform implementation.',
    },
    {
      feature: 'offline-copilot',
      status: 'ready',
      notes: 'Local intent handling for unusual spends, top categories, and budget status.',
    },
    {
      feature: 'what-if-simulator',
      status: 'ready',
      notes: 'Scenario parsing and impact simulation available for category % changes.',
    },
    {
      feature: 'calendar-timeline',
      status: 'ready',
      notes: 'Heatmap and recurring outflow timeline dataset generation is available.',
    },
    {
      feature: 'contextual-nudges',
      status: 'ready',
      notes: 'Nudge generation available from transaction and budget context.',
    },
    {
      feature: 'automation-builder',
      status: 'scaffolded',
      notes: 'Rules backend exists; visual builder UX can now be expanded.',
    },
    {
      feature: 'multi-vault',
      status: 'planned',
      notes: 'Requires vault-level storage key partitioning and encryption lifecycle.',
    },
    {
      feature: 'explainable-anomaly',
      status: 'ready',
      notes: 'Scoring engine returns explicit reasons and summaries.',
    },
    {
      feature: 'home-widgets',
      status: 'planned',
      notes: 'Needs platform widget extension and shared local data bridge.',
    },
    {
      feature: 'voice-offline-capture',
      status: 'planned',
      notes: 'Requires offline transcription provider + command parser.',
    },
  ];
};
