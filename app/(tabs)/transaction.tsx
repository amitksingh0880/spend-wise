import { emitter } from '@/libs/emitter';
import SMSImport from '@/components/SMSImport';
import TransactionForm from '@/components/TransactionForm';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  deleteTransaction,
  getAllTransactions,
  getFilteredTransactions,
  Transaction
} from '@/services/transactionService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFocusEffect } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Calendar, MessageCircle, Plus, Search, X, Filter, SlidersHorizontal } from 'lucide-react-native';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';

const screenWidth = Dimensions.get('window').width;

const TransactionItem = ({ 
  transaction, 
  index,
  onDelete,
  onEdit,
  key
}: { 
  transaction: Transaction; 
  index: number;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  key?: string;
}) => {
  const { formatAmount } = useCurrency();
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const border = useThemeColor({}, 'border');
  const isIncome = transaction.type === 'income';
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;
  const txDate = transaction.smsData?.timestamp
    ? new Date(transaction.smsData.timestamp)
    : new Date(transaction.createdAt);
  const formattedDate = txDate.toLocaleDateString(undefined, {
    month: 'short',
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
    <Animated.View 
      entering={FadeInUp.delay(index * 50).duration(500).springify()}
      layout={Layout.springify()}
    >
      <TouchableOpacity 
        onPress={() => onEdit(transaction)} 
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        <Card style={styles.transactionCard} delay={0}>
          <View style={styles.transactionRow}>
            <View style={styles.leftGroup}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isIncome ? '#f0fdf4' : '#fef2f2' },
                ]}
              >
                <Icon
                  size={20}
                  color={isIncome ? '#22c55e' : '#ef4444'}
                  strokeWidth={2.5}
                />
              </View>
              <View>
                <Typography variant="bold" style={styles.vendorText}>{transaction.vendor}</Typography>
                <Typography variant="small" style={{ color: mutedForeground }}>{transaction.category}</Typography>
              </View>
            </View>

            <View style={styles.rightGroup}>
              <Typography 
                variant="bold" 
                style={[styles.amountText, isIncome ? styles.income : styles.expense]}
              >
                {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
              </Typography>
              <Typography variant="small" style={{ color: mutedForeground }}>{formattedDate}</Typography>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
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
  const [lastScrollY, setLastScrollY] = useState(0);

  const background = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const primaryForeground = useThemeColor({}, 'primaryForeground');
  const mutedForeground = useThemeColor({}, 'mutedForeground');

  const sortNewestFirst = (items: Transaction[]): Transaction[] => {
    return [...items].sort((a, b) => {
      const aTime = a.smsData?.timestamp ?? new Date(a.createdAt).getTime();
      const bTime = b.smsData?.timestamp ?? new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  };

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
      setTransactions(sortNewestFirst(allTransactions));
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = async () => {
    try {
      if (searchTerm.trim() === '' && !showTodayOnly) {
        setFilteredTransactions(sortNewestFirst(transactions));
      } else {
        const filters: any = {};
        if (searchTerm.trim() !== '') filters.vendor = searchTerm;
        if (showTodayOnly) {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
          filters.dateFrom = startOfDay.toISOString();
          filters.dateTo = endOfDay.toISOString();
        }
        const filtered = await getFilteredTransactions(filters);
        setFilteredTransactions(sortNewestFirst(filtered));
      }
    } catch (error) {
      let filtered = transactions;
      if (searchTerm.trim() !== '') {
        filtered = transactions.filter(t => 
          t.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (showTodayOnly) {
        const todayString = new Date().toDateString();
        filtered = filtered.filter(t => {
          const date = t.smsData?.timestamp
            ? new Date(t.smsData.timestamp)
            : new Date(t.createdAt);
          return date.toDateString() === todayString;
        });
      }
      setFilteredTransactions(sortNewestFirst(filtered));
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      await loadTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
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
    <View style={[styles.container, { backgroundColor: background }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.headerGradient}
      >
        <Typography variant="title" weight="bold" style={styles.headerTitle}>Transactions</Typography>
        
        <View style={[styles.searchWrapper, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Search size={18} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: '#FFFFFF' }]}
            placeholder="Search merchants, categories..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm !== '' && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <X size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <TouchableOpacity
            style={[
              styles.filterChip, 
              showTodayOnly && { backgroundColor: '#FFFFFF' }
            ]}
            onPress={() => setShowTodayOnly(!showTodayOnly)}
          >
            <Calendar size={14} color={showTodayOnly ? '#0f172a' : 'rgba(255,255,255,0.6)'} />
            <Typography 
              variant="small" 
              weight="bold"
              style={[styles.filterChipText, showTodayOnly && { color: '#0f172a' }]}
            >
              Today
            </Typography>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.filterChip}>
            <SlidersHorizontal size={14} color="rgba(255,255,255,0.6)" />
            <Typography variant="small" weight="bold" style={styles.filterChipText}>Filters</Typography>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Typography variant="muted">Refreshing transactions...</Typography>
          </View>
        ) : (
          <FlatList
            onScroll={(event: any) => {
              const currentY = event.nativeEvent.contentOffset.y;
              const velocity = event.nativeEvent.velocity?.y ?? 0;
              if (currentY <= 0) {
                emitter.emit('tab-bar:show');
              } else if (velocity > 0.5 && currentY > lastScrollY + 10) {
                emitter.emit('tab-bar:hide');
              } else if (velocity < -0.5 || currentY < lastScrollY - 20) {
                emitter.emit('tab-bar:show');
              }
              setLastScrollY(currentY);
            }}
            scrollEventThrottle={16}
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TransactionItem 
                transaction={item} 
                index={index}
                onDelete={handleDeleteTransaction}
                onEdit={handleEditTransaction}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Typography variant="subtitle" weight="bold">No transactions</Typography>
                <Typography variant="small" style={{ color: mutedForeground, textAlign: 'center', marginTop: 8 }}>
                  {searchTerm ? "We couldn't find anything matching your search." : "Your transaction history will appear here."}
                </Typography>
              </View>
            }
          />
        )}
      </View>

      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={[styles.miniFab, { backgroundColor: '#334155' }]}
          onPress={() => setShowSMSImport(true)}
        >
          <MessageCircle size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.mainFab, { backgroundColor: primary }]}
          onPress={() => setShowForm(true)}
        >
          <Plus size={28} color={primaryForeground} />
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
        <View style={[styles.modalContainer, { backgroundColor: background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: border }]}>
            <Typography variant="subtitle" weight="bold">Import Data</Typography>
            <TouchableOpacity
              style={[styles.closeModalButton, { backgroundColor: primary }]}
              onPress={() => setShowSMSImport(false)}
            >
              <Typography variant="small" weight="bold" style={{ color: primaryForeground }}>Close</Typography>
            </TouchableOpacity>
          </View>
          <SMSImport
            onImportComplete={(result) => {
              setShowSMSImport(false);
              loadTransactions();
              Alert.alert('Import Success', `Added ${result.expenses.length} transactions.`);
            }}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    marginBottom: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  filtersScroll: {
    marginTop: 16,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    gap: 6,
  },
  filterChipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  transactionCard: {
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  vendorText: {
    fontSize: 16,
    marginBottom: 2,
  },
  rightGroup: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    marginBottom: 2,
  },
  income: {
    color: '#22c55e',
  },
  expense: {
    color: '#ef4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
    bottom: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  miniFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  closeModalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
});

export default TransactionsScreen;
