import BudgetForm from '@/components/BudgetForm';
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/text';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { emitter } from '@/libs/emitter';
import {
  checkBudgetAlerts,
  createBudget,
  deleteBudget,
  getAllBudgets,
  getBudgetSummary
} from '@/services/budgetService';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Bell, Plus, Target, Trash2, Wallet } from 'lucide-react-native';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInUp, Layout, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const screenWidth = Dimensions.get('window').width;

const BudgetCard = ({
  budget,
  index,
  onRequestDelete,
}: {
  budget: any;
  index: number;
  onRequestDelete: (budget: any) => void;
}) => {
  const { formatAmount } = useCurrency();
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const border = useThemeColor({}, 'border');
  const percentage = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0;
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
    onRequestDelete(budget);
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(300 + index * 100).duration(600).springify()}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        onLongPress={handleLongPress}
        activeOpacity={0.9}
        onPress={() => { }} // Could navigate to details
      >
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
  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  const background = useThemeColor({}, 'background');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingDeleteBudget, setPendingDeleteBudget] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feedbackModalConfig, setFeedbackModalConfig] = useState<{
    title: string;
    message: string;
    tone: 'destructive' | 'primary';
    confirmLabel?: string;
    cancelLabel?: string;
    showCancel?: boolean;
    onConfirm?: () => Promise<void> | void;
  } | null>(null);

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
      setFeedbackModalConfig({
        title: 'Budget Deleted',
        message: 'The budget has been removed.',
        tone: 'primary',
        confirmLabel: toDelete ? 'Undo' : 'OK',
        cancelLabel: toDelete ? 'Close' : undefined,
        showCancel: !!toDelete,
        onConfirm: async () => {
          if (!toDelete) return;
          try {
            await createBudget(toDelete);
            await loadBudgetData();
          } catch (err) {
            console.error('Undo failed', err);
          }
        },
      });
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const requestDeleteBudget = (budget: any) => {
    setPendingDeleteBudget(budget);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteBudget = async () => {
    if (!pendingDeleteBudget?.id) return;
    await handleDeleteBudget(pendingDeleteBudget.id);
    setShowDeleteConfirm(false);
    setPendingDeleteBudget(null);
  };

  const totalPercentage = summary?.totalBudgeted > 0 ? Math.min((summary.totalSpent / summary.totalBudgeted) * 100, 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <ConfirmActionModal
        visible={showDeleteConfirm}
        title="Delete Budget"
        message={`Are you sure you want to delete the "${pendingDeleteBudget?.name || 'selected'}" budget?`}
        warning="This action cannot be undone"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmTone="destructive"
        blurIntensity={95}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setPendingDeleteBudget(null);
        }}
        onConfirm={confirmDeleteBudget}
      />
      <ConfirmActionModal
        visible={!!feedbackModalConfig}
        title={feedbackModalConfig?.title || 'Notice'}
        message={feedbackModalConfig?.message || ''}
        confirmLabel={feedbackModalConfig?.confirmLabel || 'OK'}
        cancelLabel={feedbackModalConfig?.cancelLabel || 'Cancel'}
        confirmTone={feedbackModalConfig?.tone || 'primary'}
        showCancel={feedbackModalConfig?.showCancel ?? false}
        blurIntensity={95}
        onCancel={() => setFeedbackModalConfig(null)}
        onConfirm={async () => {
          const onConfirm = feedbackModalConfig?.onConfirm;
          if (onConfirm) {
            await onConfirm();
          }
          setFeedbackModalConfig(null);
        }}
      />
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={isDark ? ['#1e1b4b', '#0f172a'] : ['#f97316', '#ea580c']}
        style={styles.headerGradient}
      >
        <Typography variant="title" weight="bold" style={styles.headerTitle}>Budgeting</Typography>

        <Card style={[styles.summaryCard, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)',
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
        }]} delay={100}>
          <CardContent style={styles.summaryContent}>
            <View style={styles.summaryHeader}>
              <View>
                <Typography variant="small" style={{ color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 }}>Total Spent</Typography>
                <View style={styles.summaryRow}>
                  <Typography variant="title" weight="bold" style={{ color: '#FFFFFF', fontSize: 32 }}>{formatAmount(summary?.totalSpent || 0)}</Typography>
                  <Typography style={{ color: 'rgba(255,255,255,0.6)', marginLeft: 8, fontSize: 18, marginBottom: 4 }}>/ {formatAmount(summary?.totalBudgeted || 0)}</Typography>
                </View>
              </View>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <Wallet size={24} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.summaryProgressContainer}>
              <View style={[styles.summaryProgressBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <View style={[styles.summaryProgressFill, { width: `${totalPercentage}%`, backgroundColor: '#FFFFFF' }]} />
              </View>
              <View style={styles.summaryFooter}>
                <Typography variant="small" weight="bold" style={{ color: '#FFFFFF', marginTop: 10 }}>{totalPercentage.toFixed(0)}% utilized</Typography>
                <Typography variant="small" weight="medium" style={{ color: 'rgba(255,255,255,0.85)', marginTop: 10 }}>
                  {formatAmount(Math.max(0, (summary?.totalBudgeted || 0) - (summary?.totalSpent || 0)))} left
                </Typography>
              </View>
            </View>
          </CardContent>
        </Card>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
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
              onRequestDelete={requestDeleteBudget}
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
    borderRadius: 28,
    marginTop: 8,
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
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryProgressBar: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: '100%',
    backgroundColor: '#818cf8',
    borderRadius: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // To ensure content isn't hidden by bottom tab bar
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
    bottom: 110, // Moved up to be above the floating tab bar
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
