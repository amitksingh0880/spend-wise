import TransactionForm from '@/components/TransactionForm';
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal';
import { useCurrency } from '@/contexts/CurrencyContext';
import { emitter } from '@/libs/emitter';
import { readJson, writeJson } from '@/libs/storage';
import { ExtractedExpense, parseTransactionSMS } from '@/services/smsService';
import { deleteTransaction, getFilteredTransactions, saveTransaction, Transaction, updateTransaction } from '@/services/transactionService';
import { scoreExplainableAnomalies, ExplainableAnomaly } from '@/services/modernIntelligenceService';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFocusEffect } from 'expo-router';
import { CheckCircle, Edit2, Trash2, AlertCircle, ShieldAlert, History, RotateCcw, XCircle, Info } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, StatusBar, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';

const SuspiciousScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [heldSuspicious, setHeldSuspicious] = useState<ExtractedExpense[]>([]);
  const [anomalyByTxId, setAnomalyByTxId] = useState<Record<string, ExplainableAnomaly>>({});
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [feedbackModalConfig, setFeedbackModalConfig] = useState<{
    title: string;
    message: string;
    tone: 'destructive' | 'primary';
  } | null>(null);

  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const border = useThemeColor({}, 'border');

  const loadSuspicious = async () => {
    try {
      setLoading(true);
      const suspicious = await getFilteredTransactions({ tags: ['suspicious'] });
      setTransactions(suspicious);

      const anomalies = await scoreExplainableAnomalies(suspicious);
      const byId = anomalies.reduce<Record<string, ExplainableAnomaly>>((acc, item) => {
        acc[item.transactionId] = item;
        return acc;
      }, {});
      setAnomalyByTxId(byId);
    } catch (error) {
      console.error('Error loading suspicious transactions', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHeldSuspicious = async () => {
    try {
      const held = await readJson<ExtractedExpense[]>('held_suspicious');
      setHeldSuspicious(held || []);
    } catch (err) {
      console.warn('Failed to load held suspicious items', err);
    }
  };

  useEffect(() => { loadSuspicious(); loadHeldSuspicious(); }, []);
  useFocusEffect(useCallback(() => { loadSuspicious(); loadHeldSuspicious(); }, []));

  const handleDelete = async (id: string) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    await deleteTransaction(pendingDeleteId);
    await loadSuspicious();
    emitter.emit('transactions:changed');
    setShowDeleteConfirm(false);
    setPendingDeleteId(null);
  };

  const handleMarkReviewed = async (tx: Transaction) => {
    try {
      const tags = (tx.tags || []).filter(t => t !== 'suspicious');
      await updateTransaction(tx.id, { tags: tags.length ? tags : undefined });
      await loadSuspicious();
      emitter.emit('transactions:changed');
    } catch (error) {
      setFeedbackModalConfig({
        title: 'Error',
        message: 'Failed to mark as reviewed',
        tone: 'destructive',
      });
    }
  };

  const handleEdit = (tx: Transaction) => { setEditing(tx); setShowForm(true); };

  const handleSaveHeld = async (expense: ExtractedExpense) => {
    try {
      setLoading(true);
      await saveTransaction({
        amount: expense.amount,
        type: expense.type,
        vendor: expense.vendor ?? 'Unknown',
        category: expense.category ?? 'other',
        description: `(Suspicious SMS) ${expense.description}`,
        tags: ['sms-import', 'suspicious'],
        smsData: {
          rawMessage: expense.rawMessage,
          sender: expense.sender || 'Unknown',
          timestamp: expense.timestamp || Date.now(),
        },
      });
      const updated = heldSuspicious.filter((e) => e !== expense);
      setHeldSuspicious(updated);
      await writeJson('held_suspicious', updated);
      emitter.emit('transactions:changed');
      await loadSuspicious();
    } catch (err) {
      setFeedbackModalConfig({
        title: 'Error',
        message: 'Failed to save transaction',
        tone: 'destructive',
      });
    } finally { setLoading(false); }
  };

  const TransactionCard = ({ item, index, isHeld = false, key }: { item: any; index: number; isHeld?: boolean; key?: string }) => {
    const date = new Date(isHeld ? item.timestamp : item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const anomaly = !isHeld ? anomalyByTxId[item.id] : undefined;

    return (
      <Animated.View 
        entering={FadeInUp.delay(index * 100).duration(500)}
        layout={Layout.springify()}
      >
        <Card style={styles.cardItem} delay={0}>
          <View style={styles.cardHeader}>
            <View style={[styles.alertBadge, { backgroundColor: isHeld ? '#fff7ed' : '#fef2f2' }]}>
              <AlertCircle size={14} color={isHeld ? '#f97316' : '#ef4444'} />
              <Typography variant="small" weight="bold" style={{ color: isHeld ? '#f97316' : '#ef4444', marginLeft: 4 }}>
                {isHeld ? 'PENDING' : 'FLAGGED'}
              </Typography>
            </View>
            <Typography variant="small" style={{ color: mutedForeground }}>{date}</Typography>
          </View>
          
          <View style={styles.cardBody}>
            <View style={{ flex: 1 }}>
              <Typography variant="bold" style={styles.vendorText}>{isHeld ? item.vendor : item.vendor}</Typography>
              <Typography variant="small" style={{ color: mutedForeground }}>{isHeld ? "Held from SMS" : item.category}</Typography>
            </View>
            <Typography variant="large" weight="bold" style={styles.amountText}>{formatAmount(item.amount)}</Typography>
          </View>

          {!isHeld && anomaly && (
            <View style={styles.anomalyBox}>
              <Typography variant="small" weight="bold" style={styles.anomalyTitle}>
                Why flagged (score {Math.round(anomaly.score)})
              </Typography>
              <View style={styles.reasonRow}>
                {anomaly.reasons.slice(0, 3).map(reason => (
                  <View key={`${item.id}-${reason.code}`} style={styles.reasonChip}>
                    <Typography variant="small" style={styles.reasonChipText}>{reason.code}</Typography>
                  </View>
                ))}
              </View>
              <Typography variant="small" style={{ color: mutedForeground, marginTop: 6 }}>
                {anomaly.summary}
              </Typography>
            </View>
          )}

          <View style={[styles.cardFooter, { borderTopColor: '#f1f5f9' }]}>
            <View style={styles.actionRow}>
              {isHeld ? (
                <>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f0fdf4' }]} onPress={() => handleSaveHeld(item)}>
                    <CheckCircle size={18} color="#22c55e" />
                    <Typography variant="small" weight="bold" style={{ color: '#22c55e', marginLeft: 6 }}>Approve</Typography>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => {}}>
                    <RotateCcw size={18} color={primary} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f0fdf4' }]} onPress={() => handleMarkReviewed(item)}>
                    <CheckCircle size={18} color="#22c55e" />
                    <Typography variant="small" weight="bold" style={{ color: '#22c55e', marginLeft: 6 }}>Verify</Typography>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                    <Edit2 size={18} color={primary} />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]} onPress={() => isHeld ? {} : handleDelete(item.id)}>
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <ConfirmActionModal
        visible={showDeleteConfirm}
        title="Delete Transaction"
        message="Permanently remove this transaction?"
        warning="This action cannot be undone"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmTone="destructive"
        blurIntensity={95}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setPendingDeleteId(null);
        }}
        onConfirm={confirmDelete}
      />
      <ConfirmActionModal
        visible={!!feedbackModalConfig}
        title={feedbackModalConfig?.title || 'Notice'}
        message={feedbackModalConfig?.message || ''}
        confirmLabel="OK"
        confirmTone={feedbackModalConfig?.tone || 'primary'}
        showCancel={false}
        blurIntensity={95}
        onCancel={() => setFeedbackModalConfig(null)}
        onConfirm={() => setFeedbackModalConfig(null)}
      />
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={isDark ? ['#7f1d1d', '#450a0a'] : ['#ef4444', '#991b1b']}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <ShieldAlert size={32} color="#FFFFFF" />
          <View style={styles.headerText}>
            <Typography variant="title" weight="bold" style={{ color: '#FFFFFF' }}>Security Check</Typography>
            <Typography style={{ color: 'rgba(255,255,255,0.7)' }}>Review high-value transactions</Typography>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {heldSuspicious.length > 0 && (
          <View style={styles.section}>
            <Typography variant="subtitle" weight="bold" style={styles.sectionTitle}>Held Transactions</Typography>
            {heldSuspicious.map((item, index) => (
              <TransactionCard key={`held-${index}`} item={item} index={index} isHeld />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Typography variant="subtitle" weight="bold" style={styles.sectionTitle}>Flagged History</Typography>
          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <CheckCircle size={40} color="#22c55e" />
              </View>
              <Typography variant="subtitle" weight="bold">All Clear!</Typography>
              <Typography variant="small" style={{ color: mutedForeground, textAlign: 'center', marginTop: 8 }}>
                No suspicious activities detected at this moment.
              </Typography>
            </View>
          ) : (
            transactions.map((item, index) => (
              <TransactionCard key={item.id} item={item} index={index} />
            ))
          )}
        </View>
      </ScrollView>

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
  container: { flex: 1 },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  cardItem: {
    marginBottom: 16,
    borderRadius: 24,
    padding: 0,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  vendorText: {
    fontSize: 17,
  },
  amountText: {
    color: '#ef4444',
  },
  cardFooter: {
    padding: 12,
    borderTopWidth: 1,
  },
  anomalyBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff7ed',
  },
  anomalyTitle: {
    color: '#9a3412',
  },
  reasonRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reasonChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ffedd5',
  },
  reasonChipText: {
    color: '#9a3412',
    fontSize: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
});

export default SuspiciousScreen;
