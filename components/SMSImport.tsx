import { useCurrency } from '@/contexts/CurrencyContext';
import { emitter } from '@/libs/emitter';
import { readJson, writeJson } from '@/libs/storage';
import {
  ExtractedExpense,
  SMSParsingResult,
  checkSMSPermission,
  importExpensesFromSMS,
  parseTransactionSMS,
  requestSMSPermission,
} from '@/services/smsService';
import { saveTransaction } from '@/services/transactionService';
import { Typography } from '@/components/ui/text';
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal';
import { DateCalendarModal } from '@/components/ui/date-calendar-modal';
import { useThemeColor } from '@/hooks/use-theme-color';
import ThemeContext from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Link } from 'expo-router';
import { AlertCircle, CheckCircle, Download, Info, MessageCircle, Calendar as CalendarIcon } from 'lucide-react-native';
import React, { useEffect, useState, useContext } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';

interface SMSImportProps {
  onImportComplete?: (result: SMSParsingResult, options?: { minDate?: number; maxDate?: number; daysBack?: number; onlyToday?: boolean }) => void;
}

export default function SMSImport({ onImportComplete }: SMSImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastResult, setLastResult] = useState<SMSParsingResult | null>(null);
  const [rangeOption, setRangeOption] = useState<'today' | '7' | '30' | 'customDays' | 'customRange'>('today');
  const { formatAmount } = useCurrency();
  const primary = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const primaryForeground = useThemeColor({}, 'primaryForeground');
  
  const ctx = useContext(ThemeContext);
  const isDark = (ctx?.theme ?? 'dark') === 'dark';
  const rangePillBorderColor = isDark ? 'rgba(148,163,184,0.35)' : '#64748b55';
  const rangePillBg = isDark ? 'rgba(148,163,184,0.08)' : 'transparent';
  const rangePillTextColor = isDark ? '#cbd5e1' : '#64748b';
  const inputBackground = isDark ? 'rgba(15,23,42,0.45)' : '#ffffff';
  const suspiciousBackground = isDark ? 'rgba(127,29,29,0.2)' : '#fff8f7';
  const suspiciousBorder = isDark ? 'rgba(239,68,68,0.35)' : '#fee2e2';
  const suspiciousDivider = isDark ? 'rgba(239,68,68,0.2)' : '#fdeceb';
  const criticalText = isDark ? '#fca5a5' : '#b91c1c';
  
  const [customDays, setCustomDays] = useState<number>(7);
  const [customStart, setCustomStart] = useState<string>(''); 
  const [customEnd, setCustomEnd] = useState<string>('');
  
  const [filterStart, setFilterStart] = useState<string>('');
  const [filterEnd, setFilterEnd] = useState<string>('');
  const [txnType, setTxnType] = useState<'all' | 'expense' | 'income'>('all');
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalTitle, setResultModalTitle] = useState('');
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalTone, setResultModalTone] = useState<'destructive' | 'primary'>('primary');
  
  const SUSPICIOUS_KEY = 'held_suspicious';

  const dedupeExpenses = (items: ExtractedExpense[] = []) => {
    const map = new Map<string, ExtractedExpense>();
    items.forEach((e) => {
      const key = `${e.sender || ''}:${e.timestamp || ''}:${e.amount}:${e.rawMessage || ''}`;
      if (!map.has(key)) map.set(key, e);
    });
    return Array.from(map.values());
  };

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const held = await readJson<ExtractedExpense[]>(SUSPICIOUS_KEY);
        if (held && held.length > 0) {
          setLastResult((prev) => ({ 
            ...(prev || { expenses: [], suspicious: [], success: true, totalProcessed: 0, errors: [] }), 
            suspicious: dedupeExpenses([...(prev?.suspicious || []), ...held]) 
          } as SMSParsingResult));
        }
      } catch (err) {
        console.warn('Failed to load held suspicious items', err);
      }
    })();
  }, []);

  const checkPermissionStatus = async () => {
    if (Platform.OS !== 'android') {
      setHasPermission(false);
      return;
    }
    try {
      setHasPermission(null);
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
        Alert.alert('Permission Required', 'SMS permission is required to automatically import expenses.');
      }
    } catch (error) {
      console.error('requestSMSPermission error', error);
      Alert.alert('Error', 'Failed to request SMS permission');
    }
  };

  const handleImportSMS = async () => {
    if (hasPermission === null) await checkPermissionStatus();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant SMS permission first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Grant Permission', onPress: handleRequestPermission },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      const options: any = { maxCount: 200, autoSave: true };
      if (rangeOption === 'today') options.onlyToday = true;
      else if (rangeOption === '7') options.daysBack = 7;
      else if (rangeOption === '30') options.daysBack = 30;
      else if (rangeOption === 'customDays') options.daysBack = Math.max(1, Math.floor(customDays) || 1);
      else if (rangeOption === 'customRange') {
        const start = customStart ? new Date(customStart) : null;
        const end = customEnd ? new Date(customEnd) : null;
        if (start && !isNaN(start.getTime())) options.minDate = start.getTime();
        if (end && !isNaN(end.getTime())) options.maxDate = end.getTime() + (24 * 60 * 60 * 1000) - 1;
      }

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
        filter: (expense) => txnType === 'all' || expense.type === txnType,
      });

      try {
        const persistedHeld = await readJson<ExtractedExpense[]>(SUSPICIOUS_KEY);
        const mergedSuspicious = dedupeExpenses([...(persistedHeld || []), ...(result.suspicious || [])]);
        await writeJson(SUSPICIOUS_KEY, mergedSuspicious);
        emitter.emit('transactions:changed');
        result.suspicious = mergedSuspicious;
      } catch (e) {
        console.warn('Persist error', e);
      }
      
      setLastResult(result);
      if (result.success) {
        setResultModalTitle('SMS Retrieval Complete');
        setResultModalMessage(`Found ${result.expenses.length} expenses. ${result.suspicious?.length || 0} held for review.`);
        setResultModalTone('primary');
        setResultModalVisible(true);
      } else {
        setResultModalTitle('Import Failed');
        setResultModalMessage(result.errors.join('\n') || 'Unknown error');
        setResultModalTone('destructive');
        setResultModalVisible(true);
      }
      onImportComplete?.(result, options);
    } catch (error) {
      console.error('Import error', error);
      setResultModalTitle('Import Failed');
      setResultModalMessage('Failed to read SMS alerts.');
      setResultModalTone('destructive');
      setResultModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSuspicious = async (expense: ExtractedExpense) => {
    try {
      setIsLoading(true);
      await saveTransaction({
        amount: expense.amount,
        type: expense.type,
        vendor: expense.vendor ?? 'Unknown',
        category: expense.category ?? 'other',
        description: `(Suspicious) ${expense.description}`,
        tags: ['sms-import', 'suspicious'],
        smsData: {
          rawMessage: expense.rawMessage,
          sender: expense.sender || 'Unknown',
          timestamp: expense.timestamp || Date.now(),
        },
      });
      setLastResult((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, suspicious: (prev.suspicious || []).filter((e) => e !== expense) };
        writeJson(SUSPICIOUS_KEY, updated.suspicious || []);
        emitter.emit('transactions:changed');
        return updated;
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to save transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIgnoreSuspicious = (expense: ExtractedExpense) => {
    setLastResult((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, suspicious: (prev.suspicious || []).filter((e) => e !== expense) };
      writeJson(SUSPICIOUS_KEY, updated.suspicious || []);
      emitter.emit('transactions:changed');
      return updated;
    });
  };

  // Calendar Modal State
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'start' | 'end'>('start');

  const openCalendarFor = (mode: 'start' | 'end') => {
    setCalendarMode(mode);
    setCalendarVisible(true);
  };

  const closeCalendar = () => setCalendarVisible(false);

  const handlePickDate = (pickedDate: Date) => {
    const yy = pickedDate.getFullYear();
    const mm = `${pickedDate.getMonth() + 1}`.padStart(2, '0');
    const dd = `${pickedDate.getDate()}`.padStart(2, '0');
    const v = `${yy}-${mm}-${dd}`;
    if (calendarMode === 'start') {
      setFilterStart(v);
      if (filterEnd && new Date(filterEnd) < new Date(v)) setFilterEnd('');
    } else {
      setFilterEnd(v);
      if (filterStart && new Date(filterStart) > new Date(v)) setFilterStart('');
    }
  };

  const getCalendarValue = (): Date | undefined => {
    const raw = calendarMode === 'start' ? filterStart : filterEnd;
    if (!raw) return undefined;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const renderExpenseItem = (expense: ExtractedExpense, index: number) => {
    const confidenceBg = expense.confidence > 0.7
      ? (isDark ? 'rgba(16,185,129,0.16)' : '#f0fdf4')
      : expense.confidence > 0.5
        ? (isDark ? 'rgba(245,158,11,0.18)' : '#fffbeb')
        : (isDark ? 'rgba(239,68,68,0.16)' : '#fef2f2');
    const confidenceText = expense.confidence > 0.7
      ? (isDark ? '#86efac' : '#166534')
      : expense.confidence > 0.5
        ? (isDark ? '#fcd34d' : '#92400e')
        : (isDark ? '#fca5a5' : '#991b1b');

    const itemStyle = StyleSheet.flatten([
      styles.expenseItem,
      {
        backgroundColor: cardColor,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      },
    ]) as ViewStyle;

    const Container: any = View;
    return (
      <Container key={index} style={itemStyle}>
        <View style={styles.expenseHeader}>
          <View>
            <Typography style={{ fontSize: 16, fontWeight: '700', color: text }}>{expense.vendor}</Typography>
            <Typography style={{ color: mutedForeground, fontSize: 12 }}>{expense.category}</Typography>
          </View>
          <Typography style={{ fontSize: 18, fontWeight: '800', color: expense.type === 'income' ? '#10b981' : text }}>
            {expense.type === 'income' ? '+' : '-'}{formatAmount(expense.amount)}
          </Typography>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
          <View style={StyleSheet.flatten([styles.confidenceBadge, { backgroundColor: confidenceBg }]) as ViewStyle}>
            <Typography style={{ color: confidenceText, fontSize: 10, fontWeight: '700' }}>
              {Math.round(expense.confidence * 100)}% Match
            </Typography>
          </View>
          <Typography style={{ flex: 1, fontSize: 12, color: mutedForeground }} numberOfLines={1}>{expense.description}</Typography>
        </View>
      </Container>
    );
  };

  const renderRangeOptionButton = (value: typeof rangeOption, label: string) => (
    <TouchableOpacity
      key={value}
      style={[
        styles.rangePill,
        { borderColor: rangePillBorderColor, backgroundColor: rangePillBg },
        rangeOption === value ? styles.rangePillActive : {},
      ]}
      onPress={() => setRangeOption(value)}
    >
      <Typography style={[styles.rangePillText, { color: rangePillTextColor }, rangeOption === value ? styles.rangePillTextActive : {}]}>{label}</Typography>
    </TouchableOpacity>
  );

  if (Platform.OS !== 'android') {
    return (
      <Card style={{ margin: 16 }}>
        <View style={styles.notAvailable}>
          <Info size={48} color={mutedForeground} />
          <Typography style={[styles.notAvailableTitle, { color: text }]}>SMS Import Not Available</Typography>
          <Typography style={[styles.notAvailableText, { color: mutedForeground }]}>Supported only on Android devices.</Typography>
        </View>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Card style={[styles.card, { backgroundColor: cardColor, borderColor: border }]}>
        <CardHeader>
          <View style={styles.header}>
            <View style={[styles.headerIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff7ed' }]}>
              <MessageCircle size={24} color={primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Typography style={[styles.title, { color: text }]}>SMS Alerts</Typography>
              <Typography style={[styles.description, { color: mutedForeground }]}>AI-powered expense extraction</Typography>
            </View>
          </View>
        </CardHeader>
        <CardContent>
          <ConfirmActionModal
            visible={resultModalVisible}
            title={resultModalTitle}
            message={resultModalMessage}
            confirmLabel="OK"
            confirmTone={resultModalTone}
            showCancel={false}
            blurIntensity={95}
            onCancel={() => setResultModalVisible(false)}
            onConfirm={() => setResultModalVisible(false)}
          />

          <DateCalendarModal
            visible={calendarVisible}
            onClose={closeCalendar}
            title={calendarMode === 'start' ? 'Select Start Date' : 'Select End Date'}
            value={getCalendarValue()}
            onConfirm={handlePickDate}
            allowClear
            onClear={() => {
              if (calendarMode === 'start') setFilterStart('');
              else setFilterEnd('');
            }}
          />

          <View style={{ marginBottom: 20 }}>
            <Typography style={[styles.sectionTitle, { color: mutedForeground }]}>Filter & Range</Typography>
            <View style={styles.rangeSelector}>
              {['today', '7', '30', 'customDays', 'customRange'].map((o: any) => renderRangeOptionButton(o, o==='today'?'Today':o==='7'?'7 Days':o==='30'?'30 Days':o==='customDays'?'Days':'Range'))}
            </View>

            {rangeOption === 'customDays' && (
              <View style={styles.inputRow}>
                <Typography style={{ color: text }}>Days:</Typography>
                <TextInput
                  value={String(customDays)}
                  onChangeText={v => setCustomDays(parseInt(v)||1)}
                  style={[styles.numericInput, { color: text, borderColor: border, backgroundColor: inputBackground }]}
                  keyboardType="numeric"
                  placeholderTextColor={mutedForeground}
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity onPress={() => openCalendarFor('start')} style={[styles.rangePill, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderColor: rangePillBorderColor, backgroundColor: rangePillBg }]}>
                <CalendarIcon size={14} color={mutedForeground} />
                <Typography style={{ fontSize: 12, color: mutedForeground }}>{filterStart || 'From'}</Typography>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openCalendarFor('end')} style={[styles.rangePill, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderColor: rangePillBorderColor, backgroundColor: rangePillBg }]}>
                <CalendarIcon size={14} color={mutedForeground} />
                <Typography style={{ fontSize: 12, color: mutedForeground }}>{filterEnd || 'To'}</Typography>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.alertBlock, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff7ed' }]}>
            <View style={[styles.headerIconContainer, { backgroundColor: hasPermission ? (isDark ? 'rgba(16,185,129,0.15)' : '#f0fdf4') : (isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2'), width: 40, height: 40, marginRight: 12 }]}>
              {hasPermission ? <CheckCircle size={20} color="#10b981" /> : <AlertCircle size={20} color="#ef4444" />}
            </View>
            <View style={{ flex: 1 }}>
              <Typography style={{ fontWeight: 'bold', color: text }}>{hasPermission ? 'Ready to Sync' : 'Access Needed'}</Typography>
              <Typography style={{ fontSize: 12, color: mutedForeground }}>{hasPermission ? 'SMS reading is enabled' : 'Grant permission to automate'}</Typography>
            </View>
            {!hasPermission && (
              <Button style={{ paddingVertical: 6, paddingHorizontal: 16, height: 'auto', minWidth: 80 }} onPress={handleRequestPermission}>
                <Typography style={{ color: primaryForeground, fontWeight: 'bold' }}>Allow</Typography>
              </Button>
            )}
          </View>

          <Button onPress={handleImportSMS} disabled={!hasPermission || isLoading} style={{ height: 50, borderRadius: 12 }}>
            {isLoading ? <ActivityIndicator color={primaryForeground} /> : <Typography style={{ color: primaryForeground, fontWeight: 'bold' }}>Scan for Transactions</Typography>}
          </Button>

          {lastResult && (
            <View style={[styles.resultsContainer, { borderTopColor: border }]}>
              <View style={styles.statGrid}>
                <View style={[styles.statCard, { backgroundColor: cardColor, borderColor: border }]}><Typography style={[styles.statNum, {color:primary}]}>{lastResult.expenses.length}</Typography><Typography style={[styles.statLab, { color: mutedForeground }]}>Found</Typography></View>
                <View style={[styles.statCard, { backgroundColor: cardColor, borderColor: border }]}><Typography style={[styles.statNum, { color: text }]}>{lastResult.totalProcessed}</Typography><Typography style={[styles.statLab, { color: mutedForeground }]}>Total</Typography></View>
                {lastResult.suspicious && lastResult.suspicious.length > 0 && (
                  <View style={[styles.statCard, { borderColor: suspiciousBorder, backgroundColor: cardColor }]}><Typography style={[styles.statNum, {color:'#ef4444'}]}>{lastResult.suspicious.length}</Typography><Typography style={[styles.statLab, { color: mutedForeground }]}>Flagged</Typography></View>
                )}
              </View>

              {lastResult.expenses.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Typography style={[styles.sectionTitle, { color: mutedForeground }]}>Imported Lately</Typography>
                  {lastResult.expenses.slice(0, 3).map((e, i) => renderExpenseItem(e, i))}
                </View>
              )}

              {lastResult.suspicious && lastResult.suspicious.length > 0 && (
                <View style={[styles.suspiciousBlock, { backgroundColor: suspiciousBackground, borderColor: suspiciousBorder }]}>
                  <Typography style={[styles.sectionTitle, {color: criticalText}]}>Needs Review</Typography>
                  {lastResult.suspicious.slice(0, 2).map((e, i) => {
                    const SuspItemView: any = View;
                    return (
                      <SuspItemView key={i} style={[styles.suspItem, { borderBottomColor: suspiciousDivider }]}>
                        <View style={{ flex: 1 }}><Typography style={{ fontWeight: '600', color: text }}>{e.vendor || 'Unknown'}</Typography><Typography style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatAmount(e.amount)}</Typography></View>
                        <View style={{ flexDirection: 'row', gap: 6 }}><Button style={{ height: 32, paddingVertical: 0 }} onPress={() => handleSaveSuspicious(e)}>Save</Button><Button variant="ghost" style={{ height: 32 }} onPress={() => handleIgnoreSuspicious(e)}>Ignore</Button></View>
                      </SuspItemView>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  card: { padding: 16, borderRadius: 24, marginTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerIconContainer: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  description: { fontSize: 13 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  rangeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rangePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#64748b55' },
  rangePillActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  rangePillText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  rangePillTextActive: { color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  numericInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, width: 60, fontSize: 14 },
  alertBlock: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, marginTop: 20, marginBottom: 12 },
  resultsContainer: { marginTop: 24, paddingTop: 24, borderTopWidth: 1 },
  statGrid: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLab: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  expenseItem: { overflow: 'hidden' },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  suspiciousBlock: { marginTop: 24, padding: 16, borderRadius: 20, backgroundColor: '#fff8f7', borderWidth: 1, borderColor: '#fee2e2' },
  suspItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#fdeceb' },
  notAvailable: { alignItems: 'center', padding: 32 },
  notAvailableTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginTop: 16 },
  notAvailableText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
});
