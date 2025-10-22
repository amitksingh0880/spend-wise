import { generateFinancialInsights } from '@/app/services/analyticsService';
import { getTransactionSummary } from '@/app/services/transactionService';
import Card from '@/components/ui/card';
import { Activity, BarChart3, DollarSign, PieChart as PieChartIcon, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { VictoryArea, VictoryAxis, VictoryChart, VictoryTheme } from 'victory-native';

const screenWidth = Dimensions.get('window').width;

interface CategoryData {
  name: string;
  amount: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface SpendingTrend {
  month: string;
  amount: number;
}

const InsightsScreen: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [spendingTrend, setSpendingTrend] = useState<SpendingTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadInsightsData();
  }, [selectedPeriod]);

  const loadInsightsData = async () => {
    try {
      setLoading(true);
      const [summaryData, insightsData] = await Promise.all([
        getTransactionSummary(),
        generateFinancialInsights(),
      ]);
      
      setSummary(summaryData);
      setInsights(insightsData);
      
      // Generate category breakdown
      if (summaryData?.categoryBreakdown) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        const categoryBreakdown = Object.entries(summaryData.categoryBreakdown).map(([category, amount], index) => ({
          name: category,
          amount: amount as number,
          color: colors[index % colors.length],
          legendFontColor: '#7F7F7F',
          legendFontSize: 12,
        }));
        setCategoryData(categoryBreakdown);
      }

      // Generate spending trend data
      if (summaryData?.monthlyTrend) {
        const trendData = summaryData.monthlyTrend.slice(-6).map((item: any) => ({
          month: item.month.slice(0, 3),
          amount: item.expenses,
        }));
        setSpendingTrend(trendData);
      }
    } catch (error) {
      console.error('Error loading insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      default: return 'This Month';
    }
  };

  const generateBarChartData = () => {
    if (spendingTrend.length === 0) {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }],
      };
    }

    return {
      labels: spendingTrend.map(item => item.month),
      datasets: [{ data: spendingTrend.map(item => item.amount) }],
    };
  };

  const generateLineChartData = () => {
    if (spendingTrend.length === 0) {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }],
      };
    }

    return {
      labels: spendingTrend.map(item => item.month),
      datasets: [{ data: spendingTrend.map(item => item.amount) }],
    };
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  const barChartData = generateBarChartData();
  const lineChartData = generateLineChartData();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Financial Insights</Text>
        <View style={styles.periodSelector}>
          {(['week', 'month', 'year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Key Metrics Cards */}
      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <DollarSign size={20} color="#22c55e" />
            <Text style={styles.metricLabel}>Total Spent</Text>
          </View>
          <Text style={styles.metricValue}>
            ${summary?.totalExpenses?.toFixed(2) || '0.00'}
          </Text>
          <View style={styles.metricChange}>
            <TrendingUp size={14} color="#22c55e" />
            <Text style={styles.metricChangeText}>+5.2%</Text>
          </View>
        </Card>

        <Card style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Activity size={20} color="#3b82f6" />
            <Text style={styles.metricLabel}>Transactions</Text>
          </View>
          <Text style={styles.metricValue}>
            {summary?.transactionCount || 0}
          </Text>
          <View style={styles.metricChange}>
            <TrendingUp size={14} color="#22c55e" />
            <Text style={styles.metricChangeText}>+12</Text>
          </View>
        </Card>
      </View>

      {/* Spending Trend Chart */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Spending Trend</Text>
          <BarChart3 size={20} color="#6b7280" />
        </View>
        <BarChart
          data={barChartData}
          width={screenWidth - 80}
          height={220}
          chartConfig={{
            backgroundColor: '#1f2937',
            backgroundGradientFrom: '#1f2937',
            backgroundGradientTo: '#374151',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#374151',
            },
          }}
          style={styles.chart}
        />
      </Card>

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Spending by Category</Text>
            <PieChartIcon size={20} color="#6b7280" />
          </View>
          <PieChart
            data={categoryData}
            width={screenWidth - 80}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        </Card>
      )}

      {/* Line Chart for Trend Analysis */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Monthly Trend</Text>
          <TrendingUp size={20} color="#6b7280" />
        </View>
        <LineChart
          data={lineChartData}
          width={screenWidth - 80}
          height={220}
          chartConfig={{
            backgroundColor: '#1f2937',
            backgroundGradientFrom: '#1f2937',
            backgroundGradientTo: '#374151',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#374151',
            },
          }}
          style={styles.chart}
        />
      </Card>

      {/* Advanced Analytics with Victory Charts */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Advanced Analytics</Text>
          <Activity size={20} color="#6b7280" />
        </View>
        <View style={styles.victoryChartContainer}>
          <VictoryChart
            theme={VictoryTheme.material}
            height={200}
            width={screenWidth - 80}
          >
            <VictoryAxis
              style={{
                axis: { stroke: '#6b7280' },
                tickLabels: { fill: '#9ca3af' },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: '#6b7280' },
                tickLabels: { fill: '#9ca3af' },
              }}
            />
            <VictoryArea
              data={spendingTrend.map((item, index) => ({ x: index, y: item.amount }))}
              style={{
                data: { fill: 'url(#gradient)', stroke: '#3b82f6', strokeWidth: 2 },
              }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
          </VictoryChart>
        </View>
      </Card>

      {/* Financial Insights */}
      {insights.length > 0 && (
        <Card style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>AI-Powered Insights</Text>
          {insights.slice(0, 5).map((insight, index) => (
            <View key={insight.id || index} style={styles.insightItem}>
              <View style={[
                styles.insightIndicator,
                { backgroundColor: insight.impact === 'high' ? '#ef4444' : insight.impact === 'medium' ? '#f59e0b' : '#22c55e' }
              ]} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
                {insight.recommendation && (
                  <Text style={styles.insightRecommendation}>
                    💡 {insight.recommendation}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Spending Patterns */}
      <Card style={styles.patternsCard}>
        <Text style={styles.patternsTitle}>Spending Patterns</Text>
        <View style={styles.patternGrid}>
          <View style={styles.patternItem}>
            <Text style={styles.patternLabel}>Peak Spending Day</Text>
            <Text style={styles.patternValue}>Friday</Text>
          </View>
          <View style={styles.patternItem}>
            <Text style={styles.patternLabel}>Average Transaction</Text>
            <Text style={styles.patternValue}>
              ${summary ? (summary.totalExpenses / (summary.transactionCount || 1)).toFixed(2) : '0.00'}
            </Text>
          </View>
          <View style={styles.patternItem}>
            <Text style={styles.patternLabel}>Top Category</Text>
            <Text style={styles.patternValue}>
              {categoryData.length > 0 ? categoryData[0].name : 'N/A'}
            </Text>
          </View>
          <View style={styles.patternItem}>
            <Text style={styles.patternLabel}>Savings Rate</Text>
            <Text style={styles.patternValue}>
              {summary ? (((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100).toFixed(1) : '0.0'}%
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
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
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f9fafb',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
  },
  periodButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 4,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricChangeText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  chartCard: {
    marginBottom: 20,
    padding: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  victoryChartContainer: {
    alignItems: 'center',
  },
  insightsCard: {
    marginBottom: 20,
    padding: 16,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
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
    marginBottom: 4,
  },
  insightRecommendation: {
    fontSize: 12,
    color: '#60a5fa',
    fontStyle: 'italic',
  },
  patternsCard: {
    marginBottom: 20,
    padding: 16,
  },
  patternsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 16,
  },
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  patternItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
  },
  patternLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  patternValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
});

export default InsightsScreen;
