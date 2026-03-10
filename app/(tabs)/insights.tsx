import { generateFinancialInsights } from '@/app/services/analyticsService';
import { getTransactionSummary } from '@/app/services/transactionService';
import { CREDCard } from '@/components/ui/CREDCard';
import { CREDText } from '@/components/ui/CREDText';
import { CREDButton } from '@/components/ui/CREDButton';
import { ScreenHeader } from '@/app/components/MenuButton';
import { Activity, BarChart3, DollarSign, PieChart as PieChartIcon, TrendingUp, Info } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View, StatusBar as RNStatusBar } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { CRED_COLORS } from '@/constants/CREDTheme';

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

interface TransactionSummary {
  totalExpenses: number;
  transactionCount: number;
  totalIncome: number;
  categoryBreakdown: { [key: string]: number };
  monthlyTrend: { month: string; expenses: number }[];
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
        const colors = [
          CRED_COLORS.neonGreen, 
          CRED_COLORS.electricBlue, 
          CRED_COLORS.vibrantPurple, 
          CRED_COLORS.gold, 
          CRED_COLORS.coralRed,
          '#00D1FF', '#FF00C7'
        ];
        const breakdown = Object.entries(summaryData.categoryBreakdown).map(([category, amount], index) => ({
          name: category,
          amount: Number(amount) || 0,
          color: colors[index % colors.length],
          legendFontColor: CRED_COLORS.gray400,
          legendFontSize: 10,
        }));
        setCategoryData(breakdown);
      }
      
      if (summaryData?.monthlyTrend) {
        const trend = summaryData.monthlyTrend.slice(-6).map((item: any) => ({
          month: item.month?.slice(0, 3) || 'N/A',
          amount: Number(item.expenses) || 0,
        }));
        setSpendingTrend(trend);
      }
    } catch (error) {
      console.error('Error loading insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: CRED_COLORS.graphite,
    backgroundGradientFrom: CRED_COLORS.graphite,
    backgroundGradientTo: CRED_COLORS.graphite,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 224, 255, ${opacity})`, // Electric Blue
    labelColor: (opacity = 1) => `rgba(163, 163, 163, ${opacity})`,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: CRED_COLORS.gray800,
    },
    style: { borderRadius: 16 }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CRED_COLORS.black }}>
        <CREDText variant="body" color="gray500" glow>analyzing data patterns...</CREDText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <RNStatusBar barStyle="light-content" />
      <ScreenHeader title="Insights" />

      {/* Period Selector Toggle */}
      <CREDCard variant="glass" style={styles.periodCard}>
        <View style={styles.periodRow}>
          {(['week', 'month', 'year'] as const).map((period) => (
            <TouchableOpacity 
              key={period} 
              onPress={() => setSelectedPeriod(period)}
              style={[styles.periodBtn, selectedPeriod === period && styles.periodBtnActive]}
            >
              <CREDText 
                variant="caption" 
                weight="bold" 
                color={selectedPeriod === period ? 'black' : 'gray500'}
              >
                {period.toUpperCase()}
              </CREDText>
            </TouchableOpacity>
          ))}
        </View>
      </CREDCard>

      {/* Hero Analytics Metrics */}
      <View style={styles.heroRow}>
        <CREDCard variant="neon" glow accentColor={CRED_COLORS.electricBlue} style={styles.heroMetric}>
          <View style={styles.heroMetricHeader}>
            <DollarSign size={16} color={CRED_COLORS.electricBlue} />
            <CREDText variant="caption" color="gray400" weight="bold">TOTAL SPENT</CREDText>
          </View>
          <CREDText variant="h2" weight="black" style={styles.heroValue}>
             ${summary?.totalExpenses?.toFixed(0) || '0'}
          </CREDText>
          <View style={styles.heroChange}>
            <ChevronRight size={12} color={CRED_COLORS.neonGreen} style={{ transform: [{ rotate: '-90deg' }] }} />
            <CREDText variant="caption" color="neonGreen" weight="bold"> 5.2%</CREDText>
          </View>
        </CREDCard>

        <CREDCard variant="glass" style={styles.heroMetric}>
          <View style={styles.heroMetricHeader}>
            <Activity size={16} color={CRED_COLORS.vibrantPurple} />
            <CREDText variant="caption" color="gray400" weight="bold">ACTIVITY</CREDText>
          </View>
          <CREDText variant="h2" weight="black" style={styles.heroValue}>
            {summary?.transactionCount || 0}
          </CREDText>
          <CREDText variant="caption" color="gray500">transactions</CREDText>
        </CREDCard>
      </View>

      {/* Trend Analysis */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <CREDText variant="h3" weight="black" style={styles.sectionTitle}>SPENDING MOMENTUM</CREDText>
          <BarChart3 size={18} color={CRED_COLORS.gray600} />
        </View>
        <CREDCard variant="filled" style={styles.chartCard}>
          <LineChart
            data={{
              labels: spendingTrend.map(t => t.month),
              datasets: [{ data: spendingTrend.map(t => t.amount) }]
            }}
            width={screenWidth - 48}
            height={200}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(189, 0, 255, ${opacity})`, // Purple
            }}
            bezier
            style={styles.chart}
            withVerticalLines={false}
            withHorizontalLines={false}
            withDots={false}
          />
        </CREDCard>
      </View>

      {/* Category Distribution */}
      {categoryData.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CREDText variant="h3" weight="black" style={styles.sectionTitle}>ALLOCATION BY CATEGORY</CREDText>
            <PieChartIcon size={18} color={CRED_COLORS.gray600} />
          </View>
          <CREDCard variant="glass" style={styles.chartCard}>
            <PieChart
              data={categoryData}
              width={screenWidth - 48}
              height={200}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </CREDCard>
        </View>
      )}

      {/* AI Intelligence Block */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <CREDText variant="h3" weight="black" style={styles.sectionTitle}>AI INTELLIGENCE</CREDText>
          <Info size={18} color={CRED_COLORS.gray600} />
        </View>
        {insights.map((insight, idx) => (
          <CREDCard variant="glass" key={idx} style={styles.insightCard}>
            <View style={styles.insightHeader}>
               <View style={[styles.impactIndicator, { backgroundColor: insight.impact === 'high' ? CRED_COLORS.coralRed : insight.impact === 'medium' ? CRED_COLORS.gold : CRED_COLORS.neonGreen }]} />
               <CREDText variant="body" weight="black">{insight.title}</CREDText>
            </View>
            <CREDText variant="caption" color="gray400" style={styles.insightDesc}>
              {insight.description}
            </CREDText>
            {insight.recommendation && (
              <View style={styles.recommendationBox}>
                <CREDText variant="caption" color="electricBlue" weight="bold">
                   PRO TIP: {insight.recommendation}
                </CREDText>
              </View>
            )}
          </CREDCard>
        ))}
      </View>

      {/* Footer Padding */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CRED_COLORS.black,
    paddingHorizontal: 20,
  },
  periodCard: {
    marginTop: 10,
    marginBottom: 24,
    padding: 4,
    borderRadius: 14,
  },
  periodRow: {
    flexDirection: 'row',
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodBtnActive: {
    backgroundColor: CRED_COLORS.neonGreen,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  heroMetric: {
    width: '48%',
    padding: 16,
    height: 140,
    justifyContent: 'space-between',
  },
  heroMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroValue: {
    marginTop: 8,
  },
  heroChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    letterSpacing: 1.5,
    color: CRED_COLORS.gray500,
    fontSize: 12,
  },
  chartCard: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 24,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 24,
    paddingRight: 0,
  },
  insightCard: {
    marginBottom: 12,
    padding: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  impactIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  insightDesc: {
    lineHeight: 18,
  },
  recommendationBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  }
});

import { ChevronRight } from 'lucide-react-native';

export default InsightsScreen;
