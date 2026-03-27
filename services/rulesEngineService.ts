import { readJson, writeJson } from '@/libs/storage';
import { uuidv4 } from '@/utils/uuid';
import type { Transaction } from './transactionService';

export type RuleOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith';

export interface SmartRule {
  id: string;
  field: 'vendor' | 'description' | 'sender';
  operator: RuleOperator;
  value: string;
  setCategory?: string;
  setTags?: string[];
  setType?: 'income' | 'expense';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const SMART_RULES_KEY = 'smart_rules';

export const getSmartRules = async (): Promise<SmartRule[]> => {
  return (await readJson<SmartRule[]>(SMART_RULES_KEY)) || [];
};

export const createSmartRule = async (input: Omit<SmartRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<SmartRule> => {
  const all = await getSmartRules();
  const created: SmartRule = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

const matchesRule = (rule: SmartRule, tx: Transaction): boolean => {
  if (!rule.isActive) return false;

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

export const applySmartRules = async (transaction: Transaction): Promise<Transaction> => {
  const rules = await getSmartRules();
  let updated: Transaction = { ...transaction };

  for (const rule of rules) {
    if (!matchesRule(rule, updated)) continue;

    if (rule.setCategory) updated.category = rule.setCategory;
    if (rule.setType) updated.type = rule.setType;
    if (rule.setTags?.length) {
      const tags = new Set([...(updated.tags || []), ...rule.setTags]);
      updated.tags = [...tags];
    }
  }

  return updated;
};
