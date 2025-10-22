import { generateFinancialInsights } from '@/app/services/analyticsService';
import { getRecentTransactions, getTransactionSummary } from '@/app/services/transactionService';
import Card from '@/components/ui/card';
import { Transaction } from '@/types';
import { ArrowDownLeft, ArrowUpRight, PiggyBank, RefreshCw, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';



const screenWidth = Dimensions.get('window').width;

const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
  const isIncome = transaction.type === 'income';
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

  return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[styles.iconWrapper, isIncome ? styles.incomeIcon : styles.expenseIcon]}>
          <Icon size={18} color={isIncome ? '#22c55e' : '#ef4444'} />
        </View>
        <View>
          <Text style={styles.transactionVendor}>{transaction.vendor}</Text>
          <Text style={styles.transactionCategory}>{transaction.category}</Text>
        </View>
      </View>
      <Text style={[styles.transactionAmount, isIncome ? styles.incomeText : styles.expenseText]}>
        {isIncome ? '+' : '-'}${transaction.amount.toFixed(2)}
      </Text>
    </View>
  );
};

const DashboardScreen: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryData, recentTxs, insightsData] = await Promise.all([
        getTransactionSummary(),
        getRecentTransactions(5),
        generateFinancialInsights(),
      ]);
      
      setSummary(summaryData);
      setRecentTransactions(recentTxs);
      setInsights(insightsData);
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
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const chartData = generateChartData();
  const savingsRate = summary ? ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100 : 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Dashboard</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <RefreshCw 
            size={24} 
            color={refreshing ? "#9ca3af" : "#60a5fa"} 
            style={refreshing ? { transform: [{ rotate: '180deg' }] } : {}}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cardGrid}>
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardSubheading}>Total Expenses</Text>
            <TrendingUp color="#ef4444" />
          </View>
          <Text style={styles.cardValue}>
            ${summary?.totalExpenses?.toFixed(2) || '0.00'}
          </Text>
        </Card>

        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardSubheading}>Total Income</Text>
            <PiggyBank color="#22c55e" />
          </View>
          <Text style={styles.cardValue}>
            ${summary?.totalIncome?.toFixed(2) || '0.00'}
          </Text>
        </Card>
      </View>

      <View style={styles.cardGrid}>
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardSubheading}>Net Amount</Text>
            <TrendingUp color={summary?.netAmount >= 0 ? "#22c55e" : "#ef4444"} />
          </View>
          <Text style={[
            styles.cardValue,
            { color: summary?.netAmount >= 0 ? "#22c55e" : "#ef4444" }
          ]}>
            ${summary?.netAmount?.toFixed(2) || '0.00'}
          </Text>
        </Card>

        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardSubheading}>Savings Rate</Text>
            <PiggyBank color="#0ea5e9" />
          </View>
          <Text style={styles.cardValue}>
            {savingsRate.toFixed(1)}%
          </Text>
        </Card>
      </View>

      {chartData.datasets[0].data.some(val => val > 0) && (
        <Card>
          <Text style={styles.sectionHeading}>Monthly Spending Trend</Text>
          <BarChart
            data={chartData}
            width={screenWidth - 48}
            height={220}
            chartConfig={{
              backgroundColor: '#000',
              backgroundGradientFrom: '#1f2937',
              backgroundGradientTo: '#1f2937',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: '#374151',
              },
            }}
            style={{ marginVertical: 8, borderRadius: 8 }}
          />
        </Card>
      )}

      {insights.length > 0 && (
        <Card>
          <Text style={styles.sectionHeading}>Financial Insights</Text>
          {insights.slice(0, 3).map((insight, index) => (
            <View key={insight.id} style={styles.insightItem}>
              <View style={[
                styles.insightIndicator,
                { backgroundColor: insight.impact === 'high' ? '#ef4444' : insight.impact === 'medium' ? '#f59e0b' : '#22c55e' }
              ]} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <View style={styles.recentHeader}>
          <Text style={styles.sectionHeading}>Recent Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        {recentTransactions.length > 0 ? (
          <FlatList
            scrollEnabled={false}
            data={recentTransactions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <TransactionItem transaction={item} />}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Add your first transaction to get started</Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#0f172a',
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f9fafb',
    letterSpacing: -0.5,
  },
  cardGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardSubheading: {
    fontSize: 14,
    color: '#9ca3af',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f9fafb',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeIcon: {
    backgroundColor: '#dcfce7',
  },
  expenseIcon: {
    backgroundColor: '#fee2e2',
  },
  transactionVendor: {
    fontWeight: '600',
    color: '#f9fafb',
  },
  transactionCategory: {
    fontSize: 12,
    color: '#9ca3af',
  },
  transactionAmount: {
    fontWeight: '600',
  },
  incomeText: {
    color: '#22c55e',
  },
  expenseText: {
    color: '#f9fafb',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60a5fa',
  },
  divider: {
    height: 1,
    backgroundColor: '#1f2937',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  insightIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default DashboardScreen;
