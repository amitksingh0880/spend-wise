import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react-native';
import { Transaction } from '@/types';
import Card from '@/components/ui/card';
import { MOCK_TRANSACTIONS } from '@/constants/mockData';

const screenWidth = Dimensions.get('window').width;

const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
  const isIncome = transaction.type === 'income';
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
  const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card style={styles.transactionCard}>
      <View style={styles.transactionRow}>
        <View style={styles.leftGroup}>
          <View
            style={[
              styles.iconBox,
              isIncome ? styles.incomeIcon : styles.expenseIcon,
            ]}
          >
            <Icon
              size={20}
              color={isIncome ? '#22c55e' : '#ef4444'}
              strokeWidth={2}
            />
          </View>
          <View>
            <Text style={styles.vendor}>{transaction.vendor}</Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
        </View>

        <View style={styles.rightGroup}>
          <Text style={[styles.amount, isIncome ? styles.income : styles.expense]}>
            {isIncome ? '+' : '-'}${transaction.amount.toFixed(2)}
          </Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{transaction.category}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
};

const TransactionsScreen: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = MOCK_TRANSACTIONS.filter(
    (t) =>
      t.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Transaction History</Text>

      <View style={styles.searchWrapper}>
        <Search size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor="#9ca3af"
          value={searchTerm}
          onChangeText={(text) => setSearchTerm(text)}
        />
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <TransactionItem transaction={item} />}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 64 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0f172a',
    flex: 1,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 12,
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  searchIcon: {
    position: 'absolute',
    top: 14,
    left: 12,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#f3f4f6',
  },
  transactionCard: {
    marginBottom: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeIcon: {
    backgroundColor: '#dcfce7',
  },
  expenseIcon: {
    backgroundColor: '#fee2e2',
  },
  vendor: {
    fontWeight: '700',
    fontSize: 16,
    color: '#f9fafb',
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  rightGroup: {
    alignItems: 'flex-end',
  },
  amount: {
    fontWeight: '700',
    fontSize: 16,
  },
  income: {
    color: '#22c55e',
  },
  expense: {
    color: '#ef4444',
  },
  categoryBadge: {
    backgroundColor: '#1f2937',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    marginTop: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#e5e7eb',
  },
});

export default TransactionsScreen;
