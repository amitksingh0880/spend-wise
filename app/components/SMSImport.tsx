import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { MessageCircle, Download, CheckCircle, AlertCircle, Info } from 'lucide-react-native';
import Card from '@/components/ui/card';
import {
  checkSMSPermission,
  requestSMSPermission,
  importExpensesFromSMS,
  SMSParsingResult,
  ExtractedExpense,
} from '@/app/services/smsService';

interface SMSImportProps {
  onImportComplete?: (result: SMSParsingResult) => void;
}

export default function SMSImport({ onImportComplete }: SMSImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastResult, setLastResult] = useState<SMSParsingResult | null>(null);

  // Check permission on component mount
  React.useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    if (Platform.OS !== 'android') {
      setHasPermission(false);
      return;
    }
    
    try {
      const granted = await checkSMSPermission();
      setHasPermission(granted);
    } catch (error) {
      console.error('Error checking SMS permission:', error);
      setHasPermission(false);
    }
  };

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
      Alert.alert('Error', 'Failed to request SMS permission');
    }
  };

  const handleImportSMS = async () => {
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
      const result = await importExpensesFromSMS({
        maxCount: 100,
        daysBack: 30,
        autoSave: true,
      });

      setLastResult(result);
      
      if (result.success && result.expenses.length > 0) {
        Alert.alert(
          'Import Successful',
          `Successfully imported ${result.expenses.length} expenses from your SMS messages.`,
          [{ text: 'OK' }]
        );
      } else if (result.success && result.expenses.length === 0) {
        Alert.alert(
          'No Expenses Found',
          'No transaction-related SMS messages were found in the last 30 days.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Import Failed',
          result.errors.join('\n') || 'Unknown error occurred',
          [{ text: 'OK' }]
        );
      }

      onImportComplete?.(result);
    } catch (error) {
      Alert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'An unknown error occurred',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderExpenseItem = (expense: ExtractedExpense, index: number) => (
    <View key={index} style={styles.expenseItem}>
      <View style={styles.expenseHeader}>
        <Text style={styles.expenseAmount}>
          {expense.type === 'income' ? '+' : '-'}₹{expense.amount.toFixed(2)}
        </Text>
        <View style={[
          styles.confidenceBadge,
          { backgroundColor: expense.confidence > 0.7 ? '#10b981' : expense.confidence > 0.5 ? '#f59e0b' : '#ef4444' }
        ]}>
          <Text style={styles.confidenceText}>
            {Math.round(expense.confidence * 100)}%
          </Text>
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
          <Text style={styles.notAvailableText}>
            SMS import is currently only supported on Android devices.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <MessageCircle size={24} color="#3b82f6" />
          <Text style={styles.title}>Import from SMS</Text>
        </View>
        
        <Text style={styles.description}>
          Automatically extract expense information from your bank SMS alerts and transaction notifications.
        </Text>

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
          style={[styles.importButton, { opacity: hasPermission ? 1 : 0.5 }]}
          onPress={handleImportSMS}
          disabled={!hasPermission || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Download size={20} color="#ffffff" />
              <Text style={styles.importButtonText}>Import Last 30 Days</Text>
            </>
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
                {lastResult.expenses.slice(0, 5).map(renderExpenseItem)}
                {lastResult.expenses.length > 5 && (
                  <Text style={styles.moreExpenses}>
                    +{lastResult.expenses.length - 5} more expenses imported
                  </Text>
                )}
              </View>
            )}

            {lastResult.errors.length > 0 && (
              <View style={styles.errorsList}>
                <Text style={styles.errorsTitle}>Errors:</Text>
                {lastResult.errors.map((error, index) => (
                  <Text key={index} style={styles.errorText}>• {error}</Text>
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
  importButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  importButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
});