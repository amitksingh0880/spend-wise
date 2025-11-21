import SMSImport from '@/app/components/SMSImport';
import TransactionForm from '@/app/components/TransactionForm';
import { useCurrency } from '@/app/contexts/CurrencyContext';
import {
  deleteTransaction,
  getAllTransactions,
  getFilteredTransactions,
  Transaction
} from '@/app/services/transactionService';
import Card from '@/components/ui/card';
import { useFocusEffect } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Calendar, MessageCircle, Plus, Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

const TransactionItem = ({ 
  transaction, 
  onDelete,
  onEdit
}: { 
  transaction: Transaction; 
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
}) => {
  const { formatAmount } = useCurrency();
  const isIncome = transaction.type === 'income';
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
  const formattedDate = new Date(transaction.createdAt).toLocaleDateString('en-US', {
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
    <TouchableOpacity onPress={() => onEdit(transaction)} onLongPress={handleLongPress}>
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
              {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
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
  const [showSMSImport, setShowSMSImport] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showTodayOnly, setShowTodayOnly] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  useEffect(() => {
    filterTransactions();
  }, [searchTerm, transactions, showTodayOnly]);

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
    try {
      if (searchTerm.trim() === '' && !showTodayOnly) {
        setFilteredTransactions(transactions);
      } else {
        // Use advanced filtering for search and date filtering
        const filters: any = {};
        
        if (searchTerm.trim() !== '') {
          filters.vendor = searchTerm;
        }
        
        if (showTodayOnly) {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
          filters.dateFrom = startOfDay.toISOString();
          filters.dateTo = endOfDay.toISOString();
        }
        
        const filtered = await getFilteredTransactions(filters);
        setFilteredTransactions(filtered);
      }
    } catch (error) {
      console.error('Error filtering transactions:', error);
      // Fallback to basic filtering
      let filtered = transactions;
      
      if (searchTerm.trim() !== '') {
        filtered = transactions.filter(
          (t) =>
            t.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (showTodayOnly) {
        const today = new Date();
        const todayString = today.toDateString();
        filtered = filtered.filter(t => 
          new Date(t.createdAt).toDateString() === todayString
        );
      }
      
      setFilteredTransactions(filtered);
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

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTransaction(null);
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

      {/* Today's Date Filter Toggle */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, showTodayOnly && styles.filterButtonActive]}
          onPress={() => setShowTodayOnly(!showTodayOnly)}
        >
          <Calendar size={16} color={showTodayOnly ? "#ffffff" : "#9ca3af"} />
          <Text style={[styles.filterButtonText, showTodayOnly && styles.filterButtonTextActive]}>
            Today's Transactions
          </Text>
        </TouchableOpacity>
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
              onEdit={handleEditTransaction}
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

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.smsImportButton}
          onPress={() => setShowSMSImport(true)}
        >
          <MessageCircle size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Plus size={28} color="white" />
        </TouchableOpacity>
      </View>

      <TransactionForm
        visible={showForm}
        onClose={handleCloseForm}
        onSuccess={loadTransactions}
        transaction={editingTransaction}
      />

      <Modal
        visible={showSMSImport}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSMSImport(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import from SMS</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSMSImport(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
          <SMSImport
            onImportComplete={(result) => {
              setShowSMSImport(false);
              loadTransactions(); // Refresh the transaction list
              Alert.alert(
                'Import Complete',
                `Successfully imported ${result.expenses.length} expenses from SMS.`
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#0f172a',
    flex: 1,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  searchIcon: {
    position: 'absolute',
    top: 18,
    left: 16,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 44,
    paddingRight: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
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
  actionButtons: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    flexDirection: 'row',
    gap: 12,
  },
  smsImportButton: {
    backgroundColor: '#06b6d4',
    borderRadius: 999,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
  },
  addButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 999,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    backgroundColor: '#0f172a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f9fafb',
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  filterRow: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
    marginLeft: 8,
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
});

export default TransactionsScreen;
