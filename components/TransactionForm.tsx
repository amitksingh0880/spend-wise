import { useCurrency } from '@/contexts/CurrencyContext';
import { getAllCategories } from '@/services/categoryService';
import { saveSplitTransactions, saveTransaction, Transaction, updateTransaction } from '@/services/transactionService';
import { getCurrencySymbol } from '@/utils/currency';
import { FileText, Tag, X } from 'lucide-react-native';
import React, { useEffect, useState, useContext } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Typography } from '@/components/ui/text';
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal';
import { useThemeColor } from '@/hooks/use-theme-color';
import ThemeContext from '@/contexts/ThemeContext';

interface TransactionFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: Transaction | null;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  visible,
  onClose,
  onSuccess,
  transaction = null,
}) => {
  const { currency } = useCurrency();
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackModalConfig, setFeedbackModalConfig] = useState<{
    title: string;
    message: string;
    tone: 'destructive' | 'primary';
  } | null>(null);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splits, setSplits] = useState<{ id: string; amount: string; category: string; description: string }[]>([
    { id: '1', amount: '', category: '', description: '' },
    { id: '2', amount: '', category: '', description: '' },
  ]);

  // Theme Hooks
  const background = useThemeColor({}, 'background');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const text = useThemeColor({}, 'text');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  
  const ctx = useContext(ThemeContext);
  const isDark = (ctx?.theme ?? 'dark') === 'dark';

  useEffect(() => {
    if (visible) {
      loadCategories();
      // Pre-fill form if editing existing transaction
      if (transaction) {
        setAmount((transaction as Transaction).amount.toString());
        setVendor((transaction as Transaction).vendor);
        setCategory((transaction as Transaction).category);
        if ((transaction as any).smsData) setDescription('');
        else setDescription((transaction as Transaction).description || '');
        setType((transaction as Transaction).type);
      } else {
        resetForm();
      }
    }
  }, [visible, transaction]);

  const loadCategories = async () => {
    try {
      const allCategories = await getAllCategories();
      setCategories(allCategories);
      
      const defaultCategory = allCategories.find(cat => 
        cat.type === type || cat.type === 'both'
      );
      if (defaultCategory) {
        setCategory(defaultCategory.name);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const resetForm = () => {
    setAmount('');
    setVendor('');
    setCategory('');
    setDescription('');
    setType('expense');
    setSplitEnabled(false);
    setSplits([
      { id: '1', amount: '', category: '', description: '' },
      { id: '2', amount: '', category: '', description: '' },
    ]);
  };

  const updateSplit = (id: string, key: 'amount' | 'category' | 'description', value: string) => {
    setSplits(prev => prev.map(split => (split.id === id ? { ...split, [key]: value } : split)));
  };

  const addSplit = () => {
    setSplits(prev => [
      ...prev,
      { id: `${Date.now()}-${prev.length + 1}`, amount: '', category: '', description: '' },
    ]);
  };

  const removeSplit = (id: string) => {
    setSplits(prev => (prev.length > 2 ? prev.filter(split => split.id !== id) : prev));
  };

  const handleSubmit = async () => {
    const requiresPrimaryCategory = !(splitEnabled && !transaction && type === 'expense');
    if (!amount || !vendor || (requiresPrimaryCategory && !category)) {
      setFeedbackModalConfig({
        title: 'Error',
        message: 'Please fill in all required fields',
        tone: 'destructive',
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFeedbackModalConfig({
        title: 'Error',
        message: 'Please enter a valid amount',
        tone: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      if (!transaction && type === 'expense' && splitEnabled) {
        const normalizedSplits = splits
          .map(split => ({
            amount: parseFloat(split.amount),
            category: split.category.trim(),
            description: split.description.trim(),
          }))
          .filter(split => split.amount > 0 || split.category.length > 0 || split.description.length > 0);

        if (normalizedSplits.length < 2) {
          setFeedbackModalConfig({
            title: 'Error',
            message: 'Add at least 2 valid split rows.',
            tone: 'destructive',
          });
          return;
        }

        const hasInvalid = normalizedSplits.some(split => Number.isNaN(split.amount) || split.amount <= 0 || !split.category);
        if (hasInvalid) {
          setFeedbackModalConfig({
            title: 'Error',
            message: 'Each split must have a valid amount and category.',
            tone: 'destructive',
          });
          return;
        }

        const splitTotal = normalizedSplits.reduce((sum, split) => sum + split.amount, 0);
        if (Math.abs(splitTotal - numAmount) > 0.01) {
          setFeedbackModalConfig({
            title: 'Error',
            message: `Split total ${splitTotal.toFixed(2)} must match amount ${numAmount.toFixed(2)}.`,
            tone: 'destructive',
          });
          return;
        }

        await saveSplitTransactions(
          {
            vendor,
            type,
            amount: numAmount,
            description: description || undefined,
          },
          normalizedSplits
        );

        resetForm();
        onSuccess();
        onClose();
        return;
      }
      
      if (transaction) {
        await updateTransaction((transaction as Transaction).id, {
          amount: numAmount,
          vendor,
          category,
          type,
          description: description || undefined,
        });
      } else {
        await saveTransaction({
          amount: numAmount,
          vendor,
          category,
          type,
          description: description || undefined,
        });
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      setFeedbackModalConfig({
        title: 'Error',
        message: 'Failed to save transaction',
        tone: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.type === type || cat.type === 'both'
  );

  return (
    <>
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

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: background }]}
      >
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Typography variant="title" weight="bold" style={{ color: text }}>
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </Typography>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <X size={24} color={mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          {/* Transaction Type */}
          <View style={[styles.typeContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'expense' && { backgroundColor: primary },
              ]}
              onPress={() => {
                setType('expense');
              }}
            >
              <Typography
                weight="bold"
                style={{ color: type === 'expense' ? '#FFFFFF' : mutedForeground }}
              >
                Expense
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'income' && { backgroundColor: primary },
              ]}
              onPress={() => {
                setType('income');
                setSplitEnabled(false);
              }}
            >
              <Typography
                weight="bold"
                style={{ color: type === 'income' ? '#FFFFFF' : mutedForeground }}
              >
                Income
              </Typography>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.inputGroup}>
            <Typography weight="bold" style={[styles.label, { color: text }]}>Amount *</Typography>
            <View style={[styles.inputWrapper, { backgroundColor: card, borderColor: border }]}>
              <Typography weight="bold" style={[styles.currencySymbol, { color: mutedForeground }]}>{getCurrencySymbol(currency)}</Typography>
              <TextInput
                style={[styles.input, { color: text }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={mutedForeground}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Vendor */}
          <View style={styles.inputGroup}>
            <Typography weight="bold" style={[styles.label, { color: text }]}>Vendor/Source *</Typography>
            <View style={[styles.inputWrapper, { backgroundColor: card, borderColor: border }]}>
              <Tag size={20} color={mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: text }]}
                value={vendor}
                onChangeText={setVendor}
                placeholder={type === 'expense' ? 'Store name' : 'Income source'}
                placeholderTextColor={mutedForeground}
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Typography weight="bold" style={[styles.label, { color: text }]}>Category *</Typography>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {filteredCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      { backgroundColor: card, borderColor: border },
                      category === cat.name && { backgroundColor: primary, borderColor: primary },
                    ]}
                    onPress={() => setCategory(cat.name)}
                  >
                    <Typography style={styles.categoryIcon}>{cat.icon}</Typography>
                    <Typography
                      variant="small"
                      style={{ color: category === cat.name ? '#FFFFFF' : mutedForeground, textAlign: 'center' }}
                    >
                      {cat.name}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {!transaction && type === 'expense' && (
            <View style={styles.inputGroup}>
              <View style={styles.splitHeaderRow}>
                <Typography weight="bold" style={[styles.label, { color: text, marginBottom: 0 }]}>Split Transaction</Typography>
                <TouchableOpacity
                  style={[
                    styles.splitToggle,
                    {
                      backgroundColor: splitEnabled ? primary : card,
                      borderColor: splitEnabled ? primary : border,
                    },
                  ]}
                  onPress={() => setSplitEnabled(prev => !prev)}
                >
                  <Typography weight="bold" style={{ color: splitEnabled ? '#ffffff' : mutedForeground }}>
                    {splitEnabled ? 'Enabled' : 'Enable'}
                  </Typography>
                </TouchableOpacity>
              </View>

              {splitEnabled && (
                <View style={[styles.splitCard, { backgroundColor: card, borderColor: border }]}> 
                  {splits.map((split, index) => (
                    <View key={split.id} style={[styles.splitRow, { borderBottomColor: border, borderBottomWidth: index === splits.length - 1 ? 0 : 1 }]}> 
                      <View style={styles.splitTopRow}>
                        <Typography weight="bold" style={{ color: text }}>Part {index + 1}</Typography>
                        <TouchableOpacity onPress={() => removeSplit(split.id)} disabled={splits.length <= 2}>
                          <Typography style={{ color: splits.length <= 2 ? mutedForeground : '#ef4444' }}>Remove</Typography>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.splitInputsRow}>
                        <View style={[styles.splitInputBox, { borderColor: border, backgroundColor: background }]}> 
                          <Typography style={{ color: mutedForeground }}>{getCurrencySymbol(currency)}</Typography>
                          <TextInput
                            value={split.amount}
                            onChangeText={(value) => updateSplit(split.id, 'amount', value)}
                            placeholder="Amount"
                            placeholderTextColor={mutedForeground}
                            keyboardType="decimal-pad"
                            style={[styles.splitInput, { color: text }]}
                          />
                        </View>
                        <TextInput
                          value={split.category}
                          onChangeText={(value) => updateSplit(split.id, 'category', value)}
                          placeholder="Category"
                          placeholderTextColor={mutedForeground}
                          style={[styles.splitCategoryInput, { color: text, borderColor: border, backgroundColor: background }]}
                        />
                      </View>

                      <TextInput
                        value={split.description}
                        onChangeText={(value) => updateSplit(split.id, 'description', value)}
                        placeholder="Optional note for this split"
                        placeholderTextColor={mutedForeground}
                        style={[styles.splitNoteInput, { color: text, borderColor: border, backgroundColor: background }]}
                      />
                    </View>
                  ))}

                  <TouchableOpacity style={[styles.addSplitButton, { borderColor: border }]} onPress={addSplit}>
                    <Typography weight="bold" style={{ color: mutedForeground }}>+ Add Another Split</Typography>
                  </TouchableOpacity>

                  <Typography variant="small" style={{ color: mutedForeground, marginTop: 10 }}>
                    Tip: Split total must match the main amount exactly.
                  </Typography>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          <View style={styles.inputGroup}>
            <Typography weight="bold" style={[styles.label, { color: text }]}>Description</Typography>
            <View style={[styles.inputWrapper, { backgroundColor: card, borderColor: border }]}>
              <FileText size={20} color={mutedForeground} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea, { color: text }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional notes..."
                placeholderTextColor={mutedForeground}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {transaction && (transaction as any).smsData && (
            <View style={styles.inputGroup}>
              <Typography weight="bold" style={[styles.label, { color: text }]}>Original SMS Data</Typography>
              <View style={[{ backgroundColor: card, borderColor: border, borderRadius: 8, borderWidth: 1, maxHeight: 200 }]}>
                <ScrollView style={{ padding: 12 }} showsVerticalScrollIndicator={true}>
                  <Typography variant="small" style={{ color: mutedForeground, fontFamily: 'monospace' }}>
                    {JSON.stringify((transaction as any).smsData, null, 2)}
                  </Typography>
                </ScrollView>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: border }]}
            onPress={onClose}
          >
            <Typography weight="bold" style={{ color: mutedForeground }}>Cancel</Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: primary }, loading && { backgroundColor: mutedForeground }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Typography weight="bold" style={{ color: '#ffffff' }}>
              {loading ? 'Saving...' : (transaction ? 'Update Transaction' : 'Add Transaction')}
            </Typography>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  form: {
    flex: 1,
    padding: 24,
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    borderRadius: 16,
    padding: 6,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 4,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 10,
    opacity: 0.7,
  },
  currencySymbol: {
    marginLeft: 18,
    marginRight: 8,
    fontSize: 18,
    opacity: 0.9,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    paddingRight: 20,
    fontSize: 17,
    fontWeight: '500',
  },
  textArea: {
    paddingTop: 18,
    textAlignVertical: 'top',
    height: 120,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 10,
    paddingLeft: 4,
  },
  categoryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    minWidth: 95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIcon: {
    fontSize: 26,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 20,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  splitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  splitToggle: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  splitCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  splitRow: {
    paddingBottom: 12,
    marginBottom: 12,
  },
  splitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  splitInputsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  splitInputBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  splitInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  splitCategoryInput: {
    flex: 1.2,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 46,
    fontSize: 15,
  },
  splitNoteInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
    fontSize: 14,
  },
  addSplitButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
});

export default TransactionForm;
