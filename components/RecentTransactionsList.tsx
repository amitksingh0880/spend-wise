import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Typography } from './ui/text';
import { Transaction } from '@/services/transactionService';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ArrowDownLeft, ArrowUpRight, Wallet, Clock, Tag } from 'lucide-react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';

interface RecentTransactionsListProps {
  transactions: Transaction[];
  onSeeAll?: () => void;
}

const TransactionItem = ({ transaction, index }: { transaction: Transaction, index: number }) => {
  const { formatAmount } = useCurrency();
  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  const border = useThemeColor({}, 'border');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const card = useThemeColor({}, 'card');

  const isIncome = transaction.type === 'income';
  
  // Custom pastel backgrounds for categories that work in both modes
  const getCategoryTheme = (name: string) => {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = isDark 
      ? ['#1e1b4b', '#2e1065', '#064e3b', '#4c1d95', '#701a75', '#831843'] // Darker deep tones
      : ['#D1FAE5', '#DBEAFE', '#F3E8FF', '#FCE7F3', '#FEE2E2', '#FEF3C7']; // Pastel light tones
    const textColors = isDark
      ? ['#818cf8', '#a78bfa', '#34d399', '#c084fc', '#f472b6', '#fb7185']
      : ['#065f46', '#1e40af', '#5b21b6', '#9d174d', '#991b1b', '#92400e'];
    
    return {
      bg: colors[hash % colors.length],
      text: textColors[hash % textColors.length]
    };
  };

  const catTheme = getCategoryTheme(transaction.category);
  const iconColor = isIncome ? '#10b981' : '#ef4444'; 

  const date = new Date(transaction.createdAt);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Animated.View entering={FadeInUp.delay(300 + index * 100).duration(500).springify()}>
      <TouchableOpacity style={[styles.transactionCard, { backgroundColor: card, borderColor: border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.categoryPill, { backgroundColor: catTheme.bg }]}>
            <Tag size={12} color={catTheme.text} style={{ marginRight: 4 }} />
            <Typography variant="small" style={{ color: catTheme.text, fontSize: 10, fontWeight: 'bold' }}>
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
  const primary = useThemeColor({}, 'primary');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="title" weight="bold" style={{ color: text, fontSize: 20 }}>
          Recent Transactions
        </Typography>
        <TouchableOpacity onPress={onSeeAll}>
          <Typography weight="bold" style={{ color: primary }}>
            See All
          </Typography>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {transactions.length > 0 ? (
          transactions.map((tx, idx) => (
            <View key={tx.id}>
              <TransactionItem transaction={tx} index={idx} />
            </View>
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
      },
      android: {
        elevation: 2,
      },
    }),
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

export default RecentTransactionsList;
