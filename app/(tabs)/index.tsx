import React from 'react';
import { View, Text, ScrollView, StyleSheet, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, PiggyBank } from 'lucide-react-native';
import { Transaction } from '@/types';
import { MOCK_TRANSACTIONS } from '@/constants/mockData';
import Card from '@/components/ui/card';



const screenWidth = Dimensions.get('window').width;

const chartData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      data: [30, 45, 60, 25, 80, 120, 55],
    },
  ],
};

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
  const totalSpent = MOCK_TRANSACTIONS.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const savingsGoal = 500;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Dashboard</Text>

      <View style={styles.cardGrid}>
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardSubheading}>This Month's Spending</Text>
            <TrendingUp color="#4f46e5" />
          </View>
          <Text style={styles.cardValue}>${totalSpent.toFixed(2)}</Text>
        </Card>

        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardSubheading}>Savings Goal</Text>
            <PiggyBank color="#0ea5e9" />
          </View>
          <Text style={styles.cardValue}>${savingsGoal.toFixed(2)}</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.sectionHeading}>Weekly Spending</Text>
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

      <Card>
        <View style={styles.recentHeader}>
          <Text style={styles.sectionHeading}>Recent Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          scrollEnabled={false}
          data={MOCK_TRANSACTIONS.slice(0, 4)}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <TransactionItem transaction={item} />}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0f172a',
    flex: 1,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 20,
  },
  cardGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
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
});

export default DashboardScreen;
