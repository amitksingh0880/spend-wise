import TransactionForm from '@/app/components/TransactionForm';
import { deleteTransaction, getFilteredTransactions, Transaction, updateTransaction } from '@/app/services/transactionService';
import { IconButton, PrimaryButton } from '@/components/ui/button';
import Card from '@/components/ui/card';
import { useFocusEffect } from 'expo-router';
import { CheckCircle, Edit2, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

const SuspiciousScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadSuspicious = async () => {
    try {
      setLoading(true);
      const suspicious = await getFilteredTransactions({ tags: ['suspicious'] });
      setTransactions(suspicious);
    } catch (error) {
      console.error('Error loading suspicious transactions', error);
      Alert.alert('Error', 'Failed to load suspicious transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSuspicious(); }, []);
  useFocusEffect(
    useCallback(() => { loadSuspicious(); }, [])
  );

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this suspicious transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTransaction(id); await loadSuspicious(); } }
    ]);
  };

  const handleMarkReviewed = async (tx: Transaction) => {
    try {
      const tags = (tx.tags || []).filter(t => t !== 'suspicious');
      await updateTransaction(tx.id, { tags: tags.length ? tags : undefined });
      await loadSuspicious();
    } catch (error) {
      console.error('Error marking reviewed', error);
      Alert.alert('Error', 'Failed to mark as reviewed');
    }
  };

  const handleEdit = (tx: Transaction) => { setEditing(tx); setShowForm(true); };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Review Suspicious Transactions</Text>

      <Card style={styles.infoCard}>
        <Text style={styles.infoText}>
          These transactions are flagged as suspicious (high amount). You can review, edit, mark them as reviewed, or delete them.
        </Text>
      </Card>

      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
        <PrimaryButton
          style={[styles.bulkButton, { marginRight: 8 }]}
          onPress={() => {
            Alert.alert('Mark All Reviewed', 'Mark all suspicious transactions as reviewed?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Mark All', onPress: async () => {
                try {
                  for (const tx of transactions) {
                    const tags = (tx.tags || []).filter(t => t !== 'suspicious');
                    await updateTransaction(tx.id, { tags: tags.length ? tags : undefined });
                  }
                  await loadSuspicious();
                } catch (err) {
                  console.error('Mark all reviewed failed', err);
                  Alert.alert('Error', 'Failed to mark all as reviewed');
                }
              } }
            ]);
          }}
        >
          <Text style={{ color: '#fff' }}>Mark All Reviewed</Text>
        </PrimaryButton>
        <PrimaryButton
          style={[styles.bulkButton, { backgroundColor: '#ef4444' }]}
          onPress={() => {
            Alert.alert('Delete All Suspicious', 'Delete all suspicious transactions?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete All', style: 'destructive', onPress: async () => {
                try {
                  for (const tx of transactions) await deleteTransaction(tx.id);
                  await loadSuspicious();
                } catch (err) {
                  console.error('Delete all failed', err);
                  Alert.alert('Error', 'Failed to delete all suspicious transactions');
                }
              } }
            ]);
          }}
        >
          <Text style={{ color: '#fff' }}>Delete All</Text>
  </PrimaryButton>
      </View>

      {transactions.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No suspicious transactions found.</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.cardItem}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.vendor}>{item.vendor}</Text>
                    <Text style={styles.amount}>₹{item.amount.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
                    <Text style={styles.confidence}>{(item.tags || []).find(t => t.startsWith('confidence:')) ?? ''}</Text>
                  </View>
                </View>

                <View style={styles.actions}>
                    <IconButton onPress={() => handleMarkReviewed(item)}>
                      <CheckCircle size={18} color="#10b981" />
                    </IconButton>
                    <IconButton onPress={() => handleEdit(item)}>
                      <Edit2 size={18} color="#4f46e5" />
                    </IconButton>
                    <IconButton onPress={() => handleDelete(item.id)}>
                      <Trash2 size={18} color="#ef4444" />
                    </IconButton>
                </View>
              </View>
            </Card>
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        />
      )}

      <TransactionForm
        visible={showForm}
        onClose={() => { setShowForm(false); setEditing(null); loadSuspicious(); }}
        onSuccess={() => { setShowForm(false); setEditing(null); loadSuspicious(); }}
        transaction={editing}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  heading: { fontSize: 24, fontWeight: '800', color: '#f9fafb', marginTop: 18, marginLeft: 16, marginBottom: 8 },
  infoCard: { margin: 16, padding: 12 },
  infoText: { color: '#94a3b8', fontSize: 14 },
  cardItem: { marginBottom: 12, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  vendor: { color: '#f9fafb', fontSize: 16, fontWeight: '700' },
  date: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  amount: { color: '#ef4444', fontSize: 18, fontWeight: '800', marginTop: 6 },
  confidence: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: 8, marginLeft: 8, borderRadius: 6, backgroundColor: 'transparent' },
  emptyContainer: { padding: 16 },
  emptyText: { color: '#9ca3af' },
  bulkButton: { alignSelf: 'flex-end', marginRight: 8, backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }
});

export default SuspiciousScreen;
