import TransactionForm from '@/app/components/TransactionForm';
import { deleteTransaction, getAllTransactions, searchTransactions } from '@/app/services/transactionService';
import Card from '@/components/ui/card';
import { Transaction } from '@/types';
import { ArrowDownLeft, ArrowUpRight, Plus, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

const TransactionItem = ({ 
  transaction, 
  onDelete 
}: { 
  transaction: Transaction; 
  onDelete: (id: string) => void;
}) => {
  const isIncome = transaction.type === 'income';
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
  const formattedDate = new Date(transaction.createdAt || transaction.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleLongPress = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(transaction.id) },
      ]
    );
  };

  return (
    <TouchableOpacity onLongPress={handleLongPress}>
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
    </TouchableOpacity>
  );
};

const TransactionsScreen: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [searchTerm, transactions]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const allTransactions = await getAllTransactions();
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = async () => {
    if (searchTerm.trim() === '') {
      setFilteredTransactions(transactions);
    } else {
      try {
        const searchResults = await searchTransactions(searchTerm);
        setFilteredTransactions(searchResults);
      } catch (error) {
        console.error('Error searching transactions:', error);
        setFilteredTransactions(transactions.filter(
          (t) =>
            t.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.category.toLowerCase().includes(searchTerm.toLowerCase())
        ));
      }
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      await loadTransactions(); // Reload transactions after deletion
    } catch (error) {
      console.error('Error deleting transaction:', error);
      Alert.alert('Error', 'Failed to delete transaction');
    }
  };

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

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TransactionItem 
              transaction={item} 
              onDelete={handleDeleteTransaction}
            />
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 64 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubtext}>
                {searchTerm ? 'Try adjusting your search' : 'Add your first transaction to get started'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowForm(true)}
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>

      <TransactionForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={loadTransactions}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#4f46e5',
    borderRadius: 999,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
  },
});

export default TransactionsScreen;
