import { useCurrency } from '@/contexts/CurrencyContext';
import { createBudget, generateBudgetPeriod, getDefaultBudgetColors } from '@/services/budgetService';
import { getAllCategories } from '@/services/categoryService';
import { getCurrencySymbol } from '@/utils/currency';
import { Target, X, ChevronDown, Check, Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    StatusBar,
    Dimensions,
} from 'react-native';
import { Typography } from './ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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

  // Theme colors
  const background = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const primaryForeground = useThemeColor({}, 'primaryForeground');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const text = useThemeColor({}, 'text');

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
      if (expenseCategories.length > 0 && !category) {
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
      <View style={[styles.container, { backgroundColor: background }]}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Typography variant="large" weight="bold">New Budget</Typography>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={mutedForeground} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            style={styles.form} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Amount Section */}
            <Animated.View entering={FadeInUp.delay(200)} style={styles.amountSection}>
              <Typography variant="small" weight="bold" style={{ color: mutedForeground, textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Goal Amount
              </Typography>
              <View style={styles.amountInputWrapper}>
                <Typography variant="title" weight="bold" style={{ color: primary, marginRight: 8 }}>
                  {getCurrencySymbol(currency)}
                </Typography>
                <TextInput
                  style={[styles.amountInput, { color: text }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={mutedForeground}
                  keyboardType="decimal-pad"
                  autoFocus={true}
                />
              </View>
            </Animated.View>

            {/* Form Fields */}
            <View style={styles.fieldsContainer}>
              {/* Name */}
              <Animated.View entering={FadeInDown.delay(300)} style={styles.inputGroup}>
                <Typography variant="small" weight="bold" style={styles.label}>Name</Typography>
                <View style={[styles.inputWrapper, { backgroundColor: cardColor, borderColor: border }]}>
                  <Target size={20} color={primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: text }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Monthly Groceries"
                    placeholderTextColor={mutedForeground}
                  />
                </View>
              </Animated.View>

              {/* Period Selector */}
              <Animated.View entering={FadeInDown.delay(400)} style={styles.inputGroup}>
                <Typography variant="small" weight="bold" style={styles.label}>Period</Typography>
                <View style={[styles.periodContainer, { backgroundColor: cardColor, borderColor: border }]}>
                  {(['weekly', 'monthly', 'yearly'] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.periodButton,
                        period === p && { backgroundColor: primary },
                      ]}
                      onPress={() => setPeriod(p)}
                    >
                      <Typography
                        variant="small"
                        weight="bold"
                        style={{ color: period === p ? '#FFFFFF' : mutedForeground }}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Category selector */}
              <Animated.View entering={FadeInDown.delay(500)} style={styles.inputGroup}>
                <Typography variant="small" weight="bold" style={styles.label}>Category</Typography>
                <View style={styles.categoryGrid}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryCard,
                        { 
                            backgroundColor: category === cat.name ? `${primary}15` : cardColor,
                            borderColor: category === cat.name ? primary : border
                        },
                      ]}
                      onPress={() => setCategory(cat.name)}
                    >
                      <View style={[styles.categoryIconCircle, { backgroundColor: category === cat.name ? primary : `${mutedForeground}10` }]}>
                        <Typography style={{ fontSize: 20 }}>{cat.icon}</Typography>
                      </View>
                      <Typography 
                        variant="small" 
                        weight={category === cat.name ? "bold" : "medium"}
                        style={{ color: category === cat.name ? text : mutedForeground, marginTop: 4 }}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Typography>
                      {category === cat.name && (
                        <View style={[styles.checkBadge, { backgroundColor: primary }]}>
                           <Check size={10} color="#FFF" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Color Selector */}
              <Animated.View entering={FadeInDown.delay(600)} style={styles.inputGroup}>
                <Typography variant="small" weight="bold" style={styles.label}>Visual Identity</Typography>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
                  {colors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      {selectedColor === color && (
                        <Check size={18} color="#FFFFFF" strokeWidth={3} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            </View>
            
            <View style={{ height: 180 }} />
          </ScrollView>

          {/* Footer Actions */}
          <BlurView intensity={Platform.OS === 'ios' ? 80 : 0} tint="default" style={[styles.footer, { backgroundColor: Platform.OS === 'android' ? background : 'transparent' }]}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton, { borderColor: border }]}
                    onPress={onClose}
                >
                    <Typography variant="bold" style={{ color: mutedForeground }}>Cancel</Typography>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.submitButton, { backgroundColor: primary }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <Plus size={20} color="#FFF" style={{ marginRight: 6 }} />
                    <Typography variant="bold" style={{ color: '#FFF' }}>
                        {loading ? 'Creating...' : 'Create Budget'}
                    </Typography>
                </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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
    padding: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    flex: 1,
  },
  amountSection: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '800',
    minWidth: 100,
    textAlign: 'center',
    letterSpacing: -1,
  },
  fieldsContainer: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  periodContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 6,
  },
  periodButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  categoryCard: {
    width: (width - 48 - 24) / 3, // 3 columns
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    position: 'relative',
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorScroll: {
    gap: 12,
    paddingVertical: 8,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  actionButton: {
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
  },
  submitButton: {
    flex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default BudgetForm;
