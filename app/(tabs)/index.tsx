import { useCurrency } from '@/contexts/CurrencyContext';
import { emitter } from '@/libs/emitter';
import { generateFinancialInsights } from '@/services/analyticsService';
import { getFilteredTransactions, getRecentTransactions, getTransactionSummary, Transaction } from '@/services/transactionService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Link, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  PiggyBank, 
  RefreshCw, 
  TrendingUp, 
  Wallet,
  ChevronRight
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { 
  Dimensions, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  View,
  StatusBar,
  Platform
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const TransactionItem = ({ transaction, index }: { transaction: Transaction, index: number, key?: string }) => {
  const { formatAmount } = useCurrency();
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const border = useThemeColor({}, 'border');
  const isIncome = transaction.type === 'income';
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

  return (
    <Animated.View entering={FadeInUp.delay(400 + index * 100).duration(600).springify()}>
      <TouchableOpacity style={[styles.transactionItem, { borderBottomColor: border }]}>
        <View style={styles.transactionLeft}>
          <View style={[styles.iconWrapper, isIncome ? styles.incomeIcon : styles.expenseIcon]}>
            <Icon size={18} color={isIncome ? '#22c55e' : '#ef4444'} />
          </View>
          <View>
            <Typography variant="bold" style={styles.vendorText}>{transaction.vendor}</Typography>
            <Typography variant="small" style={{ color: mutedForeground }}>{transaction.category}</Typography>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Typography variant="bold" style={[styles.amountText, isIncome ? styles.incomeText : styles.expenseText]}>
            {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
          </Typography>
          <Typography variant="small" style={{ color: mutedForeground }}>
            {new Date(transaction.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Typography>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const DashboardScreen: React.FC = () => {
  const { formatAmount } = useCurrency();
  const [summary, setSummary] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [suspiciousCount, setSuspiciousCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const background = useThemeColor({}, 'background');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const cardBg = useThemeColor({}, 'card');

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(useCallback(() => {
    loadDashboardData();
  }, []));

  useEffect(() => {
    const unsub = emitter.addListener('transactions:changed', () => {
      loadDashboardData();
    });
    return () => { unsub(); };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryData, recentTxs, insightsData, suspiciousTxs] = await Promise.all([
        getTransactionSummary(),
        getRecentTransactions(8),
        generateFinancialInsights(),
        getFilteredTransactions({ tags: ['suspicious'] })
      ]);
      
      setSummary(summaryData);
      setRecentTransactions(recentTxs);
      setInsights(insightsData || []);
      setSuspiciousCount((suspiciousTxs || []).length || 0);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const generateChartData = () => {
    if (!summary?.monthlyTrend || summary.monthlyTrend.length === 0) {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }],
      };
    }

    const last6Months = summary.monthlyTrend.slice(-6);
    return {
      labels: last6Months.map((m: any) => m.month.slice(0, 3)),
      datasets: [
        { 
          data: last6Months.map((m: any) => m.expenses),
          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
          strokeWidth: 3
        },
        { 
          data: last6Months.map((m: any) => m.income || 0),
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
          strokeWidth: 3
        }
      ],
      legend: ["Expenses", "Income"]
    };
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: background }]}>
        <StatusBar barStyle="dark-content" />
        <Typography variant="muted">Refreshing your finances...</Typography>
      </View>
    );
  }

  const chartData = generateChartData();
  const savingsRateNumeric = summary && typeof summary.totalIncome === 'number' && summary.totalIncome > 0
    ? ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100
    : 0;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: background }]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.headerGradient}
      >
        <View style={styles.topNav}>
          <View>
            <Typography style={styles.greetingText}>Welcome back</Typography>
            <Typography variant="title" weight="bold" style={styles.userNameText}>Amit Kumar</Typography>
          </View>
          <TouchableOpacity 
            onPress={handleRefresh} 
            disabled={refreshing}
            style={styles.refreshButton}
          >
            <RefreshCw 
              size={20} 
              color="#FFFFFF" 
              style={refreshing ? { transform: [{ rotate: '180deg' }] } : {}}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.balanceContainer}>
          <Typography style={styles.balanceLabel}>Total Balance</Typography>
          <Typography style={styles.balanceAmount}>{formatAmount(summary?.netAmount || 0)}</Typography>
          <View style={styles.balanceMeta}>
            <View style={styles.metaItem}>
              <ArrowDownLeft size={16} color="#22c55e" />
              <Typography style={styles.metaText}>{formatAmount(summary?.totalIncome || 0)}</Typography>
            </View>
            <View style={[styles.metaItem, { marginLeft: 16 }]}>
              <ArrowUpRight size={16} color="#ef4444" />
              <Typography style={styles.metaText}>{formatAmount(summary?.totalExpenses || 0)}</Typography>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.quickStats}>
          <Card style={styles.statCard} delay={200}>
            <CardContent style={styles.statCardContent}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#e0f2fe' }]}>
                <PiggyBank size={20} color="#0ea5e9" />
              </View>
              <View>
                <Typography variant="small" style={{ color: mutedForeground }}>Savings Rate</Typography>
                <Typography variant="bold">{savingsRateNumeric.toFixed(1)}%</Typography>
              </View>
            </CardContent>
          </Card>
          <Card style={styles.statCard} delay={300}>
            <CardContent style={styles.statCardContent}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#ffedd5' }]}>
                <TrendingUp size={20} color="#f97316" />
              </View>
              <View>
                <Typography variant="small" style={{ color: mutedForeground }}>Transactions</Typography>
                <Typography variant="bold">{recentTransactions.length}</Typography>
              </View>
            </CardContent>
          </Card>
        </View>

        <Card style={styles.mainCard} delay={400}>
          <CardHeader style={styles.sectionHeader}>
            <Typography variant="subtitle" weight="bold">Spending Trend</Typography>
            <Typography variant="small" style={{ color: mutedForeground }}>Last 6 Months</Typography>
          </CardHeader>
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={screenWidth - 40}
              height={200}
              chartConfig={{
                backgroundColor: cardBg,
                backgroundGradientFrom: cardBg,
                backgroundGradientTo: cardBg,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
                labelColor: (opacity = 1) => mutedForeground,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                  stroke: "#fff"
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </Card>

        {suspiciousCount > 0 && (
          <TouchableOpacity style={styles.alertBanner}>
            <LinearGradient
              colors={['#fff7ed', '#ffedd5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.alertGradient}
            >
              <View style={styles.alertContent}>
                <TrendingUp size={20} color="#f97316" />
                <Typography style={styles.alertText}>
                  {suspiciousCount} suspicious transactions detected
                </Typography>
              </View>
              <Link href="/suspicious" asChild>
                <Button variant="ghost" size="sm" style={styles.alertBtn}>
                  <ChevronRight size={16} color="#f97316" />
                </Button>
              </Link>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.sectionTitleRow}>
          <Typography variant="subtitle" weight="bold">Recent Activity</Typography>
          <TouchableOpacity>
            <Typography style={styles.seeAllText}>See All</Typography>
          </TouchableOpacity>
        </View>

        <Card style={styles.transactionsCard} delay={500}>
          <CardContent style={{ padding: 0 }}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((item, index) => (
                <TransactionItem key={item.id} transaction={item} index={index} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Wallet size={48} color={mutedForeground} />
                <Typography style={{ marginTop: 16, color: mutedForeground }}>No transactions yet</Typography>
              </View>
            )}
          </CardContent>
        </Card>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 60,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greetingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  userNameText: {
    color: '#FFFFFF',
    fontSize: 22,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  balanceMeta: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  content: {
    paddingHorizontal: 20,
    marginTop: -30,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    borderRadius: 20,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mainCard: {
    borderRadius: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  chartContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  alertBanner: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  alertGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertText: {
    color: '#9a3412',
    fontWeight: '600',
    marginLeft: 12,
    fontSize: 14,
  },
  alertBtn: {
    width: 32,
    height: 32,
    padding: 0,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  seeAllText: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 14,
  },
  transactionsCard: {
    borderRadius: 24,
    padding: 0,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  incomeIcon: {
    backgroundColor: '#f0fdf4',
  },
  expenseIcon: {
    backgroundColor: '#fef2f2',
  },
  vendorText: {
    fontSize: 16,
    marginBottom: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    marginBottom: 2,
  },
  incomeText: {
    color: '#22c55e',
  },
  expenseText: {
    color: '#0f172a',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
});

export default DashboardScreen;
