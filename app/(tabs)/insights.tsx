import { generateFinancialInsights } from '@/services/analyticsService';
import { getAllTransactions, getTransactionSummary } from '@/services/transactionService';
import { getAllBudgets, Budget } from '@/services/budgetService';
import {
  queryOfflineCopilot,
  simulateWhatIfScenario,
  OfflineCopilotResponse,
  WhatIfSimulationResult,
} from '@/services/modernIntelligenceService';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Activity, BarChart3, DollarSign, PieChart as PieChartIcon, TrendingUp, Calendar, Info } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View, StatusBar, Platform, TextInput } from 'react-native';
import { BarChart, LineChart, PieChart, StackedBarChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAppTheme } from '@/contexts/ThemeContext';

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
  const { formatAmount } = useCurrency();
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [spendingTrend, setSpendingTrend] = useState<SpendingTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [whatIfInput, setWhatIfInput] = useState('rent +10%, fuel +15%');
  const [whatIfResult, setWhatIfResult] = useState<WhatIfSimulationResult | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState('show unusual food spends this week');
  const [copilotResponse, setCopilotResponse] = useState<OfflineCopilotResponse | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  const background = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const primaryForeground = useThemeColor({}, 'primaryForeground');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const text = useThemeColor({}, 'text');

  const loadInsightsData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryData, insightsData, txData, budgetsData] = await Promise.all([
        getTransactionSummary(),
        generateFinancialInsights(),
        getAllTransactions(),
        getAllBudgets(),
      ]);

      setSummary(summaryData || null);
      setInsights(insightsData || []);
      setAllTransactions(txData || []);
      setAllBudgets(budgetsData || []);

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
  }, [mutedForeground]);

  useEffect(() => {
    loadInsightsData();
  }, [loadInsightsData, selectedPeriod]);

  const handleRunWhatIf = async () => {
    if (!whatIfInput.trim() || allTransactions.length === 0) return;
    try {
      setWhatIfLoading(true);
      const result = await simulateWhatIfScenario(whatIfInput, allTransactions as any);
      setWhatIfResult(result);
    } catch (error) {
      console.error('What-if simulation error:', error);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const handleAskCopilot = async (question?: string) => {
    const textQuestion = (question ?? copilotQuestion).trim();
    if (!textQuestion || allTransactions.length === 0) return;

    try {
      setCopilotLoading(true);
      if (question) setCopilotQuestion(question);
      const response = await queryOfflineCopilot(textQuestion, allTransactions as any, allBudgets);
      setCopilotResponse(response);
    } catch (error) {
      console.error('Offline copilot error:', error);
    } finally {
      setCopilotLoading(false);
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
    
    const topCats = categoryData.slice(0, 4); // Show top 4 to give labels more space
    return {
      labels: topCats.map((cat) => cat.name.length > 8 ? cat.name.substring(0, 7) + '..' : cat.name),
      datasets: [{
        data: topCats.map((cat) => cat.amount),
      }],
    };
  }, [categoryData]);

  const currencySymbol = useMemo(() => {
    return formatAmount(0).replace(/[0-9.,\s-]/g, '');
  }, [formatAmount]);

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
            <Typography variant="large" weight="bold">{formatAmount(summary?.totalExpenses || 0)}</Typography>
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
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 4 }} />
                <Typography variant="small" style={{ fontSize: 10, color: mutedForeground }}>Income</Typography>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginRight: 4 }} />
                <Typography variant="small" style={{ fontSize: 10, color: mutedForeground }}>Expenses</Typography>
              </View>
            </View>
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
                style: { borderRadius: 16 },
                propsForBackgroundLines: { strokeWidth: 1, stroke: 'rgba(255,255,255,0.05)' }
              }}
              style={styles.chart}
              hideLegend={true}
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
                propsForDots: { r: "4", strokeWidth: "2", stroke: cardColor },
                style: { borderRadius: 16 },
                propsForBackgroundLines: { strokeWidth: 1, stroke: 'rgba(255,255,255,0.05)' }
              }}
              bezier
              style={styles.chart}
              yAxisLabel={currencySymbol}
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
                  width={screenWidth - 60}
                  height={220}
                  yAxisLabel={currencySymbol}
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: cardColor,
                    backgroundGradientFrom: cardColor,
                    backgroundGradientTo: cardColor,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                    labelColor: (opacity = 1) => mutedForeground,
                    style: { borderRadius: 16 },
                    barPercentage: 0.5,
                    propsForBackgroundLines: { strokeWidth: 1, stroke: 'rgba(255,255,255,0.05)' }
                  }}
                  style={styles.chart}
                  showValuesOnTopOfBars={false}
                  withHorizontalLabels={true}
                  fromZero={true}
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
                paddingLeft="15"
                absolute
                hasLegend={false}
              />
              <View style={styles.categoryList}>
                {categoryData.slice(0, 6).map((cat, idx) => (
                  <View key={cat.name} style={[styles.categoryBadge, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#f1f5f9' }]}>
                    <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                    <Typography variant="small" weight="medium" style={{ color: text }}>{cat.name}</Typography>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
          </View>
        )}

        <Card style={styles.chartCard} delay={470}>
          <CardHeader style={styles.chartHeader}>
            <View>
              <Typography variant="bold">What-if Simulator</Typography>
              <Typography variant="small" style={{ color: mutedForeground }}>Test forecast impact before month-end</Typography>
            </View>
            <Calendar size={20} color={mutedForeground} />
          </CardHeader>
          <CardContent>
            <TextInput
              value={whatIfInput}
              onChangeText={setWhatIfInput}
              placeholder="e.g. rent +10%, fuel +15%"
              placeholderTextColor={mutedForeground}
              style={[styles.smartInput, { borderColor: border, color: text, backgroundColor: cardColor }]}
            />
            <TouchableOpacity
              style={[styles.smartActionBtn, { backgroundColor: primary }]}
              onPress={handleRunWhatIf}
              disabled={whatIfLoading}
            >
              <Typography variant="small" weight="bold" style={{ color: primaryForeground }}>
                {whatIfLoading ? 'Simulating...' : 'Run Scenario'}
              </Typography>
            </TouchableOpacity>

            {whatIfResult && (
              <View style={styles.smartResultBox}>
                <Typography variant="small" style={{ color: mutedForeground }}>
                  Baseline: {formatAmount(whatIfResult.baselineTotal)}
                </Typography>
                <Typography variant="small" style={{ color: mutedForeground }}>
                  Projected: {formatAmount(whatIfResult.projectedTotal)}
                </Typography>
                <Typography variant="small" weight="bold" style={{ color: whatIfResult.delta >= 0 ? '#ef4444' : '#10b981' }}>
                  Impact: {whatIfResult.delta >= 0 ? '+' : ''}{formatAmount(whatIfResult.delta)}
                </Typography>

                {whatIfResult.impacts.slice(0, 4).map((impact) => (
                  <View key={impact.category} style={styles.smartLineItem}>
                    <Typography variant="small">{impact.category}</Typography>
                    <Typography variant="small" style={{ color: mutedForeground }}>
                      {impact.percentChange > 0 ? '+' : ''}{impact.percentChange}%
                    </Typography>
                  </View>
                ))}
              </View>
            )}
          </CardContent>
        </Card>

        <Card style={styles.chartCard} delay={500}>
          <CardHeader style={styles.chartHeader}>
            <View>
              <Typography variant="bold">Offline Copilot</Typography>
              <Typography variant="small" style={{ color: mutedForeground }}>Ask natural-language questions locally</Typography>
            </View>
            <Info size={20} color={mutedForeground} />
          </CardHeader>
          <CardContent>
            <TextInput
              value={copilotQuestion}
              onChangeText={setCopilotQuestion}
              placeholder="Ask about unusual spends, top categories, or budget status"
              placeholderTextColor={mutedForeground}
              style={[styles.smartInput, { borderColor: border, color: text, backgroundColor: cardColor }]}
            />

            <View style={styles.promptRow}>
              {[
                'show unusual food spends this week',
                'what are my top categories',
                'budget status',
              ].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.promptChip, { borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  onPress={() => handleAskCopilot(item)}
                >
                  <Typography variant="small" style={{ color: mutedForeground }}>{item}</Typography>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.smartActionBtn, { backgroundColor: primary }]}
              onPress={() => handleAskCopilot()}
              disabled={copilotLoading}
            >
              <Typography variant="small" weight="bold" style={{ color: primaryForeground }}>
                {copilotLoading ? 'Thinking...' : 'Ask Copilot'}
              </Typography>
            </TouchableOpacity>

            {copilotResponse && (
              <View style={styles.smartResultBox}>
                <Typography variant="small" style={{ color: mutedForeground, marginBottom: 6 }}>
                  Intent: {copilotResponse.intent}
                </Typography>
                <Typography variant="small">{copilotResponse.answer}</Typography>
              </View>
            )}
          </CardContent>
        </Card>

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
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
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
  smartInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: 10,
  },
  smartActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
  },
  smartResultBox: {
    marginTop: 10,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  smartLineItem: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  promptChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

export default InsightsScreen;
