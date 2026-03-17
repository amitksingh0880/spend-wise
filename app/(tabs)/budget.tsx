import BudgetForm from '@/components/BudgetForm';
import { useCurrency } from '@/contexts/CurrencyContext';
import { emitter } from '@/libs/emitter';
import {
    checkBudgetAlerts,
    createBudget,
    deleteBudget,
    getAllBudgets,
    getBudgetSummary
} from '@/services/budgetService';
import { Button, IconButton } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFocusEffect } from 'expo-router';
import { AlertTriangle, PlusCircle, Target, Trash2, TrendingUp, Wallet, Bell, Plus } from 'lucide-react-native';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    StatusBar,
    Platform,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring, withTiming, Layout } from 'react-native-reanimated';

const screenWidth = Dimensions.get('window').width;

const BudgetCard = ({ 
  budget, 
  index,
  onDelete,
  key
}: { 
  budget: any; 
  index: number;
  onDelete: (id: string) => void;
  key?: string;
}) => {
  const { formatAmount } = useCurrency();
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const border = useThemeColor({}, 'border');
  const percentage = Math.min((budget.spent / budget.amount) * 100, 100);
  const isOverBudget = budget.spent > budget.amount;
  const remaining = budget.amount - budget.spent;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percentage / 100, { duration: 1000 });
  }, [percentage]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

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

  return (
    <Animated.View 
      entering={FadeInUp.delay(300 + index * 100).duration(600).springify()}
      layout={Layout.springify()}
    >
      <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.9}>
        <Card style={styles.budgetCard} delay={0}>
          <CardHeader style={styles.budgetHeader}>
            <View>
              <Typography variant="bold" style={styles.budgetName}>{budget.name}</Typography>
              <Typography variant="small" style={{ color: mutedForeground }}>{budget.category}</Typography>
            </View>
            <TouchableOpacity onPress={handleLongPress} style={styles.deleteBtn}>
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          </CardHeader>

          <CardContent>
            <View style={styles.budgetAmounts}>
              <Typography variant="large" weight="bold" style={{ color: isOverBudget ? '#ef4444' : '#6366f1' }}>
                {formatAmount(budget.spent)}
              </Typography>
              <Typography variant="small" style={{ color: mutedForeground }}>
                of {formatAmount(budget.amount)}
              </Typography>
            </View>

            <View style={[styles.progressBar, { backgroundColor: '#f1f5f9' }]}>
              <Animated.View
                style={[
                  styles.progress,
                  { backgroundColor: isOverBudget ? '#ef4444' : budget.color || '#6366f1' },
                  animatedProgressStyle,
                ]}
              />
            </View>

            <View style={styles.budgetFooter}>
              <Typography
                variant="small"
                weight="medium"
                style={{ color: isOverBudget ? '#ef4444' : '#22c55e' }}
              >
                {isOverBudget
                  ? `${formatAmount(budget.spent - budget.amount)} over limit`
                  : `${formatAmount(remaining)} remaining`}
              </Typography>
              <Typography variant="small" weight="bold" style={{ color: mutedForeground }}>
                {percentage.toFixed(0)}%
              </Typography>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
};

const BudgetScreen: React.FC = () => {
  const { formatAmount } = useCurrency();
  const background = useThemeColor({}, 'background');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const primary = useThemeColor({}, 'primary');
  const primaryForeground = useThemeColor({}, 'primaryForeground');
  const mutedForeground = useThemeColor({}, 'mutedForeground');

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
      const toDelete = budgets.find(b => b.id === id);
      await deleteBudget(id);
      await loadBudgetData();
      Alert.alert('Budget Deleted', 'The budget has been removed.', [
        { text: 'Undo', onPress: async () => {
          if (!toDelete) return;
          try {
            await createBudget(toDelete);
            await loadBudgetData();
          } catch (err) {
            console.error('Undo failed', err);
          }
        }},
        { text: 'OK' }
      ]);
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const totalPercentage = summary ? Math.min((summary.totalSpent / summary.totalBudgeted) * 100, 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1e293b', '#0f172a']}
        style={styles.headerGradient}
      >
        <Typography variant="title" weight="bold" style={styles.headerTitle}>Budgeting</Typography>
        
        <Card style={styles.summaryCard} delay={100}>
          <CardContent style={styles.summaryContent}>
            <View style={styles.summaryHeader}>
              <View>
                <Typography variant="small" style={{ color: 'rgba(255,255,255,0.6)' }}>Total Spent</Typography>
                <View style={styles.summaryRow}>
                  <Typography variant="title" weight="bold" style={{ color: '#FFFFFF' }}>{formatAmount(summary?.totalSpent || 0)}</Typography>
                  <Typography style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>/ {formatAmount(summary?.totalBudgeted || 0)}</Typography>
                </View>
              </View>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                <Wallet size={24} color="#818cf8" />
              </View>
            </View>
            
            <View style={styles.summaryProgressContainer}>
              <View style={styles.summaryProgressBar}>
                <View style={[styles.summaryProgressFill, { width: `${totalPercentage}%` }]} />
              </View>
              <Typography variant="small" weight="bold" style={{ color: '#FFFFFF', marginTop: 8 }}>{totalPercentage.toFixed(0)}% utilized</Typography>
            </View>
          </CardContent>
        </Card>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}
      >
        {alerts.length > 0 && (
          <Animated.View entering={FadeInUp.delay(200)}>
            <Card style={styles.alertCard} delay={0}>
              <View style={styles.alertHeader}>
                <Bell size={18} color="#f59e0b" />
                <Typography variant="bold" style={{ color: '#f59e0b', marginLeft: 8 }}>Budget Alerts</Typography>
              </View>
              <View style={styles.alertList}>
                {alerts.slice(0, 2).map((alert, i) => (
                  <Typography key={i} variant="small" style={{ color: '#92400e', marginBottom: 4 }}>• {alert.message}</Typography>
                ))}
              </View>
            </Card>
          </Animated.View>
        )}

        <View style={styles.sectionHeader}>
          <Typography variant="subtitle" weight="bold">Categories</Typography>
          <TouchableOpacity onPress={() => setShowForm(true)}>
            <Typography variant="small" weight="bold" style={{ color: primary }}>View All</Typography>
          </TouchableOpacity>
        </View>

        {budgets.length > 0 ? (
          budgets.map((budget, index) => (
            <BudgetCard 
              key={budget.id || index.toString()} 
              budget={budget} 
              index={index}
              onDelete={handleDeleteBudget}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Target size={40} color={mutedForeground} />
            </View>
            <Typography variant="subtitle" weight="bold">No Budgets Set</Typography>
            <Typography variant="small" style={{ color: mutedForeground, textAlign: 'center', marginTop: 8 }}>
              Plan your spending by creating monthly category budgets.
            </Typography>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: primary }]}
        onPress={() => setShowForm(true)}
      >
        <Plus size={28} color={primaryForeground} />
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
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 2,
  },
  summaryContent: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryProgressContainer: {
    marginTop: 10,
  },
  summaryProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: '100%',
    backgroundColor: '#818cf8',
    borderRadius: 4,
  },
  scrollContent: {
    padding: 20,
  },
  alertCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderRadius: 20,
    marginBottom: 24,
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertList: {
    paddingLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  budgetCard: {
    marginBottom: 16,
    borderRadius: 24,
    padding: 4,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
  },
  budgetName: {
    fontSize: 17,
    marginBottom: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 5,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});

export default BudgetScreen;
