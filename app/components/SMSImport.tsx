import {
  ExtractedExpense,
  SMSParsingResult,
  checkSMSPermission,
  importExpensesFromSMS,
  requestSMSPermission,
  parseTransactionSMS,
} from '@/app/services/smsService';
import { saveTransaction } from '@/app/services/transactionService';
import Card from '@/components/ui/card';
import { AlertCircle, CheckCircle, Download, Info, MessageCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
        const suspiciousCount = result.suspicious?.length || 0;
        const errorsText = (result.errors && result.errors.length > 0) ? `\n\nDebug:\n${result.errors.join('\n')}` : '';
        Alert.alert(
          'Import Successful',
          `Imported ${result.expenses.length} expenses.${suspiciousCount > 0 ? `\n\nSuspicious held: ${suspiciousCount}` : ''}${errorsText}`,
          [{ text: 'OK' }]
        );
      } else if (result.success && result.expenses.length === 0) {
        const errorsText = (result.errors && result.errors.length > 0) ? `\n\nDebug:\n${result.errors.join('\n')}` : '';
        Alert.alert(
          'No Expenses Found',
          `No transaction-related SMS messages were found for today.${errorsText}`,
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

  const handleSaveSuspicious = async (expense: ExtractedExpense) => {
    try {
      setIsLoading(true);
      const tx = await saveTransaction({
        amount: expense.amount,
        type: expense.type,
        vendor: expense.vendor ?? 'Unknown',
        category: expense.category ?? 'other',
        description: `(Suspicious SMS) ${expense.description}`,
        tags: ['sms-import', 'suspicious', `confidence:${Math.round((expense.confidence ?? 0) * 100)}%`],
        smsData: {
          rawMessage: expense.rawMessage,
          sender: expense.sender || 'Unknown',
          timestamp: expense.timestamp || Date.now(),
        },
      });

      Alert.alert('Saved', `Saved suspicious transaction: ${tx.id}`);
      // Remove saved expense from local list
      setLastResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          suspicious: (prev.suspicious || []).filter((e) => e !== expense),
        } as SMSParsingResult;
      });
    } catch (err: any) {
      console.error('saveSuspicious error', err);
      Alert.alert('Error', `Failed to save suspicious transaction: ${err?.message ?? err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIgnoreSuspicious = (expense: ExtractedExpense) => {
    // Remove the item from the suspicious list only
    setLastResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        suspicious: (prev.suspicious || []).filter((e) => e !== expense),
      } as SMSParsingResult;
    });
  };

  const handleRegenerateSuspicious = (expense: ExtractedExpense) => {
    const sms = { id: `regen-${Date.now()}`, address: expense.sender, body: expense.rawMessage, date: expense.timestamp, type: 1 };
    const parsed = parseTransactionSMS(sms as any);
    if (!parsed) {
      Alert.alert('No change', 'Re-parse did not extract a transaction or improved confidence.');
      return;
    }
    // Replace in suspicious list
    setLastResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        suspicious: (prev.suspicious || []).map((e) => (e === expense ? parsed : e)),
      } as SMSParsingResult;
    });
    Alert.alert('Reparsed', `Re-parse found amount ₹${parsed.amount.toFixed(2)} (confidence ${(parsed.confidence ?? 0) * 100}%)`);
  };

  // ---------- Simple Calendar Modal Implementation ----------
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'start' | 'end'>('start');
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());

  const openCalendarFor = (mode: 'start' | 'end') => {
    setCalendarMode(mode);
    // If a date is already set, open to that month
    const dateStr = mode === 'start' ? filterStart : filterEnd;
    const d = dateStr ? new Date(dateStr) : new Date();
    if (!isNaN(d.getTime())) {
      setCalendarMonth(d.getMonth());
      setCalendarYear(d.getFullYear());
    }
    setCalendarVisible(true);
  };

  const closeCalendar = () => setCalendarVisible(false);

  const formatToYMD = (d: Date) => {
    const yy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const handlePickDate = (d: Date) => {
    const v = formatToYMD(d);
    if (calendarMode === 'start') {
      setFilterStart(v);
      // If end is earlier than start, clear end
      if (filterEnd && new Date(filterEnd) < new Date(v)) setFilterEnd('');
    } else {
      setFilterEnd(v);
      // If start is later than end, clear start
      if (filterStart && new Date(filterStart) > new Date(v)) setFilterStart('');
    }
    setCalendarVisible(false);
  };

  const getMonthDays = (year: number, month: number) => {
    // returns array of date objects for the month grid starting on Sunday
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevDaysCount = firstDay.getDay(); // sunday=0
    const days: Date[] = [];
    // previous month's tail
    for (let i = prevDaysCount - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    // current month
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    // next month days to fill to 7*n
    while (days.length % 7 !== 0) {
      const nextIndex = days.length - prevDaysCount + 1;
      days.push(new Date(year, month + 1, nextIndex));
    }
    return days;
  };

  const renderCalendar = () => {
    const days = getMonthDays(calendarYear, calendarMonth);
    const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleString(undefined, { month: 'long' });
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const selectedStart = filterStart ? new Date(filterStart) : null;
    const selectedEnd = filterEnd ? new Date(filterEnd) : null;

    const isSameDay = (a?: Date | null, b?: Date | null) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeaderRow}>
          <TouchableOpacity
            onPress={() => {
              // prev month
              const newMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
              const newYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
              setCalendarMonth(newMonth);
              setCalendarYear(newYear);
            }}
          >
            <Text style={styles.calendarNav}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>{monthName} {calendarYear}</Text>
          <TouchableOpacity
            onPress={() => {
              const newMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
              const newYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
              setCalendarMonth(newMonth);
              setCalendarYear(newYear);
            }}
          >
            <Text style={styles.calendarNav}>{'>'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {weekDays.map((wd) => (
            <Text key={wd} style={styles.weekDayText}>{wd}</Text>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {days.map((d, idx) => {
            const isOtherMonth = d.getMonth() !== calendarMonth;
            const selected = calendarMode === 'start' ? isSameDay(d, selectedStart) : isSameDay(d, selectedEnd);
            return (
              <TouchableOpacity
                key={`d-${idx}`}
                onPress={() => handlePickDate(d)}
                style={[
                  styles.dayCell,
                  isOtherMonth ? styles.dayCellFaded : {},
                  selected ? styles.dayCellSelected : {},
                ]}
              >
                <Text style={[styles.dayText, isOtherMonth ? styles.dayTextFaded : {}, selected ? styles.dayTextSelected : {}]}>{d.getDate()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
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
          {/* Calendar Modal */}
          <Modal
            visible={calendarVisible}
            transparent
            animationType="fade"
            onRequestClose={closeCalendar}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContent}>
                {renderCalendar()}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  <TouchableOpacity onPress={() => { if (calendarMode === 'start') { setFilterStart(''); } else { setFilterEnd(''); } setCalendarVisible(false); }} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closeCalendar} style={styles.modalCloseButton}>
                    <Text style={styles.modalCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
                onChangeText={(v: string) => setCustomDays(Math.max(1, parseInt(v || '1', 10) || 1))}
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
            <View style={{ flexDirection: 'row', marginBottom: 8, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => openCalendarFor('start')}
                style={[styles.dateButton, { marginRight: 8 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.dateButtonText}>{filterStart || 'Start (YYYY-MM-DD)'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openCalendarFor('end')}
                style={styles.dateButton}
                activeOpacity={0.8}
              >
                <Text style={styles.dateButtonText}>{filterEnd || 'End (YYYY-MM-DD)'}</Text>
              </TouchableOpacity>
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
            {lastResult.suspicious && lastResult.suspicious.length > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{lastResult.suspicious.length}</Text>
                <Text style={styles.statLabel}>Suspicious</Text>
              </View>
            )}
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

          {lastResult.suspicious && lastResult.suspicious.length > 0 && (
            <View style={styles.suspiciousList}>
              <Text style={styles.suspiciousTitle}>Suspicious Transactions (Amount &gt; 1,00,000)</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                <TouchableOpacity style={[styles.suspiciousSave, { marginRight: 8 }]} onPress={async () => {
                  // Save all suspicious
                  const items = lastResult.suspicious || [];
                  for (const e of items) await handleSaveSuspicious(e);
                }}>
                  <Text style={{ color: '#fff' }}>Save All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.suspiciousIgnore, { marginRight: 8 }]} onPress={() => { setLastResult((prev) => prev ? ({ ...prev, suspicious: [] }) : prev ); }}>
                  <Text style={{ color: '#111' }}>Ignore All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suspiciousIgnore} onPress={async () => {
                  // Regenerate all suspicious
                  const items = lastResult.suspicious || [];
                  for (const e of items) {
                    handleRegenerateSuspicious(e);
                  }
                }}>
                  <Text style={{ color: '#111' }}>Regenerate All</Text>
                </TouchableOpacity>
              </View>
              {lastResult.suspicious.map((expense, idx) => (
                <View key={`susp-${idx}`} style={styles.suspiciousItem}>
                  <Text style={styles.suspiciousText}>{expense.vendor || 'Unknown'} — ₹{expense.amount.toFixed(2)}</Text>
                  <View style={styles.suspiciousActions}>
                    <TouchableOpacity style={styles.suspiciousSave} onPress={() => handleSaveSuspicious(expense)}><Text style={{color: '#fff'}}>Save</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.suspiciousIgnore} onPress={() => handleIgnoreSuspicious(expense)}><Text style={{color: '#111'}}>Ignore</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.suspiciousIgnore, { marginLeft: 8 }]} onPress={() => handleRegenerateSuspicious(expense)}><Text style={{color: '#111'}}>Regenerate</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
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
  dateButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 140,
    alignItems: 'center',
    backgroundColor: '#ffffff'
  },
  dateButtonText: {
    color: '#374151',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  clearButton: {
    backgroundColor: '#fde68a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#92400e',
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: 'transparent',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarNav: {
    fontSize: 18,
    color: '#374151',
    padding: 8,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    color: '#6b7280',
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dayCell: {
    width: '14.2857%',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellFaded: {
    opacity: 0.35,
  },
  dayCellSelected: {
    backgroundColor: '#3b82f6',
    borderRadius: 24,
    padding: 6,
  },
  dayText: {
    color: '#111827',
  },
  dayTextFaded: {
    color: '#9ca3af',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  suspiciousList: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#fff8f7',
  },
  suspiciousTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: '#b91c1c',
  },
  suspiciousItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fdeceb',
  },
  suspiciousText: {
    color: '#1f2937',
    fontWeight: '600',
  },
  suspiciousActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suspiciousSave: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  suspiciousIgnore: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginLeft: 8,
  },
});
