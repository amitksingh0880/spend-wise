import { useCurrency } from '@/app/contexts/CurrencyContext';
import { emitter } from '@/app/libs/emitter';
import { readJson, writeJson } from '@/app/libs/storage';
import {
  ExtractedExpense,
  SMSParsingResult,
  checkSMSPermission,
  importExpensesFromSMS,
  parseTransactionSMS,
  requestSMSPermission,
} from '@/app/services/smsService';
import { saveTransaction } from '@/app/services/transactionService';
import { GhostButton, PrimaryButton } from '@/components/ui/button';
import Card from '@/components/ui/card';
import { Link } from 'expo-router';
import {
  AlertCircle,
  CheckCircle,
  Download,
  Info,
  MessageCircle,
  RefreshCw,
} from 'lucide-react-native';
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
  View,
} from 'react-native';

interface SMSImportProps {
  onImportComplete?: (result: SMSParsingResult) => void;
}

type RangeOption = 'today' | '7' | '30' | 'customDays' | 'customRange';
type TxnType = 'all' | 'expense' | 'income';

const SUSPICIOUS_KEY = 'held_suspicious';

const RANGE_LABELS: Record<RangeOption, string> = {
  today: 'Today',
  '7': 'Last 7 Days',
  '30': 'Last 30 Days',
  customDays: 'Custom Days',
  customRange: 'Date Range',
};

function dedupeExpenses(items: ExtractedExpense[] = []): ExtractedExpense[] {
  const map = new Map<string, ExtractedExpense>();
  items.forEach((e) => {
    const key = `${e.sender}:${e.timestamp}:${e.amount}:${e.rawMessage}`;
    if (!map.has(key)) map.set(key, e);
  });
  return Array.from(map.values());
}

// ---------- Mini Calendar Component ----------
interface CalendarPickerProps {
  visible: boolean;
  mode: 'start' | 'end';
  selectedStart: string;
  selectedEnd: string;
  onPickDate: (date: Date, mode: 'start' | 'end') => void;
  onClear: (mode: 'start' | 'end') => void;
  onClose: () => void;
}

function CalendarPicker({ visible, mode, selectedStart, selectedEnd, onPickDate, onClear, onClose }: CalendarPickerProps) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const currentSelected = mode === 'start' ? selectedStart : selectedEnd;
  const selectedDate = currentSelected ? new Date(currentSelected) : null;

  function getMonthDays(y: number, m: number): Date[] {
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const days: Date[] = [];
    for (let i = first.getDay() - 1; i >= 0; i--) {
      days.push(new Date(y, m, -i));
    }
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d));
    while (days.length % 7 !== 0) {
      const nextIdx = days.length - first.getDay() + 1;
      days.push(new Date(y, m + 1, nextIdx));
    }
    return days;
  }

  function isSameDay(a?: Date | null, b?: Date | null) {
    return a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const days = getMonthDays(year, month);
  const monthName = new Date(year, month, 1).toLocaleString(undefined, { month: 'long' });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={cal.backdrop}>
        <View style={cal.sheet}>
          <Text style={cal.headerTitle}>{mode === 'start' ? 'Select Start Date' : 'Select End Date'}</Text>

          <View style={cal.navRow}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
              <Text style={cal.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={cal.monthLabel}>{monthName} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
              <Text style={cal.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={cal.weekRow}>
            {WEEK_DAYS.map(d => (
              <Text key={d} style={cal.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={cal.grid}>
            {days.map((d, idx) => {
              const otherMonth = d.getMonth() !== month;
              const selected = isSameDay(d, selectedDate);
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => onPickDate(d, mode)}
                  style={[cal.dayCell, selected && cal.dayCellSelected, otherMonth && cal.dayCellOther]}
                >
                  <Text style={[cal.dayText, selected && cal.dayTextSelected, otherMonth && cal.dayTextOther]}>
                    {d.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={cal.actions}>
            <TouchableOpacity onPress={() => onClear(mode)} style={cal.clearBtn}>
              <Text style={cal.clearBtnText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={cal.closeBtn}>
              <Text style={cal.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------- Expense Preview Card ----------
function ExpenseCard({ expense, formatAmount }: { expense: ExtractedExpense; formatAmount: (n: number) => string }) {
  const isIncome = expense.type === 'income';
  const conf = expense.confidence;
  const confColor = conf > 0.7 ? '#10b981' : conf > 0.5 ? '#f59e0b' : '#ef4444';

  return (
    <View style={s.expenseCard}>
      <View style={s.expenseCardRow}>
        <Text style={[s.expenseAmount, isIncome ? s.amountIncome : s.amountExpense]}>
          {isIncome ? '+' : '–'}{formatAmount(expense.amount)}
        </Text>
        <View style={[s.confBadge, { backgroundColor: confColor }]}>
          <Text style={s.confText}>{Math.round(conf * 100)}%</Text>
        </View>
      </View>
      <Text style={s.expenseVendor}>{expense.vendor || 'Unknown'}</Text>
      <Text style={s.expenseCategory}>{expense.category}</Text>
      <Text style={s.expenseDesc} numberOfLines={2}>{expense.description}</Text>
    </View>
  );
}

// ---------- Main SMSImport Component ----------
export default function SMSImport({ onImportComplete }: SMSImportProps) {
  const { formatAmount } = useCurrency();
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastResult, setLastResult] = useState<SMSParsingResult | null>(null);
  const [rangeOption, setRangeOption] = useState<RangeOption>('today');
  const [customDays, setCustomDays] = useState(7);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [txnType, setTxnType] = useState<TxnType>('all');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'start' | 'end'>('start');

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  // Load persisted held suspicious on mount
  useEffect(() => {
    (async () => {
      try {
        const held = await readJson<ExtractedExpense[]>(SUSPICIOUS_KEY);
        if (held && held.length > 0) {
          setLastResult(prev => ({
            ...(prev ?? { expenses: [], totalProcessed: 0, errors: [], success: true }),
            suspicious: dedupeExpenses([...(prev?.suspicious ?? []), ...held]),
          } as SMSParsingResult));
        }
      } catch (err) {
        console.warn('[SMSImport] Failed to load held suspicious items', err);
      }
    })();
  }, []);

  const checkPermissionStatus = async () => {
    if (Platform.OS !== 'android') { setHasPermission(false); return; }
    try {
      setHasPermission(null);
      const granted = await checkSMSPermission();
      setHasPermission(granted);
    } catch {
      setHasPermission(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await requestSMSPermission();
      setHasPermission(granted);
      if (!granted) {
        Alert.alert('Permission Required', 'SMS permission is required to import expenses from bank alerts.');
      }
    } catch {
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
      const opts: Parameters<typeof importExpensesFromSMS>[0] = {
        maxCount: 200,
        autoSave: true,
      };

      if (rangeOption === 'today') {
        opts.onlyToday = true;
      } else if (rangeOption === '7') {
        opts.daysBack = 7;
      } else if (rangeOption === '30') {
        opts.daysBack = 30;
      } else if (rangeOption === 'customDays') {
        opts.daysBack = Math.max(1, Math.floor(customDays) || 1);
      } else if (rangeOption === 'customRange') {
        const start = customStart ? new Date(customStart) : null;
        const end = customEnd ? new Date(customEnd) : null;
        if (start && !isNaN(start.getTime())) opts.minDate = start.getTime();
        if (end && !isNaN(end.getTime())) opts.maxDate = end.getTime() + 24 * 60 * 60 * 1000 - 1;
      }

      // Date filter overrides
      if (filterStart) {
        const d = new Date(filterStart);
        if (!isNaN(d.getTime())) opts.minDate = d.setHours(0, 0, 0, 0);
      }
      if (filterEnd) {
        const d = new Date(filterEnd);
        if (!isNaN(d.getTime())) opts.maxDate = d.setHours(23, 59, 59, 999);
      }

      const result = await importExpensesFromSMS({
        ...opts,
        filter: txnType === 'all' ? undefined : (e) => e.type === txnType,
      });

      // Merge held suspicious
      try {
        const persisted = await readJson<ExtractedExpense[]>(SUSPICIOUS_KEY);
        const merged = dedupeExpenses([...(persisted ?? []), ...(result.suspicious ?? [])]);
        await writeJson(SUSPICIOUS_KEY, merged);
        emitter.emit('transactions:changed');
        result.suspicious = merged;
      } catch (e) {
        console.warn('[SMSImport] Failed to persist held suspicious', e);
      }

      setLastResult(result);

      if (result.success && result.expenses.length > 0) {
        Alert.alert(
          'Import Successful',
          `Saved ${result.expenses.length} transaction${result.expenses.length !== 1 ? 's' : ''}.${
            (result.suspicious?.length ?? 0) > 0
              ? `\n\n${result.suspicious!.length} high-value transaction${result.suspicious!.length !== 1 ? 's' : ''} are held for review.`
              : ''
          }`,
          [{ text: 'OK' }]
        );
      } else if (result.success) {
        Alert.alert(
          'No Transactions Found',
          'No bank transaction SMS messages were found for the selected period.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Import Failed', result.errors.join('\n') || 'Unknown error', [{ text: 'OK' }]);
      }

      onImportComplete?.(result);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Unknown error. If using Expo Go, please use a custom dev client — native SMS modules require a full build.';
      Alert.alert('Import Failed', msg, [{ text: 'OK' }]);
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
        smsData: { rawMessage: expense.rawMessage, sender: expense.sender || 'Unknown', timestamp: expense.timestamp || Date.now() },
      });
      Alert.alert('Saved', `Transaction ${tx.id} saved.`);
      setLastResult(prev => {
        if (!prev) return prev;
        const updated = { ...prev, suspicious: (prev.suspicious ?? []).filter(e => e !== expense) };
        (async () => { await writeJson(SUSPICIOUS_KEY, updated.suspicious ?? []); emitter.emit('transactions:changed'); })();
        return updated as SMSParsingResult;
      });
    } catch (err: any) {
      Alert.alert('Error', `Failed to save: ${err?.message ?? err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIgnoreSuspicious = (expense: ExtractedExpense) => {
    setLastResult(prev => {
      if (!prev) return prev;
      const updated = { ...prev, suspicious: (prev.suspicious ?? []).filter(e => e !== expense) };
      (async () => { await writeJson(SUSPICIOUS_KEY, updated.suspicious ?? []); emitter.emit('transactions:changed'); })();
      return updated as SMSParsingResult;
    });
  };

  const handleRegenerateSuspicious = (expense: ExtractedExpense) => {
    const sms = { id: `regen-${Date.now()}`, address: expense.sender, body: expense.rawMessage, date: expense.timestamp, type: 1 };
    const parsed = parseTransactionSMS(sms as any);
    if (!parsed) {
      Alert.alert('No Change', 'Re-parse did not find a better result.');
      return;
    }
    setLastResult(prev => {
      if (!prev) return prev;
      const updated = { ...prev, suspicious: (prev.suspicious ?? []).map(e => e === expense ? parsed : e) };
      (async () => { await writeJson(SUSPICIOUS_KEY, updated.suspicious ?? []); emitter.emit('transactions:changed'); })();
      return updated as SMSParsingResult;
    });
    Alert.alert('Re-parsed', `New amount: ${formatAmount(parsed.amount)} (${Math.round(parsed.confidence * 100)}% confidence)`);
  };

  const handleCalendarPick = (d: Date, mode: 'start' | 'end') => {
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (mode === 'start') {
      setFilterStart(ymd);
      if (filterEnd && new Date(filterEnd) < new Date(ymd)) setFilterEnd('');
    } else {
      setFilterEnd(ymd);
      if (filterStart && new Date(filterStart) > new Date(ymd)) setFilterStart('');
    }
    setCalendarVisible(false);
  };

  // ---- Render: iOS not supported ----
  if (Platform.OS !== 'android') {
    return (
      <Card style={s.container}>
        <View style={s.notAvailable}>
          <Info size={48} color="#64748b" />
          <Text style={s.notAvailableTitle}>SMS Import Not Available</Text>
          <Text style={s.notAvailableText}>SMS import is only supported on Android devices.</Text>
        </View>
      </Card>
    );
  }

  const importBtnLabel = RANGE_LABELS[rangeOption];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      {/* Calendar Modal */}
      <CalendarPicker
        visible={calendarVisible}
        mode={calendarMode}
        selectedStart={filterStart}
        selectedEnd={filterEnd}
        onPickDate={handleCalendarPick}
        onClear={(m) => { if (m === 'start') setFilterStart(''); else setFilterEnd(''); setCalendarVisible(false); }}
        onClose={() => setCalendarVisible(false)}
      />

      <Card style={s.card}>
        {/* Header */}
        <View style={s.cardHeader}>
          <View style={s.iconCircle}>
            <MessageCircle size={20} color="#3b82f6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Import from SMS</Text>
            <Text style={s.cardSubtitle}>Auto-extract expenses from bank alerts</Text>
          </View>
        </View>

        {/* Permission status */}
        <View style={s.permRow}>
          {hasPermission === null ? (
            <ActivityIndicator size="small" color="#60a5fa" />
          ) : hasPermission ? (
            <CheckCircle size={16} color="#10b981" />
          ) : (
            <AlertCircle size={16} color="#ef4444" />
          )}
          <Text style={[s.permText, { color: hasPermission ? '#10b981' : hasPermission === null ? '#9ca3af' : '#ef4444' }]}>
            {hasPermission === null ? 'Checking…' : hasPermission ? 'SMS Permission Granted' : 'SMS Permission Required'}
          </Text>
          {hasPermission === false && (
            <TouchableOpacity onPress={handleRequestPermission} style={s.grantBtn}>
              <Text style={s.grantBtnText}>Grant</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>

      <Card style={s.card}>
        {/* Range selector */}
        <Text style={s.sectionLabel}>Import Range</Text>
        <View style={s.rangeRow}>
          {(['today', '7', '30', 'customDays', 'customRange'] as RangeOption[]).map(opt => (
            <TouchableOpacity
              key={opt}
              style={[s.rangeChip, rangeOption === opt && s.rangeChipActive]}
              onPress={() => setRangeOption(opt)}
            >
              <Text style={[s.rangeChipText, rangeOption === opt && s.rangeChipTextActive]}>
                {RANGE_LABELS[opt]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {rangeOption === 'customDays' && (
          <View style={s.inputRow}>
            <Text style={s.inputLabel}>Days back:</Text>
            <TextInput
              value={String(customDays)}
              onChangeText={v => setCustomDays(Math.max(1, parseInt(v || '1', 10) || 1))}
              style={s.numInput}
              keyboardType="numeric"
              placeholderTextColor="#64748b"
            />
          </View>
        )}

        {rangeOption === 'customRange' && (
          <View style={s.inputRow}>
            <TextInput
              value={customStart}
              onChangeText={setCustomStart}
              placeholder="Start YYYY-MM-DD"
              placeholderTextColor="#64748b"
              style={[s.dateInput, { marginRight: 8 }]}
            />
            <Text style={s.inputLabel}>to</Text>
            <TextInput
              value={customEnd}
              onChangeText={setCustomEnd}
              placeholder="End YYYY-MM-DD"
              placeholderTextColor="#64748b"
              style={[s.dateInput, { marginLeft: 8 }]}
            />
          </View>
        )}
      </Card>

      <Card style={s.card}>
        {/* Filter Controls */}
        <Text style={s.sectionLabel}>Filters</Text>

        <View style={s.dateFilterRow}>
          <TouchableOpacity
            onPress={() => { setCalendarMode('start'); setCalendarVisible(true); }}
            style={s.dateFilterBtn}
          >
            <Text style={[s.dateFilterText, filterStart ? s.dateFilterTextSet : {}]}>
              {filterStart || 'From date'}
            </Text>
          </TouchableOpacity>
          <Text style={s.dateFilterSep}>→</Text>
          <TouchableOpacity
            onPress={() => { setCalendarMode('end'); setCalendarVisible(true); }}
            style={s.dateFilterBtn}
          >
            <Text style={[s.dateFilterText, filterEnd ? s.dateFilterTextSet : {}]}>
              {filterEnd || 'To date'}
            </Text>
          </TouchableOpacity>
          {(filterStart || filterEnd) && (
            <TouchableOpacity onPress={() => { setFilterStart(''); setFilterEnd(''); }} style={s.clearDatesBtn}>
              <Text style={s.clearDatesBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.typeFilterRow}>
          {(['all', 'expense', 'income'] as TxnType[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[s.typeChip, txnType === t && s.typeChipActive]}
              onPress={() => setTxnType(t)}
            >
              <Text style={[s.typeChipText, txnType === t && s.typeChipTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Import Button */}
      <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
        <PrimaryButton onPress={handleImportSMS} disabled={!hasPermission || isLoading} style={s.importBtn}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={s.importBtnContent}>
              <Download size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.importBtnText}>Import — {importBtnLabel}</Text>
            </View>
          )}
        </PrimaryButton>
      </View>

      {/* Results */}
      {lastResult && (
        <Card style={s.card}>
          <Text style={s.sectionLabel}>Last Import Results</Text>

          {/* Stats row */}
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statNum}>{lastResult.expenses.length}</Text>
              <Text style={s.statLbl}>Saved</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={s.statNum}>{lastResult.totalProcessed}</Text>
              <Text style={s.statLbl}>Scanned</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={[s.statNum, { color: (lastResult.suspicious?.length ?? 0) > 0 ? '#f97316' : '#f9fafb' }]}>
                {lastResult.suspicious?.length ?? 0}
              </Text>
              <Text style={s.statLbl}>Flagged</Text>
            </View>
            {lastResult.errors.length > 0 && (
              <>
                <View style={s.statDivider} />
                <View style={s.statBox}>
                  <Text style={[s.statNum, { color: '#ef4444' }]}>{lastResult.errors.length}</Text>
                  <Text style={s.statLbl}>Errors</Text>
                </View>
              </>
            )}
          </View>

          {/* Sample saved expenses */}
          {lastResult.expenses.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={s.subLabel}>Saved Transactions</Text>
              {lastResult.expenses.slice(0, 5).map((exp, idx) => (
                <ExpenseCard key={idx} expense={exp} formatAmount={formatAmount} />
              ))}
              {lastResult.expenses.length > 5 && (
                <Text style={s.moreText}>+{lastResult.expenses.length - 5} more saved</Text>
              )}
            </View>
          )}

          {/* Suspicious */}
          {(lastResult.suspicious?.length ?? 0) > 0 && (
            <View style={s.suspSection}>
              <View style={s.suspHeader}>
                <AlertCircle size={16} color="#f97316" />
                <Text style={s.suspTitle}>High-Value — Needs Review</Text>
                <Link href="/suspicious" style={{ marginLeft: 'auto' }}>
                  <GhostButton>Review All</GhostButton>
                </Link>
              </View>

              <View style={s.suspBulkRow}>
                <PrimaryButton
                  style={s.suspBulkBtn}
                  onPress={async () => { for (const e of lastResult.suspicious ?? []) await handleSaveSuspicious(e); }}
                >
                  <Text style={{ color: '#fff', fontSize: 13 }}>Save All</Text>
                </PrimaryButton>
                <GhostButton
                  style={[s.suspBulkBtn, { marginLeft: 8 }]}
                  onPress={() => setLastResult(p => p ? { ...p, suspicious: [] } : p)}
                >
                  <Text style={{ fontSize: 13 }}>Dismiss All</Text>
                </GhostButton>
              </View>

              {lastResult.suspicious!.map((exp, idx) => (
                <View key={idx} style={s.suspItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.suspVendor}>{exp.vendor || 'Unknown'}</Text>
                    <Text style={s.suspAmount}>{formatAmount(exp.amount)}</Text>
                    <Text style={s.suspConf}>{Math.round(exp.confidence * 100)}% confidence</Text>
                  </View>
                  <View style={s.suspActions}>
                    <TouchableOpacity onPress={() => handleSaveSuspicious(exp)} style={s.suspActionBtn}>
                      <CheckCircle size={18} color="#10b981" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRegenerateSuspicious(exp)} style={s.suspActionBtn}>
                      <RefreshCw size={18} color="#60a5fa" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleIgnoreSuspicious(exp)} style={s.suspActionBtn}>
                      <AlertCircle size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Errors */}
          {lastResult.errors.length > 0 && (
            <View style={s.errorBox}>
              <Text style={s.errorTitle}>Errors</Text>
              {lastResult.errors.map((err, idx) => (
                <Text key={idx} style={s.errorItem}>• {err}</Text>
              ))}
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

/* ===================== Styles ===================== */

const DARK_BG = '#0f172a';
const CARD_BG = '#1e293b';
const BORDER = '#334155';
const TEXT_PRIMARY = '#f9fafb';
const TEXT_SECONDARY = '#94a3b8';
const ACCENT = '#3b82f6';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  card: { marginHorizontal: 16, marginBottom: 12, padding: 16 },
  notAvailable: { alignItems: 'center', padding: 40 },
  notAvailableTitle: { fontSize: 18, fontWeight: '700', color: TEXT_SECONDARY, marginTop: 16, marginBottom: 6 },
  notAvailableText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },

  // Card header
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1d3a5e', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  cardSubtitle: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },

  // Permission
  permRow: { flexDirection: 'row', alignItems: 'center' },
  permText: { fontSize: 14, fontWeight: '500', marginLeft: 6, flex: 1 },
  grantBtn: {
    backgroundColor: ACCENT, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, marginLeft: 8,
  },
  grantBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Section labels
  sectionLabel: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  subLabel: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY, marginBottom: 8 },

  // Range chips
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rangeChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, backgroundColor: 'transparent',
  },
  rangeChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  rangeChipText: { color: TEXT_SECONDARY, fontSize: 13, fontWeight: '500' },
  rangeChipTextActive: { color: '#fff' },

  // Inputs
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  inputLabel: { color: TEXT_SECONDARY, fontSize: 14, marginRight: 8 },
  numInput: {
    borderWidth: 1, borderColor: BORDER, backgroundColor: DARK_BG,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, width: 80, color: TEXT_PRIMARY, textAlign: 'center',
  },
  dateInput: {
    flex: 1, borderWidth: 1, borderColor: BORDER, backgroundColor: DARK_BG,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, color: TEXT_PRIMARY, fontSize: 13,
  },

  // Date filter
  dateFilterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dateFilterBtn: {
    flex: 1, paddingVertical: 9, paddingHorizontal: 12,
    borderWidth: 1, borderColor: BORDER, borderRadius: 8, backgroundColor: DARK_BG,
    alignItems: 'center',
  },
  dateFilterText: { color: '#64748b', fontSize: 13 },
  dateFilterTextSet: { color: TEXT_PRIMARY },
  dateFilterSep: { color: TEXT_SECONDARY, marginHorizontal: 8, fontSize: 16 },
  clearDatesBtn: { padding: 8, marginLeft: 4 },
  clearDatesBtnText: { color: '#ef4444', fontSize: 16 },

  // Type filter chips
  typeFilterRow: { flexDirection: 'row' },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, marginRight: 8,
  },
  typeChipActive: { backgroundColor: '#0f3460', borderColor: '#2563eb' },
  typeChipText: { color: TEXT_SECONDARY, fontSize: 13, fontWeight: '500' },
  typeChipTextActive: { color: '#60a5fa' },

  // Import button
  importBtn: { width: '100%', borderRadius: 12 },
  importBtnContent: { flexDirection: 'row', alignItems: 'center' },
  importBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: DARK_BG, borderRadius: 10, padding: 14, marginBottom: 4,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 22, fontWeight: '800', color: TEXT_PRIMARY },
  statLbl: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: 1, height: 32, backgroundColor: BORDER },
  moreText: { textAlign: 'center', color: TEXT_SECONDARY, fontSize: 13, marginTop: 6, fontStyle: 'italic' },

  // Expense card
  expenseCard: {
    backgroundColor: DARK_BG, borderRadius: 8, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  expenseCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  expenseAmount: { fontSize: 16, fontWeight: '700' },
  amountIncome: { color: '#10b981' },
  amountExpense: { color: '#f9fafb' },
  confBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  confText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  expenseVendor: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 2 },
  expenseCategory: { fontSize: 12, color: TEXT_SECONDARY, textTransform: 'capitalize', marginBottom: 3 },
  expenseDesc: { fontSize: 12, color: '#64748b', lineHeight: 16 },

  // Suspicious section
  suspSection: {
    marginTop: 12, borderRadius: 10, borderWidth: 1,
    borderColor: '#431407', backgroundColor: '#1c0a02', padding: 12,
  },
  suspHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  suspTitle: { color: '#f97316', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  suspBulkRow: { flexDirection: 'row', marginBottom: 10 },
  suspBulkBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  suspItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#431407',
  },
  suspVendor: { color: TEXT_PRIMARY, fontWeight: '600', fontSize: 14 },
  suspAmount: { color: '#ef4444', fontWeight: '800', fontSize: 16, marginTop: 2 },
  suspConf: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 2 },
  suspActions: { flexDirection: 'row', alignItems: 'center' },
  suspActionBtn: { padding: 8, marginLeft: 4 },

  // Errors
  errorBox: {
    marginTop: 12, backgroundColor: '#1c0909', borderRadius: 8,
    borderWidth: 1, borderColor: '#7f1d1d', padding: 12,
  },
  errorTitle: { color: '#fca5a5', fontWeight: '700', fontSize: 13, marginBottom: 6 },
  errorItem: { color: '#fca5a5', fontSize: 12, lineHeight: 18 },
});

// Calendar styles
const cal = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  sheet: {
    backgroundColor: CARD_BG, borderRadius: 16, padding: 20,
    width: '100%', maxWidth: 380, borderWidth: 1, borderColor: BORDER,
  },
  headerTitle: { color: TEXT_PRIMARY, fontWeight: '700', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { padding: 8 },
  navArrow: { color: TEXT_PRIMARY, fontSize: 22, fontWeight: '300' },
  monthLabel: { color: TEXT_PRIMARY, fontWeight: '600', fontSize: 15 },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekDay: { flex: 1, textAlign: 'center', color: TEXT_SECONDARY, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.2857%', paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  dayCellSelected: { backgroundColor: ACCENT, borderRadius: 20 },
  dayCellOther: { opacity: 0.3 },
  dayText: { color: TEXT_PRIMARY, fontSize: 14 },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  dayTextOther: { color: TEXT_SECONDARY },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  clearBtn: { backgroundColor: '#2d1b02', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  clearBtnText: { color: '#f97316', fontWeight: '600' },
  closeBtn: { backgroundColor: ACCENT, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  closeBtnText: { color: '#fff', fontWeight: '600' },
});
