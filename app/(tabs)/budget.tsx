import BudgetForm from '@/app/components/BudgetForm';
import { useCurrency } from '@/app/contexts/CurrencyContext';
import { emitter } from '@/app/libs/emitter';
import {
    checkBudgetAlerts,
    deleteBudget,
    getAllBudgets,
    getBudgetSummary
} from '@/app/services/budgetService';
import { IconButton } from '@/components/ui/button';
import Card from '@/components/ui/card';
import { useFocusEffect } from 'expo-router';
import { AlertTriangle, PlusCircle, Target, Trash2, TrendingUp } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';


const BudgetCard = ({ 
  budget, 
  onDelete 
}: { 
  budget: any; 
  onDelete: (id: string) => void;
}) => {
  const { formatAmount } = useCurrency();
  const percentage = Math.min((budget.spent / budget.amount) * 100, 100);
  const isOverBudget = budget.spent > budget.amount;
  const remaining = budget.amount - budget.spent;

  const handleLongPress = () => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the "${budget.name}" budget?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(budget.id) },
      ]
    );
  };

  const getStatusIcon = () => {
    if (isOverBudget) return <AlertTriangle size={16} color="#ef4444" />;
    if (percentage > 80) return <AlertTriangle size={16} color="#f59e0b" />;
    return <TrendingUp size={16} color="#22c55e" />;
  };

  return (
    <TouchableOpacity onLongPress={handleLongPress}>
      <Card style={styles.budgetCard}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetTitle}>{budget.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {getStatusIcon()}
            <IconButton onPress={() => handleLongPress()} accessibilityLabel={`Delete budget ${budget.name}`}>
              <Trash2 size={18} color="#ef4444" />
            </IconButton>
          </View>
        </View>

        <View style={styles.budgetAmounts}>
          <Text style={styles.budgetSpent}>{formatAmount(budget.spent)}</Text>
          <Text style={styles.budgetTotal}>of {formatAmount(budget.amount)}</Text>
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

        <View style={styles.budgetFooter}>
          <Text
            style={[
              styles.budgetStatus,
              isOverBudget ? styles.overBudget : styles.underBudget,
            ]}
          >
            {isOverBudget
              ? `${formatAmount(budget.spent - budget.amount)} over budget`
              : `${formatAmount(remaining)} left`}
          </Text>
          <Text style={styles.budgetPercentage}>
            {percentage.toFixed(1)}%
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const BudgetScreen: React.FC = () => {
  const { formatAmount } = useCurrency();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadBudgetData();
  }, []);

  useFocusEffect(useCallback(() => {
    loadBudgetData();
  }, []));

  useEffect(() => {
    const unsub = emitter.addListener('budgets:changed', () => loadBudgetData());
    return () => { unsub(); };
  }, []);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      const [budgetData, summaryData, alertData] = await Promise.all([
        getAllBudgets(),
        getBudgetSummary(),
        checkBudgetAlerts(),
      ]);
      
      setBudgets(budgetData);
      setSummary(summaryData);
      setAlerts(alertData);
    } catch (error) {
      console.error('Error loading budget data:', error);
      Alert.alert('Error', 'Failed to load budget data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBudgetData();
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await deleteBudget(id);
      await loadBudgetData(); // Reload after deletion
    } catch (error) {
      console.error('Error deleting budget:', error);
      Alert.alert('Error', 'Failed to delete budget');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading budgets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.heading}>Budgets</Text>

        {alerts.length > 0 && (
          <Card style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <AlertTriangle size={20} color="#f59e0b" />
              <Text style={styles.alertTitle}>Budget Alerts</Text>
            </View>
            {alerts.slice(0, 3).map((alert) => (
              <Text key={alert.id} style={styles.alertText}>
                • {alert.message}
              </Text>
            ))}
          </Card>
        )}

        <Card style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <Target size={28} color="#4f46e5" />
            <View>
              <Text style={styles.summaryTitle}>Budget Summary</Text>
              <Text style={styles.summaryAmount}>
                {formatAmount(summary?.totalSpent || 0)}{' '}
                <Text style={styles.summaryTotal}>
                  / {formatAmount(summary?.totalBudgeted || 0)}
                </Text>
              </Text>
              <View style={styles.summaryStats}>
                <Text style={styles.statText}>
                  {summary?.exceededBudgets || 0} exceeded • {summary?.warningBudgets || 0} warning • {summary?.onTrackBudgets || 0} on track
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.grid}>
          {budgets.length > 0 ? (
            budgets.map((budget) => (
              <BudgetCard 
                key={budget.id} 
                budget={budget} 
                onDelete={handleDeleteBudget}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No budgets yet</Text>
              <Text style={styles.emptySubtext}>Create your first budget to start tracking your spending</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowForm(true)}
      >
        <PlusCircle size={28} color="white" />
      </TouchableOpacity>

      <BudgetForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={loadBudgetData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    position: 'relative',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  alertCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    marginBottom: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  alertText: {
    fontSize: 14,
    color: '#d97706',
    marginBottom: 4,
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
  summaryStats: {
    marginTop: 4,
  },
  statText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  budgetCard: {
    marginBottom: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f3f4f6',
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default BudgetScreen;

