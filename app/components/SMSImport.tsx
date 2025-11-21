import {
  ExtractedExpense,
  SMSParsingResult,
  checkSMSPermission,
  importExpensesFromSMS,
  requestSMSPermission,
} from '@/app/services/smsService';
import Card from '@/components/ui/card';
import { AlertCircle, CheckCircle, Download, Info, MessageCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface SMSImportProps {
  onImportComplete?: (result: SMSParsingResult, options?: { minDate?: number; maxDate?: number; daysBack?: number; onlyToday?: boolean }) => void;
}

export default function SMSImport({ onImportComplete }: SMSImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastResult, setLastResult] = useState<SMSParsingResult | null>(null);
  const [rangeOption, setRangeOption] = useState<'today' | '7' | '30' | 'customDays' | 'customRange'>('today');
  const [customDays, setCustomDays] = useState<number>(7);
  const [customStart, setCustomStart] = useState<string>(''); // 'YYYY-MM-DD'
  const [customEnd, setCustomEnd] = useState<string>('');
  // UI filter state: date range + type
  const [filterStart, setFilterStart] = useState<string>('');
  const [filterEnd, setFilterEnd] = useState<string>('');
  const [txnType, setTxnType] = useState<'all' | 'expense' | 'income'>('all');

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    if (Platform.OS !== 'android') {
      setHasPermission(false);
      return;
    }

    try {
      setHasPermission(null); // show checking state
      const granted = await checkSMSPermission();
      setHasPermission(granted);
    } catch (error) {
      console.error('Error checking SMS permission:', error);
      setHasPermission(false);
    }
  };

  const renderRangeOptionButton = (value: typeof rangeOption, label: string) => (
    <TouchableOpacity
      style={[styles.rangeButton, rangeOption === value ? styles.rangeButtonSelected : {}]}
      onPress={() => setRangeOption(value)}
    >
      <Text style={[styles.rangeButtonText, rangeOption === value ? styles.rangeButtonTextSelected : {}]}>{label}</Text>
    </TouchableOpacity>
  );

  const handleRequestPermission = async () => {
    try {
      const granted = await requestSMSPermission();
      setHasPermission(granted);

      if (!granted) {
        Alert.alert(
          'Permission Required',
          'SMS permission is required to automatically import expenses from bank alerts. You can still manually add transactions.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('requestSMSPermission error', error);
      Alert.alert('Error', 'Failed to request SMS permission');
    }
  };

  const handleImportSMS = async () => {
    // If permission state unknown, re-check first
    if (hasPermission === null) {
      await checkPermissionStatus();
    }

    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Please grant SMS permission first to import expenses.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: handleRequestPermission },
        ]
      );
      return;
    }

    setIsLoading(true);

    try {
      const options: any = { maxCount: 200, autoSave: true };
      if (rangeOption === 'today') {
        options.onlyToday = true;
      } else if (rangeOption === '7') {
        options.daysBack = 7;
      } else if (rangeOption === '30') {
        options.daysBack = 30;
      } else if (rangeOption === 'customDays') {
        options.daysBack = Math.max(1, Math.floor(customDays) || 1);
      } else if (rangeOption === 'customRange') {
        // parse start/end
        const start = customStart ? new Date(customStart) : null;
        const end = customEnd ? new Date(customEnd) : null;
        if (start && !isNaN(start.getTime())) options.minDate = start.getTime();
        if (end && !isNaN(end.getTime())) options.maxDate = end.getTime() + (24 * 60 * 60 * 1000) - 1;
      }

      // Apply date filters if provided (override range if specific filter set)
      if (filterStart) {
        const s = new Date(filterStart);
        if (!isNaN(s.getTime())) options.minDate = s.setHours(0, 0, 0, 0);
      }
      if (filterEnd) {
        const e = new Date(filterEnd);
        if (!isNaN(e.getTime())) options.maxDate = e.setHours(23, 59, 59, 999);
      }

      const result = await importExpensesFromSMS({
        ...options,
        filter: (expense) => {
          // Filter by txnType only here
          if (txnType !== 'all') return expense.type === txnType;
          return true;
        },
      });

      setLastResult(result);

      if (result.success && result.expenses.length > 0) {
        Alert.alert(
          'Import Successful',
          `Imported ₹{result.expenses.length} expenses.\n\nDebug:\n₹{result.errors.join('\n')}`,
          [{ text: 'OK' }]
        );
      } else if (result.success && result.expenses.length === 0) {
        Alert.alert(
          'No Expenses Found',
          `No transaction-related SMS messages were found for today.\n\nDebug:\n${result.errors.join('\n')}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Import Failed', result.errors.join('\n') || 'Unknown error', [{ text: 'OK' }]);
      }

      onImportComplete?.(result, options);
    } catch (error) {
      console.error('importExpensesFromSMS error', error);
      // Friendly guidance if native module missing (common in Expo Go)
      const message =
        error instanceof Error
          ? error.message
          : 'An unknown error occurred while importing SMS. If you are using Expo Go, please prebuild / use a dev-client because native SMS modules require a custom build.';
      Alert.alert('Import Failed', message, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderExpenseItem = (expense: ExtractedExpense, index: number) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseHeader}>
        <Text style={styles.expenseAmount}>
          {expense.type === 'income' ? '+' : '-'}${expense.amount.toFixed(2)}
        </Text>
        <View
          style={[
            styles.confidenceBadge,
            { backgroundColor: expense.confidence > 0.7 ? '#10b981' : expense.confidence > 0.5 ? '#f59e0b' : '#ef4444' },
          ]}
        >
          <Text style={styles.confidenceText}>{Math.round(expense.confidence * 100)}%</Text>
        </View>
      </View>
      <Text style={styles.expenseVendor}>{expense.vendor}</Text>
      <Text style={styles.expenseCategory}>{expense.category}</Text>
      <Text style={styles.expenseDescription} numberOfLines={2}>
        {expense.description}
      </Text>
    </View>
  );

  if (Platform.OS !== 'android') {
    return (
      <Card style={styles.container}>
        <View style={styles.notAvailable}>
          <Info size={48} color="#6b7280" />
          <Text style={styles.notAvailableTitle}>SMS Import Not Available</Text>
          <Text style={styles.notAvailableText}>SMS import is currently only supported on Android devices.</Text>
        </View>
      </Card>
    );
  }

  const permissionIcon =
    hasPermission === null ? (
      <ActivityIndicator />
    ) : hasPermission ? (
      <CheckCircle size={20} color="#10b981" />
    ) : (
      <AlertCircle size={20} color="#ef4444" />
    );

  const permissionText =
    hasPermission === null ? 'Checking permission...' : hasPermission ? 'SMS Permission Granted' : 'SMS Permission Required';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Card style={styles.card}>
          <View style={styles.header}>
            <MessageCircle size={24} color="#3b82f6" />
            <Text style={styles.title}>Import from SMS</Text>
          </View>
          <Text style={styles.description}>
            Automatically extract expense information from your bank SMS alerts and transaction notifications.
          </Text>

          {/* Range selector */}
          <View style={styles.rangeSelector}>
            {renderRangeOptionButton('today', 'Today')}
            {renderRangeOptionButton('7', 'Last 7 days')}
            {renderRangeOptionButton('30', 'Last 30 days')}
            {renderRangeOptionButton('customDays', 'Custom Days')}
            {renderRangeOptionButton('customRange', 'Custom Range')}
          </View>

          {/* Custom days / range inputs */}
          {rangeOption === 'customDays' && (
            <View style={styles.customDaysRow}>
              <Text style={{ marginRight: 8 }}>Days:</Text>
              <TextInput
                value={String(customDays)}
                onChangeText={(v) => setCustomDays(Math.max(1, parseInt(v || '1', 10) || 1))}
                style={styles.customDaysInput}
                keyboardType="numeric"
              />
            </View>
          )}
          {rangeOption === 'customRange' && (
            <View style={styles.customRangeRow}>
              <TextInput
                value={customStart}
                onChangeText={setCustomStart}
                placeholder="Start (YYYY-MM-DD)"
                style={styles.customRangeInput}
              />
              <Text style={{ marginHorizontal: 8 }}>to</Text>
              <TextInput
                value={customEnd}
                onChangeText={setCustomEnd}
                placeholder="End (YYYY-MM-DD)"
                style={styles.customRangeInput}
              />
            </View>
          )}

          {/* Filter Controls */}
          <View style={styles.filterContainer}>
            <Text style={{ fontWeight: '600', marginBottom: 8 }}>Filter Transactions</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <TextInput
                style={[styles.dateInput, { marginRight: 8 }]}
                placeholder="Start (YYYY-MM-DD)"
                keyboardType="default"
                value={filterStart}
                onChangeText={setFilterStart}
              />
              <TextInput
                style={styles.dateInput}
                placeholder="End (YYYY-MM-DD)"
                keyboardType="default"
                value={filterEnd}
                onChangeText={setFilterEnd}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ marginRight: 8 }}>Type:</Text>
              <TouchableOpacity
                style={{ padding: 6, backgroundColor: txnType === 'all' ? '#10b981' : '#e5e7eb', borderRadius: 6, marginRight: 4 }}
                onPress={() => setTxnType('all')}
              >
                <Text style={{ color: txnType === 'all' ? '#fff' : '#111' }}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 6, backgroundColor: txnType === 'expense' ? '#10b981' : '#e5e7eb', borderRadius: 6, marginRight: 4 }}
                onPress={() => setTxnType('expense')}
              >
                <Text style={{ color: txnType === 'expense' ? '#fff' : '#111' }}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 6, backgroundColor: txnType === 'income' ? '#10b981' : '#e5e7eb', borderRadius: 6 }}
                onPress={() => setTxnType('income')}
              >
                <Text style={{ color: txnType === 'income' ? '#fff' : '#111' }}>Income</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Permission Status */}
          <View style={styles.permissionStatus}>
            <View style={styles.statusRow}>
              {hasPermission ? (
                <CheckCircle size={20} color="#10b981" />
              ) : (
                <AlertCircle size={20} color="#ef4444" />
              )}
              <Text style={[styles.statusText, { color: hasPermission ? '#10b981' : '#ef4444' }]}>
                {hasPermission ? 'SMS Permission Granted' : 'SMS Permission Required'}
              </Text>
            </View>
            {!hasPermission && (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={handleRequestPermission}
              >
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Import Button */}
           <TouchableOpacity
  style={[
    styles.importButton,
    !hasPermission || isLoading ? styles.disabledButton : {},
  ]}
  onPress={handleImportSMS}
  disabled={!hasPermission || isLoading}
  activeOpacity={0.8}
>
  {isLoading ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <View style={styles.btnContent}>
      <Download size={20} color="#fff" />
      <Text style={styles.importButtonText}>Import Last 30 Days</Text>
    </View>
  )}
</TouchableOpacity>


      {/* Results */}
      {lastResult && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Last Import Results</Text>

          <View style={styles.resultStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{lastResult.expenses.length}</Text>
              <Text style={styles.statLabel}>Expenses Found</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{lastResult.totalProcessed}</Text>
              <Text style={styles.statLabel}>Messages Processed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{lastResult.errors.length}</Text>
              <Text style={styles.statLabel}>Errors</Text>
            </View>
          </View>

          {lastResult.expenses.length > 0 && (
            <View style={styles.expensesList}>
              <Text style={styles.expensesTitle}>Imported Expenses:</Text>
              {lastResult.expenses.slice(0, 5).map((expense, idx) => (
                <React.Fragment key={`expense-${idx}`}>
                  {renderExpenseItem(expense, idx)}
                </React.Fragment>
              ))}
              {lastResult.expenses.length > 5 && <Text style={styles.moreExpenses}>+{lastResult.expenses.length - 5} more expenses imported</Text>}
            </View>
          )}

          {lastResult.errors.length > 0 && (
            <View style={styles.errorsList}>
              <Text style={styles.errorsTitle}>Errors:</Text>
              {lastResult.errors.map((error, index) => (
                <React.Fragment key={`err-${index}`}>
                  <Text style={styles.errorText}>• {error}</Text>
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
      )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  importButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "80%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    gap: 10, // spacing between icon & text
  },

  disabledButton: {
    backgroundColor: "#9BBBD4",
    elevation: 0,
    shadowOpacity: 0,
  },

  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  importButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
    color: '#1f2937',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionStatus: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  results: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  expensesList: {
    marginBottom: 16,
  },
  expensesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  expenseItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  expenseVendor: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  expenseCategory: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  expenseDescription: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
  },
  moreExpenses: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  errorsList: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    lineHeight: 16,
  },
  notAvailable: {
    alignItems: 'center',
    padding: 32,
  },
  notAvailableTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  notAvailableText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  rangeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  rangeButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  rangeButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  rangeButtonText: {
    color: '#374151',
    fontSize: 14,
  },
  rangeButtonTextSelected: {
    color: '#ffffff',
  },
  customDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customDaysInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    width: 84,
    textAlign: 'center',
  },
  customRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customRangeInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    width: 140,
  },
  filterContainer: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 8,
    flex: 1,
  },
});
