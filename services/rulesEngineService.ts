import { readJson, writeJson } from '@/libs/storage';
import { uuidv4 } from '@/utils/uuid';
import type { Transaction } from './transactionService';

export type RuleOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte' | 'between';

export interface RuleOccurrenceCondition {
  count: number;
  days: number;
  amountTolerance?: number;
  sameVendor?: boolean;
}

export interface SmartRule {
  id: string;
  name?: string;
  field: 'vendor' | 'description' | 'sender' | 'amount';
  operator: RuleOperator;
  value: string;
  typeFilter?: 'income' | 'expense' | 'both';
  daysOfWeek?: number[];
  keywordAny?: string[];
  occurrence?: RuleOccurrenceCondition;
  priority?: number;
  setCategory?: string;
  setTags?: string[];
  setType?: 'income' | 'expense';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const SMART_RULES_KEY = 'smart_rules';

const getTransactionDate = (tx: Pick<Transaction, 'createdAt' | 'smsData'>): Date => {
  if (tx.smsData?.timestamp) return new Date(tx.smsData.timestamp);
  return new Date(tx.createdAt);
};

const parseBetweenRange = (value: string): { min: number; max: number } | null => {
  const normalized = (value || '').trim();
  if (!normalized) return null;

  const match = normalized.match(/^\s*(-?\d+(?:\.\d+)?)\s*[-:,]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;

  const first = Number(match[1]);
  const second = Number(match[2]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
};

const evaluateAmountRule = (rule: SmartRule, tx: Transaction): boolean => {
  const target = Number(rule.value);
  const amount = tx.amount;

  switch (rule.operator) {
    case 'gt':
      return Number.isFinite(target) && amount > target;
    case 'gte':
      return Number.isFinite(target) && amount >= target;
    case 'lt':
      return Number.isFinite(target) && amount < target;
    case 'lte':
      return Number.isFinite(target) && amount <= target;
    case 'equals':
      return Number.isFinite(target) && Math.abs(amount - target) < 0.0001;
    case 'between': {
      const range = parseBetweenRange(rule.value);
      if (!range) return false;
      return amount >= range.min && amount <= range.max;
    }
    default:
      return false;
  }
};

const evaluateTextRule = (rule: SmartRule, tx: Transaction): boolean => {
  const candidate = rule.field === 'vendor'
    ? tx.vendor || ''
    : rule.field === 'description'
      ? tx.description || ''
      : tx.smsData?.sender || '';

  const left = candidate.toLowerCase();
  const right = (rule.value || '').toLowerCase();

  switch (rule.operator) {
    case 'contains':
      return left.includes(right);
    case 'equals':
      return left === right;
    case 'startsWith':
      return left.startsWith(right);
    case 'endsWith':
      return left.endsWith(right);
    default:
      return false;
  }
};

const matchesKeywordConstraint = (rule: SmartRule, tx: Transaction): boolean => {
  if (!rule.keywordAny?.length) return true;

  const haystack = [
    tx.vendor || '',
    tx.description || '',
    tx.smsData?.sender || '',
    tx.smsData?.rawMessage || '',
  ].join(' ').toLowerCase();

  return rule.keywordAny.some(keyword => haystack.includes((keyword || '').toLowerCase()));
};

const matchesDayConstraint = (rule: SmartRule, tx: Transaction): boolean => {
  if (!rule.daysOfWeek?.length) return true;
  const day = getTransactionDate(tx).getDay();
  return rule.daysOfWeek.includes(day);
};

const matchesTypeConstraint = (rule: SmartRule, tx: Transaction): boolean => {
  if (!rule.typeFilter || rule.typeFilter === 'both') return true;
  return tx.type === rule.typeFilter;
};

const matchesOccurrenceConstraint = (rule: SmartRule, tx: Transaction, existing: Transaction[]): boolean => {
  if (!rule.occurrence) return true;

  const targetDate = getTransactionDate(tx);
  const windowStart = new Date(targetDate.getTime() - rule.occurrence.days * 24 * 60 * 60 * 1000);
  const tolerance = Math.max(0, rule.occurrence.amountTolerance ?? 0);

  const count = existing.filter(item => {
    const itemDate = getTransactionDate(item);
    if (itemDate < windowStart || itemDate > targetDate) return false;
    if (item.type !== tx.type) return false;

    const amountNear = Math.abs(item.amount - tx.amount) <= tolerance;
    if (!amountNear) return false;

    if (rule.occurrence?.sameVendor) {
      return (item.vendor || '').trim().toLowerCase() === (tx.vendor || '').trim().toLowerCase();
    }

    return true;
  }).length;

  return count >= rule.occurrence.count;
};

const getDefaultSmartRules = (): Omit<SmartRule, 'id' | 'createdAt' | 'updatedAt'>[] => {
  return [
    {
      name: 'Daily Transport Amount Mapper',
      field: 'amount',
      operator: 'between',
      value: '10-300',
      typeFilter: 'expense',
      occurrence: {
        count: 3,
        days: 14,
        amountTolerance: 10,
      },
      setCategory: 'Transportation',
      setTags: ['auto-rule', 'daily-transport'],
      priority: 100,
      isActive: true,
    },
  ];
};

const ensureDefaultSmartRules = async (rules: SmartRule[]): Promise<SmartRule[]> => {
  const defaultDefinitions = getDefaultSmartRules();
  const existing = [...rules];
  let hasChanges = false;

  for (const base of defaultDefinitions) {
    const name = (base.name || '').toLowerCase();
    const alreadyExists = existing.some(rule => (rule.name || '').toLowerCase() === name);
    if (alreadyExists) continue;

    existing.push({
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...base,
    });
    hasChanges = true;
  }

  if (hasChanges) {
    await writeJson(SMART_RULES_KEY, existing);
  }

  return existing;
};

export const getSmartRules = async (): Promise<SmartRule[]> => {
  const all = (await readJson<SmartRule[]>(SMART_RULES_KEY)) || [];
  return ensureDefaultSmartRules(all);
};

export const createSmartRule = async (input: Omit<SmartRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<SmartRule> => {
  const all = await getSmartRules();
  const created: SmartRule = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priority: 0,
    ...input,
  };

  await writeJson(SMART_RULES_KEY, [created, ...all]);
  return created;
};

export const updateSmartRule = async (id: string, updates: Partial<Omit<SmartRule, 'id' | 'createdAt'>>): Promise<void> => {
  const all = await getSmartRules();
  const updated = all.map(rule => (rule.id === id ? { ...rule, ...updates, updatedAt: new Date().toISOString() } : rule));
  await writeJson(SMART_RULES_KEY, updated);
};

export const deleteSmartRule = async (id: string): Promise<void> => {
  const all = await getSmartRules();
  const filtered = all.filter(rule => rule.id !== id);
  await writeJson(SMART_RULES_KEY, filtered);
};

export const createAmountCategoryRule = async (input: {
  name: string;
  minAmount: number;
  maxAmount: number;
  category: string;
  type?: 'income' | 'expense' | 'both';
  tags?: string[];
  priority?: number;
  keywordAny?: string[];
  daysOfWeek?: number[];
  occurrence?: RuleOccurrenceCondition;
  isActive?: boolean;
}): Promise<SmartRule> => {
  return createSmartRule({
    name: input.name,
    field: 'amount',
    operator: 'between',
    value: `${input.minAmount}-${input.maxAmount}`,
    typeFilter: input.type || 'expense',
    keywordAny: input.keywordAny,
    daysOfWeek: input.daysOfWeek,
    occurrence: input.occurrence,
    setCategory: input.category,
    setTags: input.tags,
    priority: input.priority ?? 50,
    isActive: input.isActive ?? true,
  });
};

const matchesRule = (rule: SmartRule, tx: Transaction, existing: Transaction[]): boolean => {
  if (!rule.isActive) return false;
  if (!matchesTypeConstraint(rule, tx)) return false;
  if (!matchesDayConstraint(rule, tx)) return false;
  if (!matchesKeywordConstraint(rule, tx)) return false;
  if (!matchesOccurrenceConstraint(rule, tx, existing)) return false;

  if (rule.field === 'amount') {
    return evaluateAmountRule(rule, tx);
  }

  return evaluateTextRule(rule, tx);
};

export const applySmartRules = async (transaction: Transaction, existingTransactions: Transaction[] = []): Promise<Transaction> => {
  const rules = await getSmartRules();
  const orderedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  let updated: Transaction = { ...transaction };

  for (const rule of orderedRules) {
    if (!matchesRule(rule, updated, existingTransactions)) continue;

    if (rule.setCategory) updated.category = rule.setCategory;
    if (rule.setType) updated.type = rule.setType;
    if (rule.setTags?.length) {
      const tags = new Set([...(updated.tags || []), ...rule.setTags]);
      updated.tags = [...tags];
    }
  }

  return updated;
};
