import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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

  const mutedForeground = useThemeColor({}, 'mutedForeground');

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

  const iconColor = isIncome ? '#10b981' : '#ef4444'; 

  const rawDate = transaction.smsData?.timestamp
    ? new Date(transaction.smsData.timestamp)
    : new Date(transaction.createdAt);
  const timeString = rawDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = rawDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <Animated.View entering={FadeInUp.delay(150 + index * 50).duration(400).springify()}>
      <View style={styles.row}>
        <View style={styles.cellDate}>
          <View style={styles.dateTimeWrapper}>
            <Clock size={12} color={mutedForeground} style={{ marginRight: 4 }} />
            <View>
              <Typography variant="small" style={{ color: mutedForeground }}>{dateString}</Typography>
              <Typography variant="small" style={{ color: mutedForeground }}>{timeString}</Typography>
            </View>
          </View>
        </View>
        <View style={styles.cellVendor}>
          <Typography variant="small" weight="bold" numberOfLines={1}>{transaction.vendor}</Typography>
        </View>
        <View style={styles.cellCategory}>
          <Typography variant="small" numberOfLines={1}>{transaction.category}</Typography>
        </View>
        <View style={styles.cellAmount}>
          <Typography variant="small" weight="bold" style={{ color: iconColor }}>
            {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
          </Typography>
        </View>
      </View>
    </Animated.View>
  );
};

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({ transactions, onSeeAll }) => {
  const text = useThemeColor({}, 'text');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const primary = useThemeColor({}, 'primary');
  const border = useThemeColor({}, 'border');

  const today = new Date().toDateString();
  const todayTransactions = transactions.filter(tx => {
    const d = tx.smsData?.timestamp
      ? new Date(tx.smsData.timestamp)
      : new Date(tx.createdAt);
    return d.toDateString() === today;
  });

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

      <View style={styles.tableWrapper}>
        <View style={[styles.headerRow, { borderBottomColor: border }]}> 
          <Typography variant="small" weight="bold" style={[styles.headerCell, styles.headerCellDate]}>Date</Typography>
          <Typography variant="small" weight="bold" style={[styles.headerCell, styles.headerCellVendor]}>Vendor</Typography>
          <Typography variant="small" weight="bold" style={[styles.headerCell, styles.headerCellCategory]}>Category</Typography>
          <Typography variant="small" weight="bold" style={[styles.headerCell, styles.headerCellAmount, { textAlign: 'right' }]}>Amount</Typography>
        </View>

        {todayTransactions.length > 0 ? (
          <View style={styles.list}>
            {todayTransactions.map((tx, idx) => (
              <View key={tx.id}>
                <TransactionItem transaction={tx} index={idx} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Wallet size={48} color={mutedForeground} />
            <Typography style={{ marginTop: 16, color: mutedForeground }}>
              No transactions for today
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
    gap: 4,
  },
  tableWrapper: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCell: {
    fontSize: 11,
  },
  headerCellDate: {
    flex: 1.3,
  },
  headerCellVendor: {
    flex: 2,
  },
  headerCellCategory: {
    flex: 1.4,
  },
  headerCellAmount: {
    flex: 1.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cellDate: {
    flex: 1.3,
  },
  cellVendor: {
    flex: 2,
    paddingRight: 6,
  },
  cellCategory: {
    flex: 1.4,
    paddingRight: 6,
  },
  cellAmount: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  dateTimeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  }
});

export default RecentTransactionsList;
