import { generateFinancialInsights } from '@/services/analyticsService';
import { getTransactionSummary } from '@/services/transactionService';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Activity, BarChart3, DollarSign, PieChart as PieChartIcon, TrendingUp, Calendar, Info } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View, StatusBar, Platform } from 'react-native';
import { BarChart, LineChart, PieChart, StackedBarChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';

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
  income: number;
  expenses: number;
}

interface TransactionSummary {
  totalExpenses: number;
  transactionCount: number;
  totalIncome: number;
  categoryBreakdown: { [key: string]: number };
  monthlyTrend: { month: string; income: number; expenses: number }[];
}

interface FinancialInsight {
  id?: string;
  title: string;
  description: string;
  recommendation?: string;
  impact: 'high' | 'medium' | 'low';
}

const InsightsScreen: React.FC = () => {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [spendingTrend, setSpendingTrend] = useState<SpendingTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  const background = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const primaryForeground = useThemeColor({}, 'primaryForeground');
  const mutedForeground = useThemeColor({}, 'mutedForeground');

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

      setSummary(summaryData || null);
      setInsights(insightsData || []);

      if (summaryData?.categoryBreakdown) {
        const colors = ['#f87171', '#60a5fa', '#34d399', '#facc15', '#a78bfa', '#fb923c', '#2dd4bf', '#f472b6'];
        const categoryDataRaw = summaryData.categoryBreakdown;
        const categoryBreakdown = Object.keys(categoryDataRaw).map((category, index) => {
          const amount = categoryDataRaw[category];
          return {
            name: category,
            amount: Number(amount) || 0,
            color: colors[index % colors.length],
            legendFontColor: mutedForeground,
            legendFontSize: 12,
          };
        });
        setCategoryData(categoryBreakdown.sort((a, b) => b.amount - a.amount));
      } else {
        setCategoryData([]);
      }

      if (summaryData?.monthlyTrend) {
        const trendData = summaryData.monthlyTrend.slice(-6).map((item: any) => ({
          month: item.month?.slice(0, 3) || 'N/A',
          amount: Number(item.expenses) || 0,
          income: Number(item.income) || 0,
          expenses: Number(item.expenses) || 0,
        }));
        setSpendingTrend(trendData);
      } else {
        setSpendingTrend([]);
      }
    } catch (error) {
      console.error('Error loading insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  const trendChartData = useMemo(() => {
    if (spendingTrend.length === 0) {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }],
      };
    }

    return {
      labels: spendingTrend.map((item: any) => item.month),
      datasets: [{ 
        data: spendingTrend.map((item: any) => item.amount),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2
      }],
    };
  }, [spendingTrend]);

  const cashFlowChartData = useMemo(() => {
    if (spendingTrend.length === 0) {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        legend: ['Income', 'Expenses'],
        data: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
        barColors: ['#10b981', '#ef4444'],
      };
    }

    return {
      labels: spendingTrend.map((item: any) => item.month),
      legend: ['Income', 'Expenses'],
      data: spendingTrend.map((item: any) => [item.income, item.expenses]),
      barColors: ['#10b981', '#ef4444'],
    };
  }, [spendingTrend]);

  const topCategoriesChartData = useMemo(() => {
    if (categoryData.length === 0) {
      return {
        labels: ['N/A'],
        datasets: [{ data: [0] }],
      };
    }
    
    const topCats = categoryData.slice(0, 5);
    return {
      labels: topCats.map((cat) => cat.name.length > 7 ? cat.name.substring(0, 6) + '..' : cat.name),
      datasets: [{
        data: topCats.map((cat) => cat.amount),
      }],
    };
  }, [categoryData]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: background }]}>
        <Typography variant="muted">Analyzing your spending...</Typography>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: background }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#1e1b4b', '#312e81']}
        style={styles.headerGradient}
      >
        <Typography variant="title" weight="bold" style={styles.headerTitle}>Financial Insights</Typography>
        <Typography style={styles.headerSubtitle}>Grow your wealth with smart data</Typography>
        
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
              <Typography
                variant="small"
                weight="bold"
                style={[
                  styles.periodButtonText, 
                  selectedPeriod === period && { color: '#1e1b4b' }
                ]}
              >
                {period.toUpperCase()}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard} delay={100}>
            <View style={[styles.metricIconBox, { backgroundColor: '#ecfdf5' }]}>
              <DollarSign size={20} color="#059669" />
            </View>
            <Typography variant="small" style={{ color: mutedForeground, marginBottom: 4 }}>Total Spent</Typography>
            <Typography variant="large" weight="bold">${summary?.totalExpenses?.toLocaleString() || '0'}</Typography>
            <View style={styles.metricTrend}>
              <TrendingUp size={12} color="#059669" />
              <Typography variant="small" style={{ color: '#059669', marginLeft: 4 }}>-2.4%</Typography>
            </View>
          </Card>

          <Card style={styles.metricCard} delay={200}>
            <View style={[styles.metricIconBox, { backgroundColor: '#eff6ff' }]}>
              <Activity size={20} color="#2563eb" />
            </View>
            <Typography variant="small" style={{ color: mutedForeground, marginBottom: 4 }}>Transactions</Typography>
            <Typography variant="large" weight="bold">{summary?.transactionCount || 0}</Typography>
            <View style={styles.metricTrend}>
              <TrendingUp size={12} color="#2563eb" />
              <Typography variant="small" style={{ color: '#2563eb', marginLeft: 4 }}>+4 this week</Typography>
            </View>
          </Card>
        </View>

        <Card style={styles.chartCard} delay={300}>
          <CardHeader style={styles.chartHeader}>
            <View>
              <Typography variant="bold">Cash Flow</Typography>
              <Typography variant="small" style={{ color: mutedForeground }}>Income vs Expenses</Typography>
            </View>
            <BarChart3 size={20} color={mutedForeground} />
          </CardHeader>
          <CardContent style={styles.chartContent}>
            <StackedBarChart
              data={cashFlowChartData}
              width={screenWidth - 72}
              height={220}
              chartConfig={{
                backgroundColor: cardColor,
                backgroundGradientFrom: cardColor,
                backgroundGradientTo: cardColor,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(161, 161, 170, ${opacity})`,
                labelColor: (opacity = 1) => mutedForeground,
                style: { borderRadius: 16 }
              }}
              style={styles.chart}
              hideLegend={false}
            />
          </CardContent>
        </Card>

        <Card style={styles.chartCard} delay={350}>
          <CardHeader style={styles.chartHeader}>
            <View>
              <Typography variant="bold">Spending Trend</Typography>
              <Typography variant="small" style={{ color: mutedForeground }}>Monthly overview</Typography>
            </View>
            <TrendingUp size={20} color={mutedForeground} />
          </CardHeader>
          <CardContent style={styles.chartContent}>
            <LineChart
              data={trendChartData}
              width={screenWidth - 72}
              height={200}
              chartConfig={{
                backgroundColor: cardColor,
                backgroundGradientFrom: cardColor,
                backgroundGradientTo: cardColor,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                labelColor: (opacity = 1) => mutedForeground,
                propsForDots: { r: "5", strokeWidth: "2", stroke: "#fff" },
                style: { borderRadius: 16 }
              }}
              bezier
              style={styles.chart}
            />
          </CardContent>
        </Card>

        {categoryData.length > 0 && (
          <View>
            <Card style={styles.chartCard} delay={400}>
              <CardHeader style={styles.chartHeader}>
                <View>
                  <Typography variant="bold">Top Categories</Typography>
                  <Typography variant="small" style={{ color: mutedForeground }}>Highest spending areas</Typography>
                </View>
                <BarChart3 size={20} color={mutedForeground} />
              </CardHeader>
              <CardContent style={styles.chartContent}>
                <BarChart
                  data={topCategoriesChartData}
                  width={screenWidth - 72}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: cardColor,
                    backgroundGradientFrom: cardColor,
                    backgroundGradientTo: cardColor,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                    labelColor: (opacity = 1) => mutedForeground,
                    style: { borderRadius: 16 },
                    barPercentage: 0.7,
                  }}
                  style={styles.chart}
                  showValuesOnTopOfBars={true}
                  withHorizontalLabels={false}
                />
              </CardContent>
            </Card>

            <Card style={styles.chartCard} delay={450}>
              <CardHeader style={styles.chartHeader}>
                <View>
                  <Typography variant="bold">Category Breakdown</Typography>
                  <Typography variant="small" style={{ color: mutedForeground }}>All categories</Typography>
                </View>
                <PieChartIcon size={20} color={mutedForeground} />
              </CardHeader>
            <CardContent>
              <PieChart
                data={categoryData}
                width={screenWidth - 40}
                height={200}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
              />
              <View style={styles.categoryList}>
                {categoryData.slice(0, 4).map((cat, idx) => (
                  <View key={cat.name} style={styles.categoryBadge}>
                    <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                    <Typography variant="small" weight="medium">{cat.name}</Typography>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
          </View>
        )}

        <Typography variant="subtitle" weight="bold" style={styles.sectionTitle}>Smart Insights</Typography>
        
        {insights.map((insight, index) => (
          <Animated.View 
            key={insight.id || `insight-${index}`} 
            entering={FadeInRight.delay(500 + index * 100).duration(500)}
          >
            <Card style={styles.insightCard} delay={0}>
              <View style={[
                styles.insightIndicator,
                { backgroundColor: insight.impact === 'high' ? '#ef4444' : insight.impact === 'medium' ? '#f59e0b' : '#10b981' }
              ]} />
              <View style={styles.insightBody}>
                <View style={styles.insightHeader}>
                  <Typography variant="bold" style={styles.insightTitleText}>{insight.title}</Typography>
                  <View style={[
                    styles.impactTag, 
                    { backgroundColor: insight.impact === 'high' ? '#fef2f2' : insight.impact === 'medium' ? '#fffbeb' : '#f0fdf4' }
                  ]}>
                    <Typography variant="small" weight="bold" style={{ 
                      fontSize: 10, 
                      color: insight.impact === 'high' ? '#ef4444' : insight.impact === 'medium' ? '#f59e0b' : '#10b981' 
                    }}>
                      {insight.impact.toUpperCase()}
                    </Typography>
                  </View>
                </View>
                <Typography variant="small" style={{ color: mutedForeground, lineHeight: 18 }}>{insight.description}</Typography>
                {insight.recommendation && (
                  <View style={styles.recommendationBox}>
                    <Info size={14} color="#6366f1" />
                    <Typography variant="small" style={styles.recommendationText}>{insight.recommendation}</Typography>
                  </View>
                )}
              </View>
            </Card>
          </Animated.View>
        ))}

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
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 24,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  periodButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  content: {
    padding: 20,
    marginTop: -20,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
  },
  metricIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  chartCard: {
    borderRadius: 28,
    marginBottom: 16,
    padding: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  chartContent: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  insightCard: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 0,
  },
  insightIndicator: {
    width: 6,
  },
  insightBody: {
    flex: 1,
    padding: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitleText: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  impactTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  recommendationText: {
    color: '#6366f1',
    marginLeft: 8,
    flex: 1,
  },
});

export default InsightsScreen;
