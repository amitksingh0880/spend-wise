// import {
//     checkSMSPermission,
//     ExtractedExpense,
//     importExpensesFromSMS,
//     requestSMSPermission,
//     SMSParsingResult,
// } from '@/app/services/smsService';
// import Card from '@/components/ui/card';
// import { AlertCircle, CheckCircle, Download, Info, MessageCircle } from 'lucide-react-native';
// import React, { useState } from 'react';
// import {
//     ActivityIndicator,
//     Alert,
//     Platform,
//     ScrollView,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View,
// } from 'react-native';

// interface SMSImportProps {
//   onImportComplete?: (result: SMSParsingResult) => void;
// }

// export default function SMSImport({ onImportComplete }: SMSImportProps) {
//   const [isLoading, setIsLoading] = useState(false);
//   const [hasPermission, setHasPermission] = useState<boolean | null>(null);
//   const [lastResult, setLastResult] = useState<SMSParsingResult | null>(null);

//   // Check permission on component mount
//   React.useEffect(() => {
//     checkPermissionStatus();
//   }, []);

//   const checkPermissionStatus = async () => {
//     if (Platform.OS !== 'android') {
//       setHasPermission(false);
//       return;
//     }

//     try {
//       const granted = await checkSMSPermission();
//       setHasPermission(granted);
//     } catch (error) {
//       console.error('Error checking SMS permission:', error);
//       setHasPermission(false);

//     }
//   };

//   const handleRequestPermission = async () => {
//     try {
//       const granted = await requestSMSPermission();
//       setHasPermission(granted);

//       if (!granted) {
//         Alert.alert(
//           'Permission Required',
//           'SMS permission is required to automatically import expenses from bank alerts. You can still manually add transactions.',
//           [{ text: 'OK' }]
//         );
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to request SMS permission');
//     }
//   };

//   const handleImportSMS = async () => {
//     if (!hasPermission) {
//       Alert.alert(
import { TextInput } from 'react-native';
//         'Permission Required',
//         'Please grant SMS permission first to import expenses.',
//         [
//           { text: 'Cancel', style: 'cancel' },
//           { text: 'Grant Permission', onPress: handleRequestPermission },
//         ]
//       );
//       return;
//     }
// Filter state
const [minAmount, setMinAmount] = useState('');
const [maxAmount, setMaxAmount] = useState('');
const [txnType, setTxnType] = useState<'all' | 'expense' | 'income'>('all');

//     setIsLoading(true);

//     try {
//       const result = await importExpensesFromSMS({
//         maxCount: 200, // Increased to get more messages
//         daysBack: 30,
//         autoSave: true,
//       });

//       setLastResult(result);

//       if (result.success && result.expenses.length > 0) {
//         Alert.alert(
//           'Import Successful',
//           `Successfully imported ${result.expenses.length} expenses from your SMS messages.\n\nDebug info: ${result.errors.join('\n')}`,
//           [{ text: 'OK' }]
//         );
//       } else if (result.success && result.expenses.length === 0) {
//         Alert.alert(
//           'No Expenses Found',
//           `No transaction-related SMS messages were found in the last 30 days.\n\nDebug info: ${result.errors.join('\n')}`,
//           [{ text: 'OK' }]
//         );
//       } else {
//         Alert.alert(
//           'Import Failed',
//           result.errors.join('\n') || 'Unknown error occurred',
//           [{ text: 'OK' }]
//         );
//       }

//       onImportComplete?.(result);
//     } catch (error) {
//       Alert.alert(
//         'Import Failed',
//         error instanceof Error ? error.message : 'An unknown error occurred',
//         [{ text: 'OK' }]
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const renderExpenseItem = (expense: ExtractedExpense, index: number) => (
//     <View key={index} style={styles.expenseItem}>
//       <View style={styles.expenseHeader}>
//         <Text style={styles.expenseAmount}>
//           {expense.type === 'income' ? '+' : '-'}${expense.amount.toFixed(2)}
//         </Text>
//         <View style={[
//           styles.confidenceBadge,
//           { backgroundColor: expense.confidence > 0.7 ? '#10b981' : expense.confidence > 0.5 ? '#f59e0b' : '#ef4444' }
//         ]}>
//           <Text style={styles.confidenceText}>
//             {Math.round(expense.confidence * 100)}%
//           </Text>
//         </View>
//       </View>
//       <Text style={styles.expenseVendor}>{expense.vendor}</Text>
//       <Text style={styles.expenseCategory}>{expense.category}</Text>
//       <Text style={styles.expenseDescription} numberOfLines={2}>
//         {expense.description}
//       </Text>
//     </View>
//   );

//   if (Platform.OS !== 'android') {
//     return (
//       <Card style={styles.container}>
//         <View style={styles.notAvailable}>
//           <Info size={48} color="#6b7280" />
//           <Text style={styles.notAvailableTitle}>SMS Import Not Available</Text>
//           <Text style={styles.notAvailableText}>
//             SMS import is currently only supported on Android devices.
//           </Text>
//         </View>
//       </Card>
//     );
//   }

//   return (
//     <ScrollView style={styles.container}>
//       <Card style={styles.card}>
//         <View style={styles.header}>
//           <MessageCircle size={24} color="#3b82f6" />
//           <Text style={styles.title}>Import from SMS</Text>
//         </View>

//         <Text style={styles.description}>
//           Automatically extract expense information from your bank SMS alerts and transaction notifications.
//         </Text>

//         {/* Permission Status */}
//         <View style={styles.permissionStatus}>
//           <View style={styles.statusRow}>
//             {hasPermission ? (
//               <CheckCircle size={20} color="#10b981" />
//             ) : (
//               <AlertCircle size={20} color="#ef4444" />
//             )}
//             <Text style={[styles.statusText, { color: hasPermission ? '#10b981' : '#ef4444' }]}>
//               {hasPermission ? 'SMS Permission Granted' : 'SMS Permission Required'}
//             </Text>
//           </View>

//           {!hasPermission && (
//             <TouchableOpacity
//               style={styles.permissionButton}
//               onPress={handleRequestPermission}
//             >
//               <Text style={styles.permissionButtonText}>Grant Permission</Text>
//             </TouchableOpacity>
//           )}
//         </View>

//         {/* Import Button */}
//         <TouchableOpacity
//           style={[styles.importButton, { opacity: hasPermission ? 1 : 0.5 }]}
//           onPress={handleImportSMS}
//           disabled={!hasPermission || isLoading}
//         >
//           {isLoading ? (
//             <ActivityIndicator color="#ffffff" />
//           ) : (
//             <>
//               <Download size={20} color="#ffffff" />
//               <Text style={styles.importButtonText}>Import Last 30 Days</Text>
//             </>
//           )}
//         </TouchableOpacity>

//         {/* Results */}
//         {lastResult && (
//           <View style={styles.results}>
//             <Text style={styles.resultsTitle}>Last Import Results</Text>

//             <View style={styles.resultStats}>
//               <View style={styles.statItem}>
//                 <Text style={styles.statNumber}>{lastResult.expenses.length}</Text>
//                 <Text style={styles.statLabel}>Expenses Found</Text>
//               </View>
//               <View style={styles.statItem}>
//                 <Text style={styles.statNumber}>{lastResult.totalProcessed}</Text>
//                 <Text style={styles.statLabel}>Messages Processed</Text>
//               </View>
//               <View style={styles.statItem}>
//                 <Text style={styles.statNumber}>{lastResult.errors.length}</Text>
//                 <Text style={styles.statLabel}>Errors</Text>
//               </View>
//             </View>

//             {lastResult.expenses.length > 0 && (
//               <View style={styles.expensesList}>
//                 <Text style={styles.expensesTitle}>Imported Expenses:</Text>
//                 {lastResult.expenses.slice(0, 5).map(renderExpenseItem)}
//                 {lastResult.expenses.length > 5 && (
//                   <Text style={styles.moreExpenses}>
//                     +{lastResult.expenses.length - 5} more expenses imported
//                   </Text>
//                 )}
//               </View>
//             )}

//             {lastResult.errors.length > 0 && (
//               <View style={styles.errorsList}>
//                 <Text style={styles.errorsTitle}>Errors:</Text>
//                 {lastResult.errors.map((error, index) => (
//                   <Text key={index} style={styles.errorText}>• {error}</Text>
//                 ))}
//               </View>
//             )}
//           </View>
//         )}
//       </Card>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   card: {
//     margin: 16,
//     padding: 16,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: '600',
//     marginLeft: 8,
//     color: '#1f2937',
//   },
//   description: {
//     fontSize: 14,
//     color: '#6b7280',
//     marginBottom: 16,
//     lineHeight: 20,
//   },
//   permissionStatus: {
//     marginBottom: 16,
//   },
//   statusRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   statusText: {
//     fontSize: 14,
//     fontWeight: '500',
//     marginLeft: 8,
//   },
//   permissionButton: {
//     backgroundColor: '#3b82f6',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 8,
//     alignSelf: 'flex-start',
//   },
//   permissionButtonText: {
//     color: '#ffffff',
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   importButton: {
//     backgroundColor: '#10b981',
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 12,
//     borderRadius: 8,
//     marginBottom: 16,
//   },
//   importButtonText: {
//     color: '#ffffff',
//     fontSize: 16,
//     fontWeight: '600',
//     marginLeft: 8,
//   },
//   results: {
//     borderTopWidth: 1,
//     borderTopColor: '#e5e7eb',
//     paddingTop: 16,
//   },
//   resultsTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#1f2937',
//     marginBottom: 12,
//   },
//   resultStats: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 16,
//   },
//   statItem: {
//     alignItems: 'center',
//   },
//   statNumber: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#3b82f6',
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#6b7280',
//     marginTop: 4,
//   },
//   expensesList: {
//     marginBottom: 16,
//   },
//   expensesTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#1f2937',
//     marginBottom: 8,
//   },
//   expenseItem: {
//     backgroundColor: '#f9fafb',
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 8,
//   },
//   expenseHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   expenseAmount: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#1f2937',
//   },
//   confidenceBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 12,
//   },
//   confidenceText: {
//     color: '#ffffff',
//     fontSize: 12,
//     fontWeight: '500',
//   },
//   expenseVendor: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#374151',
//     marginBottom: 2,
//   },
//   expenseCategory: {
//     fontSize: 12,
//     color: '#6b7280',
//     textTransform: 'capitalize',
//     marginBottom: 4,
//   },
//   expenseDescription: {
//     fontSize: 12,
//     color: '#9ca3af',
//     lineHeight: 16,
//   },
//   moreExpenses: {
//     fontSize: 12,
//     color: '#6b7280',
//     textAlign: 'center',
//     fontStyle: 'italic',
//     marginTop: 8,
//   },
//   errorsList: {
//     backgroundColor: '#fef2f2',
//     padding: 12,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#fecaca',
//   },
//   errorsTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#dc2626',
//     marginBottom: 4,
//   },
//   errorText: {
//     fontSize: 12,
//     color: '#dc2626',
//     lineHeight: 16,
//   },
//   notAvailable: {
//     alignItems: 'center',
//     padding: 32,
//   },
//   notAvailableTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#6b7280',
//     marginTop: 16,
//     marginBottom: 8,
//   },
//   notAvailableText: {
//     fontSize: 14,
//     color: '#9ca3af',
//     textAlign: 'center',
//     lineHeight: 20,
//   },
// });






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

      const result = await importExpensesFromSMS(options);

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

          {/* Filter Controls */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontWeight: '600', marginBottom: 8 }}>Filter Transactions</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 8, marginRight: 8 }}
                placeholder="Min Amount"
                keyboardType="numeric"
                value={minAmount}
                onChangeText={setMinAmount}
              />
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 8 }}
                placeholder="Max Amount"
                keyboardType="numeric"
                value={maxAmount}
                onChangeText={setMaxAmount}
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
            style={[styles.importButton, { opacity: hasPermission ? 1 : 0.5 }]}
            onPress={async () => {
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
                  maxCount: 200,
                  daysBack: 30,
                  autoSave: true,
                  filter: (expense) => {
                    let pass = true;
                    if (minAmount && !isNaN(Number(minAmount))) pass = pass && expense.amount >= Number(minAmount);
                    if (maxAmount && !isNaN(Number(maxAmount))) pass = pass && expense.amount <= Number(maxAmount);
                    if (txnType !== 'all') pass = pass && expense.type === txnType;
                    return pass;
                  },
                });
                setLastResult(result);
                onImportComplete?.(result);
                if (result.success && result.expenses.length > 0) {
                  Alert.alert('Import Successful', `Successfully imported ${result.expenses.length} expenses from your SMS messages.`, [{ text: 'OK' }]);
                } else if (result.success && result.expenses.length === 0) {
                  Alert.alert('No Expenses Found', 'No expense transactions were found in your recent SMS messages. Try checking messages from a longer time period.', [{ text: 'OK' }]);
                } else {
                  Alert.alert('Import Failed', 'Failed to import expenses from SMS. Please check your permissions and try again.', [{ text: 'OK' }]);
                }
              } catch (error) {
                console.error('Error importing SMS:', error);
                Alert.alert('Error', 'Failed to import expenses from SMS');
              } finally {
                setIsLoading(false);
              }
            }}
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
});
