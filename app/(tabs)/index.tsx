import { useCurrency } from '@/app/contexts/CurrencyContext';
import { emitter } from '@/app/libs/emitter';
import { generateFinancialInsights } from '@/app/services/analyticsService';
import { getFilteredTransactions, getRecentTransactions, getTransactionSummary, Transaction } from '@/app/services/transactionService';
import { CREDButton } from '@/components/ui/CREDButton';
import { CREDCard } from '@/components/ui/CREDCard';
import { CREDText } from '@/components/ui/CREDText';
import { ScreenHeader } from '@/app/components/MenuButton';
import { Link, useFocusEffect } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, PiggyBank, RefreshCw, TrendingUp, Wallet, ShieldCheck, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, ScrollView, StyleSheet, TouchableOpacity, View, StatusBar as RNStatusBar } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { CRED_COLORS } from '@/constants/CREDTheme';

const screenWidth = Dimensions.get('window').width;

const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
  const { formatAmount } = useCurrency();
  const isIncome = transaction.type === 'income';
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

  return (
    <CREDCard variant="glass" style={styles.transactionGlassItem}>
      <View style={styles.transactionLeft}>
        <View style={[styles.iconWrapper, isIncome ? styles.incomeIcon : styles.expenseIcon]}>
          <Icon size={18} color={isIncome ? CRED_COLORS.neonGreen : CRED_COLORS.coralRed} />
        </View>
        <View>
          <CREDText variant="body" weight="bold">{transaction.vendor}</CREDText>
          <CREDText variant="caption" color="gray400">{transaction.category}</CREDText>
        </View>
      </View>
      <CREDText 
        variant="body" 
        weight="black" 
        color={isIncome ? 'neonGreen' : 'gray100'}
      >
        {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
      </CREDText>
    </CREDCard>
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
        getRecentTransactions(5),
        generateFinancialInsights(),
        getFilteredTransactions({ tags: ['suspicious'] })
      ]);
      
      setSummary(summaryData);
      setRecentTransactions(recentTxs);
      setInsights(insightsData);
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
    if (!summary?.monthlyTrend) {
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
      };
    }

    const last7Months = summary.monthlyTrend.slice(-7);
    return {
      labels: last7Months.map((m: any) => m.month.slice(0, 3)),
      datasets: [{ data: last7Months.map((m: any) => m.expenses) }],
    };
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CRED_COLORS.black }}>
        <CREDText variant="body" color="gray500" glow>initializing spendwise...</CREDText>
      </View>
    );
  }

  const chartData = generateChartData();
  const savingsRateNumeric = summary && typeof summary.totalIncome === 'number' && summary.totalIncome > 0
    ? ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100
    : null;
  const savingsRate = savingsRateNumeric !== null && Number.isFinite(savingsRateNumeric) ? savingsRateNumeric : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <RNStatusBar barStyle="light-content" />
      <ScreenHeader
        title="Dashboard"
        right={
          <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
            <RefreshCw size={22} color={refreshing ? CRED_COLORS.gray600 : CRED_COLORS.neonGreen} />
          </TouchableOpacity>
        }
      />

      {/* Hero "Wealth Card" */}
      <CREDCard variant="neon" glow style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View>
            <CREDText variant="caption" color="gray400" weight="bold">TOTAL BALANCE</CREDText>
            <CREDText variant="h1" weight="black" glow style={styles.heroValue}>
              {formatAmount(summary?.netAmount || 0)}
            </CREDText>
          </View>
          <View style={styles.heroIconWrapper}>
            <Wallet color={CRED_COLORS.neonGreen} size={32} />
          </View>
        </View>
        
        <View style={styles.heroFooter}>
          <View style={styles.heroStat}>
            <CREDText variant="caption" color="gray400">INFLOW</CREDText>
            <CREDText variant="h3" weight="bold" color="neonGreen">
              {formatAmount(summary?.totalIncome || 0)}
            </CREDText>
          </View>
          <View style={styles.heroStatLine} />
          <View style={styles.heroStat}>
            <CREDText variant="caption" color="gray400">OUTFLOW</CREDText>
            <CREDText variant="h3" weight="bold" color="coralRed">
              {formatAmount(summary?.totalExpenses || 0)}
            </CREDText>
          </View>
        </View>
      </CREDCard>

      {/* Quick Stats Grid */}
      <View style={styles.statsRow}>
        <CREDCard variant="glass" style={styles.statMiniCard}>
          <CREDText variant="caption" color="gray400">SAVINGS RATE</CREDText>
          <CREDText variant="h3" weight="black" color="electricBlue">
            {savingsRate !== null ? `${savingsRate.toFixed(1)}%` : '0%'}
          </CREDText>
        </CREDCard>
        <CREDCard variant="glass" style={styles.statMiniCard}>
          <CREDText variant="caption" color="gray400">RELIABILITY</CREDText>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <CREDText variant="h3" weight="black" color="gold">98.2</CREDText>
            <ShieldCheck size={14} color={CRED_COLORS.gold} style={{ marginLeft: 4 }} />
          </View>
        </CREDCard>
      </View>

      {/* Suspicious Alert */}
      {suspiciousCount > 0 && (
        <CREDCard variant="neon" accentColor={CRED_COLORS.coralRed} style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <CREDText variant="body" weight="bold" color="coralRed">Suspicious Activity Found</CREDText>
            <CREDText variant="caption" color="gray100">{suspiciousCount} flagged items</CREDText>
          </View>
          <Link href="/suspicious" asChild>
            <CREDButton label="Review Now" size="sm" variant="outline" style={{ borderColor: CRED_COLORS.coralRed }} />
          </Link>
        </CREDCard>
      )}

      {/* Spending Trend Chart */}
      {chartData.datasets[0].data.some((val: number) => val > 0) && (
        <View style={styles.section}>
          <CREDText variant="h3" weight="black" style={styles.sectionTitle}>SPENDING TREND</CREDText>
          <CREDCard variant="filled" style={styles.chartCard}>
            <BarChart
              data={chartData}
              width={screenWidth - 48}
              height={180}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: CRED_COLORS.graphite,
                backgroundGradientFrom: CRED_COLORS.graphite,
                backgroundGradientTo: CRED_COLORS.graphite,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 255, 163, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(163, 163, 163, ${opacity})`,
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: CRED_COLORS.gray800,
                },
              }}
              style={{ paddingRight: 0, borderRadius: 16 }}
              withInnerLines={false}
              showBarTops={false}
            />
          </CREDCard>
        </View>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <CREDText variant="h3" weight="black" style={styles.sectionTitle}>INSIGHTS</CREDText>
          {insights.slice(0, 2).map((insight) => (
            <CREDCard variant="glass" key={insight.id.toString()} style={styles.insightCard}>
              <View style={styles.insightRow}>
                <View style={[styles.insightIndicator, { backgroundColor: insight.impact === 'high' ? CRED_COLORS.coralRed : insight.impact === 'medium' ? CRED_COLORS.gold : CRED_COLORS.neonGreen }]} />
                <View style={{ flex: 1 }}>
                  <CREDText variant="body" weight="bold">{insight.title}</CREDText>
                  <CREDText variant="caption" color="gray500">{insight.description}</CREDText>
                </View>
              </View>
            </CREDCard>
          ))}
        </View>
      )}

      {/* Recent Transactions */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <View style={styles.sectionHeader}>
          <CREDText variant="h3" weight="black" style={styles.sectionTitle}>RECENT ACTIVITY</CREDText>
          <TouchableOpacity style={styles.viewAllRow}>
            <CREDText variant="caption" color="neonGreen" weight="bold">VIEW ALL</CREDText>
            <ChevronRight size={14} color={CRED_COLORS.neonGreen} />
          </TouchableOpacity>
        </View>
        
        {recentTransactions.length > 0 ? (
          recentTransactions.map((tx) => <TransactionItem key={tx.id} transaction={tx} />)
        ) : (
          <CREDCard variant="outline" style={styles.emptyCard}>
            <CREDText variant="body" color="gray500" style={{ textAlign: 'center' }}>No transactions recorded yet</CREDText>
          </CREDCard>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CRED_COLORS.black,
    paddingHorizontal: 20,
  },
  heroCard: {
    marginTop: 10,
    marginBottom: 20,
    padding: 24,
    height: 180,
    justifyContent: 'space-between',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroValue: {
    fontSize: 36,
    marginTop: 4,
  },
  heroIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 16,
  },
  heroStat: {
    flex: 1,
  },
  heroStatLine: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statMiniCard: {
    width: '48%',
    padding: 16,
  },
  alertCard: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  alertHeader: {
    flex: 1,
    marginRight: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    letterSpacing: 1,
    color: CRED_COLORS.gray400,
    fontSize: 14,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartCard: {
    padding: 16,
    alignItems: 'center',
  },
  insightCard: {
    marginBottom: 10,
    padding: 16,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIndicator: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  transactionGlassItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 14,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  incomeIcon: {
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
  },
  expenseIcon: {
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
  },
  emptyCard: {
    padding: 40,
    borderStyle: 'dashed',
  }
});

export default DashboardScreen;
