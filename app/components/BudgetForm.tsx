import { useCurrency } from '@/app/contexts/CurrencyContext';
import { createBudget, generateBudgetPeriod, getDefaultBudgetColors } from '@/app/services/budgetService';
import { getAllCategories } from '@/app/services/categoryService';
import { getCurrencySymbol } from '@/app/utils/currency';
import { Target, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface BudgetFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BudgetForm: React.FC<BudgetFormProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { currency } = useCurrency();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [selectedColor, setSelectedColor] = useState('#4f46e5');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const colors = getDefaultBudgetColors();

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const allCategories = await getAllCategories();
      const expenseCategories = allCategories.filter(cat => 
        cat.type === 'expense' || cat.type === 'both'
      );
      setCategories(expenseCategories);
      
      // Set default category
      if (expenseCategories.length > 0) {
        setCategory(expenseCategories[0].name);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setCategory('');
    setPeriod('monthly');
    setSelectedColor('#4f46e5');
  };

  const handleSubmit = async () => {
    if (!name || !amount || !category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const budgetPeriod = generateBudgetPeriod(period);
      
      await createBudget({
        name,
        category,
        amount: numAmount,
        period,
        color: selectedColor,
        isActive: true,
        ...budgetPeriod,
      });

      Alert.alert('Success', 'Budget created successfully');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating budget:', error);
      Alert.alert('Error', 'Failed to create budget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Budget</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form}>
          {/* Budget Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Budget Name *</Text>
            <View style={styles.inputWrapper}>
              <Target size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Monthly Groceries"
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>

          {/* Amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Budget Amount *</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>{getCurrencySymbol(currency)}</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#6b7280"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Period */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Budget Period *</Text>
            <View style={styles.periodContainer}>
              {(['weekly', 'monthly', 'yearly'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodButton,
                    period === p && styles.periodButtonActive,
                  ]}
                  onPress={() => setPeriod(p)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      period === p && styles.periodButtonTextActive,
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      category === cat.name && styles.categoryButtonActive,
                    ]}
                    onPress={() => setCategory(cat.name)}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.categoryText,
                        category === cat.name && styles.categoryTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Color */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Budget Color</Text>
            <View style={styles.colorContainer}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorButtonActive,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating...' : 'Create Budget'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f9fafb',
  },
  closeButton: {
    padding: 8,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  currencySymbol: {
    marginLeft: 16,
    marginRight: 12,
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    color: '#f3f4f6',
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#4f46e5',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  categoryButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 80,
  },
  categoryButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonActive: {
    borderColor: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#4f46e5',
  },
  submitButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default BudgetForm;
