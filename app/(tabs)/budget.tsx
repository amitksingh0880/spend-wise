import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Target, PlusCircle } from 'lucide-react-native';
import { BudgetCategory } from '@/types';
import Card from '@/components/ui/card';
import { MOCK_BUDGETS } from '@/constants/mockData';


const BudgetCard = ({ budget }: { budget: BudgetCategory }) => {
  const percentage = Math.min((budget.spent / budget.total) * 100, 100);
  const isOverBudget = budget.spent > budget.total;
  const remaining = budget.total - budget.spent;

  return (
    <Card style={styles.budgetCard}>
      <Text style={styles.budgetTitle}>{budget.name}</Text>

      <View style={styles.budgetAmounts}>
        <Text style={styles.budgetSpent}>${budget.spent.toFixed(2)}</Text>
        <Text style={styles.budgetTotal}>of ${budget.total.toFixed(2)}</Text>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progress,
            {
              width: `${percentage}%`,
              backgroundColor: isOverBudget ? '#ef4444' : budget.color,
            },
          ]}
        />
      </View>

      <Text
        style={[
          styles.budgetStatus,
          isOverBudget ? styles.overBudget : styles.underBudget,
        ]}
      >
        {isOverBudget
          ? `$${(budget.spent - budget.total).toFixed(2)} over budget`
          : `$${remaining.toFixed(2)} left`}
      </Text>
    </Card>
  );
};

const BudgetScreen: React.FC = () => {
  const totalBudget = MOCK_BUDGETS.reduce((sum, b) => sum + b.total, 0);
  const totalSpent = MOCK_BUDGETS.reduce((sum, b) => sum + b.spent, 0);

  return (
    <View style={styles.container}>
      <ScrollView>
        <Text style={styles.heading}>Budgets</Text>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <Target size={28} color="#4f46e5" />
            <View>
              <Text style={styles.summaryTitle}>Monthly Budget Summary</Text>
              <Text style={styles.summaryAmount}>
                ${totalSpent.toFixed(2)}{' '}
                <Text style={styles.summaryTotal}>
                  / ${totalBudget.toFixed(2)}
                </Text>
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.grid}>
          {MOCK_BUDGETS.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} />
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.addButton}>
        <PlusCircle size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
    position: 'relative',
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    marginBottom: 16,
  },
  summaryContent: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d1d5db',
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
  },
  summaryTotal: {
    color: '#9ca3af',
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
    paddingBottom: 72,
  },
  budgetCard: {
    marginBottom: 8,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f3f4f6',
    marginBottom: 8,
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budgetSpent: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4f46e5',
  },
  budgetTotal: {
    fontSize: 14,
    color: '#9ca3af',
  },
  progressBar: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#1f2937',
    marginBottom: 6,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 999,
  },
  budgetStatus: {
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '500',
  },
  overBudget: {
    color: '#ef4444',
  },
  underBudget: {
    color: '#9ca3af',
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#4f46e5',
    borderRadius: 999,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
    transform: [{ scale: 1 }],
  },
});

export default BudgetScreen;
