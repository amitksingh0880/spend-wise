import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from './ui/text';
import { Transaction } from '@/services/transactionService';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ArrowDownLeft, ArrowUpRight, Wallet, Clock, Tag } from 'lucide-react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface RecentTransactionsListProps {
  transactions: Transaction[];
  onSeeAll?: () => void;
}

const TransactionItem = ({ transaction, index }: { transaction: Transaction, index: number }) => {
  const { formatAmount } = useCurrency();
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const card = useThemeColor({}, 'card');

  const isIncome = transaction.type === 'income';
  
  // Create a pastel background color based on the category string length as a deterministic pseudo-randomizer
  const pastelColors = ['#FEE2E2', '#FEF3C7', '#D1FAE5', '#DBEAFE', '#F3E8FF', '#FCE7F3'];
  const iconBgColor = pastelColors[transaction.category.length % pastelColors.length];
  
  // Map standard icons
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
  const iconColor = isIncome ? '#059669' : '#DC2626';

  const date = new Date(transaction.createdAt);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Animated.View entering={FadeInUp.delay(300 + index * 100).duration(500).springify()}>
      <TouchableOpacity style={[styles.transactionCard, { backgroundColor: card, borderColor: border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.categoryPill, { backgroundColor: iconBgColor }]}>
            <Tag size={12} color="#4B5563" style={{ marginRight: 4 }} />
            <Typography variant="small" style={{ color: '#4B5563', fontSize: 10 }}>
              {transaction.category}
            </Typography>
          </View>
        </View>

        <Typography variant="large" weight="bold" style={styles.vendorText}>
          {transaction.vendor}
        </Typography>

        <View style={styles.cardFooter}>
          <View style={styles.timeWrapper}>
            <Clock size={14} color={mutedForeground} style={{ marginRight: 4 }} />
            <Typography variant="small" style={{ color: mutedForeground }}>
              {timeString}
            </Typography>
          </View>
          
          <Typography variant="bold" style={{ color: iconColor }}>
            {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
          </Typography>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({ transactions, onSeeAll }) => {
  const text = useThemeColor({}, 'text');
  const mutedForeground = useThemeColor({}, 'mutedForeground');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="title" weight="bold" style={{ color: text, fontSize: 20 }}>
          Recent Transactions
        </Typography>
        <TouchableOpacity onPress={onSeeAll}>
          <Typography weight="bold" style={{ color: '#FF7A00' }}>
            See All
          </Typography>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {transactions.length > 0 ? (
          transactions.map((tx, idx) => (
            <TransactionItem key={tx.id} transaction={tx} index={idx} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Wallet size={48} color={mutedForeground} />
            <Typography style={{ marginTop: 16, color: mutedForeground }}>
              No transactions yet
            </Typography>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 100, // padding for custom tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  list: {
    gap: 16,
  },
  transactionCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vendorText: {
    marginBottom: 16,
    fontSize: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  }
});
