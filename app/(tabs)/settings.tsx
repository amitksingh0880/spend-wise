import { useCurrency } from '@/contexts/CurrencyContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { emitter } from '@/libs/emitter';
import { deleteKey } from '@/libs/storage';
import { getCurrency, getUserPreferences, saveUserPreferences, updateCurrency } from '@/services/preferencesService';
import { seedMockData } from '@/services/seedService';
import { CURRENCIES, Currency } from '@/utils/currency';
import { 
  registerSmsAutoFetch, 
  unregisterSmsAutoFetch, 
  isSmsAutoFetchRegistered 
} from '@/services/backgroundTaskService';
// Lazy-load DateTimePicker only on native platforms to avoid web runtime issues
// We'll require it at runtime so bundlers don't try to resolve unsupported web module paths.
let DateTimePicker: any = undefined;
import { FontFamily } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Link } from 'expo-router';
import {
  Bell,
  Database,
  DollarSign,
  Download,
  Info,
  MessageCircle,
  Moon,
  Settings,
  Trash2,
  Upload,
  Type,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  User,
  Layout as LayoutIcon,
} from 'lucide-react-native';

import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
  TextInput,
  Linking,
} from 'react-native';
import { ExportOptions, exportTransactions, getExportFormats, validateExportOptions } from '@/services/exportService';
import {
  createAmountCategoryRule,
  deleteSmartRule,
  getSmartRules,
  SmartRule,
  updateSmartRule,
} from '@/services/rulesEngineService';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

import React, { useEffect, useState } from 'react';

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface QuickRuleTemplate {
  id: string;
  name: string;
  category: string;
  minAmount: number;
  maxAmount: number;
  keywords: string[];
  repeatCount: number;
  repeatDays: number;
  tolerance: number;
}

const QUICK_RULE_TEMPLATES: QuickRuleTemplate[] = [
  {
    id: 'daily-transport',
    name: 'Daily Transport',
    category: 'Transportation',
    minAmount: 20,
    maxAmount: 250,
    keywords: ['auto', 'cab', 'metro', 'bus', 'rickshaw'],
    repeatCount: 3,
    repeatDays: 14,
    tolerance: 10,
  },
  {
    id: 'office-commute',
    name: 'Office Commute',
    category: 'Transportation',
    minAmount: 40,
    maxAmount: 400,
    keywords: ['office', 'uber', 'ola', 'rapido', 'commute'],
    repeatCount: 4,
    repeatDays: 14,
    tolerance: 20,
  },
  {
    id: 'tea-coffee',
    name: 'Tea/Coffee',
    category: 'Food & Dining',
    minAmount: 10,
    maxAmount: 120,
    keywords: ['tea', 'coffee', 'cafe', 'chai'],
    repeatCount: 4,
    repeatDays: 10,
    tolerance: 5,
  },
];

const SettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const { theme: currentTheme, setTheme } = useAppTheme();
  const [currency, setCurrency] = useState<Currency>('INR');
  const [userName, setUserName] = useState('');
  const [appName, setAppName] = useState('');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [smsAutoFetch, setSmsAutoFetch] = useState(false);
  const [smsAutoFetchHour, setSmsAutoFetchHour] = useState(22);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [smartRules, setSmartRules] = useState<SmartRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [newRuleName, setNewRuleName] = useState('Daily Transport Rule');
  const [newRuleCategory, setNewRuleCategory] = useState('Transportation');
  const [newRuleMinAmount, setNewRuleMinAmount] = useState('20');
  const [newRuleMaxAmount, setNewRuleMaxAmount] = useState('200');
  const [newRuleKeywords, setNewRuleKeywords] = useState('auto,cab,metro,bus,rickshaw');
  const [newRuleRepeatCount, setNewRuleRepeatCount] = useState('3');
  const [newRuleRepeatDays, setNewRuleRepeatDays] = useState('14');
  const [newRuleTolerance, setNewRuleTolerance] = useState('10');
  const { refreshCurrency } = useCurrency();

  const { theme, fontFamily, setFontFamily } = useAppTheme();
  const isDark = theme === 'dark';

  const background = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const text = useThemeColor({}, 'text');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (currentTheme) setDarkMode(currentTheme === 'dark');
  }, [currentTheme]);

  const loadSettings = async () => {
    try {
      const prefs = await getUserPreferences();
      setCurrency(prefs.currency as Currency);
      setUserName(prefs.name || 'Amit Kumar');
      setAppName(prefs.appName || 'SpendWise');
      setNotifications(prefs.notifications.budgetAlerts);
      setSmsAutoFetch(!!prefs.smsAutoFetch);
      setSmsAutoFetchHour(prefs.smsAutoFetchHour ?? 22);
      await loadRules();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadRules = async () => {
    try {
      setRulesLoading(true);
      const rules = await getSmartRules();
      setSmartRules(rules.sort((a, b) => (b.priority || 0) - (a.priority || 0)));
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setRulesLoading(false);
    }
  };

  const handleToggleRule = async (rule: SmartRule, isActive: boolean) => {
    try {
      await updateSmartRule(rule.id, { isActive });
      await loadRules();
    } catch (error) {
      Alert.alert('Update Failed', 'Unable to update rule status.');
    }
  };

  const handleDeleteRule = async (rule: SmartRule) => {
    Alert.alert(
      'Delete Rule',
      `Delete "${rule.name || 'Unnamed Rule'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSmartRule(rule.id);
              await loadRules();
            } catch (error) {
              Alert.alert('Delete Failed', 'Unable to delete rule.');
            }
          },
        },
      ]
    );
  };

  const handleCreateAmountRule = async () => {
    const minAmount = Number(newRuleMinAmount);
    const maxAmount = Number(newRuleMaxAmount);
    const repeatCount = Number(newRuleRepeatCount);
    const repeatDays = Number(newRuleRepeatDays);
    const tolerance = Number(newRuleTolerance);

    if (!newRuleName.trim() || !newRuleCategory.trim()) {
      Alert.alert('Missing fields', 'Please add rule name and category.');
      return;
    }

    if (!Number.isFinite(minAmount) || !Number.isFinite(maxAmount) || minAmount < 0 || maxAmount < minAmount) {
      Alert.alert('Invalid amount range', 'Please enter a valid minimum and maximum amount.');
      return;
    }

    if (!Number.isFinite(repeatCount) || !Number.isFinite(repeatDays) || repeatCount < 0 || repeatDays < 1) {
      Alert.alert('Invalid repeat condition', 'Please enter valid repeat count and day window.');
      return;
    }

    try {
      setRulesLoading(true);
      const keywords = newRuleKeywords
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

      await createAmountCategoryRule({
        name: newRuleName.trim(),
        minAmount,
        maxAmount,
        category: newRuleCategory.trim(),
        type: 'expense',
        tags: ['auto-rule', 'amount-mapper'],
        keywordAny: keywords.length ? keywords : undefined,
        occurrence: {
          count: repeatCount,
          days: repeatDays,
          amountTolerance: Number.isFinite(tolerance) ? Math.max(0, tolerance) : 0,
        },
        priority: 80,
      });

      setNewRuleName('Daily Transport Rule');
      setNewRuleCategory('Transportation');
      setNewRuleMinAmount('20');
      setNewRuleMaxAmount('200');
      setNewRuleKeywords('auto,cab,metro,bus,rickshaw');
      setNewRuleRepeatCount('3');
      setNewRuleRepeatDays('14');
      setNewRuleTolerance('10');
      await loadRules();
      Alert.alert('Success', 'Smart amount rule created.');
    } catch (error) {
      Alert.alert('Create Failed', 'Unable to create the smart rule.');
    } finally {
      setRulesLoading(false);
    }
  };

  const applyTemplateToForm = (template: QuickRuleTemplate) => {
    setNewRuleName(template.name);
    setNewRuleCategory(template.category);
    setNewRuleMinAmount(String(template.minAmount));
    setNewRuleMaxAmount(String(template.maxAmount));
    setNewRuleKeywords(template.keywords.join(','));
    setNewRuleRepeatCount(String(template.repeatCount));
    setNewRuleRepeatDays(String(template.repeatDays));
    setNewRuleTolerance(String(template.tolerance));
  };

  const handleCreateFromTemplate = async (template: QuickRuleTemplate) => {
    try {
      setRulesLoading(true);
      await createAmountCategoryRule({
        name: template.name,
        minAmount: template.minAmount,
        maxAmount: template.maxAmount,
        category: template.category,
        type: 'expense',
        tags: ['auto-rule', 'amount-mapper', `template:${template.id}`],
        keywordAny: template.keywords,
        occurrence: {
          count: template.repeatCount,
          days: template.repeatDays,
          amountTolerance: template.tolerance,
        },
        priority: 80,
      });

      await loadRules();
      Alert.alert('Success', `${template.name} template rule added.`);
    } catch (error) {
      Alert.alert('Create Failed', 'Unable to create template rule.');
    } finally {
      setRulesLoading(false);
    }
  };

  const handleNameChange = async (newName: string) => {
    setUserName(newName);
    try {
      await saveUserPreferences({ name: newName });
    } catch (error) {
       console.error('Failed to save name', error);
    }
  };

  const handleAppNameChange = async (newAppName: string) => {
    setAppName(newAppName);
    try {
      await saveUserPreferences({ appName: newAppName });
    } catch (error) {
       console.error('Failed to save app name', error);
    }
  };

  const handleCurrencyChange = async (newCurrency: Currency) => {
    try {
      await updateCurrency(newCurrency);
      setCurrency(newCurrency);
      await refreshCurrency();
      setShowCurrencyModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update currency');
    }
  };

  const handleClearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your transactions, budgets, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const storageKeys = ['transactions', 'budgets', 'budget_alerts', 'categories', 'user_preferences'];
              await Promise.all(storageKeys.map(key => deleteKey(key)));
              await refreshCurrency();
              Alert.alert('Success', 'All data has been cleared!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            } finally {
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  const handleLoadMockData = async () => {
    Alert.alert(
      'Load Mock Data',
      'This will add sample transactions and budgets to your app. Do you want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Load', 
          onPress: async () => {
            try {
              setLoading(true);
              const result = await seedMockData();
              Alert.alert('Success', `Successfully loaded ${result.transactionsCount} transactions and ${result.budgetsCount} budgets!`);
            } catch (error) {
              Alert.alert('Error', 'Failed to load mock data');
            } finally {
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [includeTransactionsExport, setIncludeTransactionsExport] = useState(true);
  const [includeBudgetsExport, setIncludeBudgetsExport] = useState(false);
  const [includeAnalyticsExport, setIncludeAnalyticsExport] = useState(false);
  const [exportFromDate, setExportFromDate] = useState<Date | undefined>(undefined);
  const [exportToDate, setExportToDate] = useState<Date | undefined>(undefined);
  const [showExportFromPicker, setShowExportFromPicker] = useState(false);
  const [showExportToPicker, setShowExportToPicker] = useState(false);
  // Web-specific inputs
  const [showWebExportInputs, setShowWebExportInputs] = useState(false);
  const [webExportFromValue, setWebExportFromValue] = useState(''); // YYYY-MM-DD
  const [webExportToValue, setWebExportToValue] = useState('');

  const [showWebSmsInput, setShowWebSmsInput] = useState(false);
  const [webSmsHourValue, setWebSmsHourValue] = useState(String(smsAutoFetchHour));

  const handleStartExport = async () => {
    try {
      setLoading(true);

      const options: ExportOptions = {
        format: exportFormat,
        includeTransactions: includeTransactionsExport,
        includeBudgets: includeBudgetsExport,
        includeAnalytics: includeAnalyticsExport,
      };

      if (exportFromDate && exportToDate) {
        options.dateRange = { from: exportFromDate.toISOString(), to: exportToDate.toISOString() };
      }

      const validation = validateExportOptions(options);
      if (!validation.valid) {
        Alert.alert('Invalid options', validation.errors.join('\n'));
        return;
      }

      const result = await exportTransactions(options);
      if (result.success) {
        Alert.alert('Export complete', `File saved to ${result.filePath}`);
        setShowExportModal(false);
      } else {
        Alert.alert('Export failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Export error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportDatePress = async (which: 'from' | 'to') => {
    if (Platform.OS === 'web') {
      // show in-modal inputs on web
      if (which === 'from') {
        setWebExportFromValue(exportFromDate ? exportFromDate.toISOString().slice(0, 10) : '');
      } else {
        setWebExportToValue(exportToDate ? exportToDate.toISOString().slice(0, 10) : '');
      }
      setShowWebExportInputs(true);
    } else {
      if (which === 'from') setShowExportFromPicker(true);
      else setShowExportToPicker(true);
    }
  };

  const handleSmsTimePress = async () => {
    if (Platform.OS === 'web') {
      setWebSmsHourValue(String(smsAutoFetchHour));
      setShowWebSmsInput(true);
    } else {
      setShowTimePicker(true);
    }
  };

  const SettingRow = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement,
    color,
    index,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    color: string;
    index: number;
  }) => (
    <Animated.View 
      entering={FadeInUp.delay(400 + index * 50).duration(500)}
      layout={Layout.springify()}
    >
      <TouchableOpacity 
        style={[styles.settingRow, { borderBottomColor: border }]} 
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
            <Icon size={20} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Typography variant="bold" style={styles.settingTitle}>{title}</Typography>
            {subtitle && <Typography variant="small" style={{ color: mutedForeground }}>{subtitle}</Typography>}
          </View>
        </View>
        {rightElement || (onPress && <ChevronRight size={18} color={mutedForeground} />)}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={isDark ? ['#1e1b4b', '#0f172a'] : ['#f97316', '#ea580c']}
        style={styles.headerGradient}
      >
        <Typography variant="title" weight="bold" style={styles.headerTitle}>Settings</Typography>
        <Typography style={styles.headerSubtitle}>Customize your financial experience</Typography>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Typography variant="subtitle" weight="bold" style={styles.sectionHeading}>Profile & Branding</Typography>
        <Card style={styles.sectionCard} delay={0}>
            <View style={styles.profileSection}>
                <View style={[styles.iconBox, { backgroundColor: `${primary}15` }]}>
                    <User size={20} color={primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Typography variant="small" style={{ color: mutedForeground, marginBottom: 4 }}>Your Name</Typography>
                    <TextInput 
                        style={[styles.nameInput, { color: text, borderBottomColor: border }]}
                        value={userName}
                        onChangeText={handleNameChange}
                        placeholder="Enter your name"
                        placeholderTextColor={mutedForeground}
                    />
                </View>
            </View>
            <View style={[styles.profileSection, { borderTopWidth: 1, borderTopColor: border }]}>
                <View style={[styles.iconBox, { backgroundColor: `${primary}15` }]}>
                    <LayoutIcon size={20} color={primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Typography variant="small" style={{ color: mutedForeground, marginBottom: 4 }}>App Display Name</Typography>
                    <TextInput 
                        style={[styles.nameInput, { color: text, borderBottomColor: border }]}
                        value={appName}
                        onChangeText={handleAppNameChange}
                        placeholder="e.g., My Spend tracker"
                        placeholderTextColor={mutedForeground}
                    />
                </View>
            </View>
        </Card>

        <Typography variant="subtitle" weight="bold" style={styles.sectionHeading}>Preferences</Typography>
        <Card style={styles.sectionCard} delay={0}>
          <SettingRow
            index={0}
            icon={Bell}
            title="Notifications"
            subtitle="Budget alerts and reminders"
            color="#6366f1"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={async (v) => { 
                  setNotifications(v); 
                  const prefs = await getUserPreferences();
                  await saveUserPreferences({ 
                    notifications: { ...prefs.notifications, budgetAlerts: v } 
                  }); 
                }}
                trackColor={{ false: '#e2e8f0', true: primary }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingRow
            index={1}
            icon={Moon}
            title="Dark Mode"
            subtitle="Toggle visual theme"
            color="#8b5cf6"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={(v) => { setDarkMode(v); setTheme && setTheme(v ? 'dark' : 'light'); }}
                trackColor={{ false: '#e2e8f0', true: primary }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingRow
            index={2}
            icon={DollarSign}
            title="Currency"
            subtitle={`${CURRENCIES[currency].name} (${CURRENCIES[currency].symbol})`}
            color="#22c55e"
            onPress={() => setShowCurrencyModal(true)}
          />
          <SettingRow
            index={3}
            icon={Type}
            title="Font Style"
            subtitle={fontFamily === 'jetbrains' ? 'JetBrains Mono' : fontFamily === 'opensans' ? 'Open Sans' : fontFamily.charAt(0).toUpperCase() + fontFamily.slice(1)}
            color="#f59e0b"
            onPress={() => setShowFontModal(true)}
          />
          <SettingRow
            index={4}
            icon={MessageCircle}
            title="Daily SMS Auto-Fetch"
            subtitle={`Process bank alerts at ${smsAutoFetchHour}:00 ${Platform.OS !== 'android' ? '(Android Only)' : ''}`}
            color="#ec4899"
            rightElement={
              <Switch
                value={smsAutoFetch}
                onValueChange={async (v) => { 
                  setSmsAutoFetch(v); 
                  await saveUserPreferences({ smsAutoFetch: v });
                  if (v && Platform.OS === 'android') {
                    await registerSmsAutoFetch();
                  } else if (Platform.OS === 'android') {
                    await unregisterSmsAutoFetch();
                  }
                }}
                trackColor={{ false: '#e2e8f0', true: primary }}
                thumbColor="#FFFFFF"
              />
            }
          />
          {smsAutoFetch && (
            <SettingRow
              index={5}
              icon={Bell}
              title="Auto-Fetch Time"
              subtitle={`Current: ${smsAutoFetchHour}:00 ${smsAutoFetchHour >= 12 ? 'PM' : 'AM'}`}
              color="#06b6d4"
              onPress={() => handleSmsTimePress()}
              rightElement={
                <TouchableOpacity onPress={() => handleSmsTimePress()} style={[styles.linkBtn, { backgroundColor: `${primary}15` }]}>
                  <Typography variant="small" weight="bold" style={{ color: primary }}>Change</Typography>
                </TouchableOpacity>
              }
            />
          )}
          {showTimePicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={(() => {
                const d = new Date();
                d.setHours(smsAutoFetchHour, 0, 0, 0);
                return d;
              })()}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={async (event, selectedDate) => {
                setShowTimePicker(false);
                if (selectedDate) {
                  const hour = selectedDate.getHours();
                  setSmsAutoFetchHour(hour);
                  await saveUserPreferences({ smsAutoFetchHour: hour });
                  // If already registered, re-registering might be needed for some plugins, 
                  // but for our logic it just checks the hour each time.
                }
              }}
            />
          )}

          {/* Web SMS time input */}
          {showWebSmsInput && Platform.OS === 'web' && (
            <View style={{ padding: 12 }}>
              <Typography variant="small" style={{ color: mutedForeground }}>Enter hour (0-23)</Typography>
              <TextInput
                value={webSmsHourValue}
                onChangeText={setWebSmsHourValue}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderColor: border, borderRadius: 8, padding: 8, marginTop: 8, color: text }}
                placeholder="e.g., 22"
                placeholderTextColor={mutedForeground}
              />
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity onPress={() => { setShowWebSmsInput(false); }} style={[styles.closeModal, { backgroundColor: '#6b7280', flex: 1, marginRight: 8 }]}>
                  <Typography variant="bold" style={{ color: '#FFFFFF' }}>Cancel</Typography>
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                  const h = parseInt(webSmsHourValue, 10);
                  if (!isNaN(h) && h >= 0 && h <= 23) {
                    setSmsAutoFetchHour(h);
                    await saveUserPreferences({ smsAutoFetchHour: h });
                    setShowWebSmsInput(false);
                  } else {
                    Alert.alert('Invalid hour', 'Please enter a number between 0 and 23');
                  }
                }} style={[styles.closeModal, { backgroundColor: primary, flex: 1 }]}>
                  <Typography variant="bold" style={{ color: '#FFFFFF' }}>Apply</Typography>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>

        <Typography variant="subtitle" weight="bold" style={styles.sectionHeading}>Data Management</Typography>
        <Card style={styles.sectionCard} delay={0}>
          <SettingRow
            index={4}
            icon={Settings}
            title="Smart Rules"
            subtitle={`${smartRules.filter(rule => rule.isActive).length} active • amount/category mapping`}
            color="#7c3aed"
            onPress={async () => {
              setShowRulesModal(true);
              await loadRules();
            }}
          />
          <SettingRow
            index={5}
            icon={ShieldAlert}
            title="Review Suspicious"
            subtitle="Verify flagged transactions"
            color="#ef4444"
            onPress={() => {}}
            rightElement={
              <Link href="/suspicious" asChild>
                <TouchableOpacity style={styles.linkBtn}>
                  <Typography variant="small" weight="bold" style={{ color: primary }}>View</Typography>
                </TouchableOpacity>
              </Link>
            }
          />
          <SettingRow
            index={6}
            icon={Download}
            title="Export Data"
            subtitle="Export to CSV or JSON"
            color="#3b82f6"
            onPress={() => setShowExportModal(true)}
          />
          <SettingRow
            index={7}
            icon={Database}
            title="Load Mock Data"
            subtitle="Populate app with sample data"
            color="#10b981"
            onPress={handleLoadMockData}
          />
          <SettingRow
            index={8}
            icon={Trash2}
            title="Clear All Data"
            subtitle="Delete all app data"
            color="#ef4444"
            onPress={handleClearAllData}
          />
        </Card>

        <Typography variant="subtitle" weight="bold" style={styles.sectionHeading}>About</Typography>
        <Card style={styles.sectionCard} delay={0}>
          <SettingRow
            index={9}
            icon={Info}
            title="Version"
            subtitle="1.0.0 (Build 42)"
            color="#64748b"
          />
          <SettingRow
            index={10}
            icon={HelpCircle}
            title="Help & Support"
            subtitle="Contact us for assistance"
            color="#06b6d4"
            onPress={() => setShowSupportModal(true)}
          />
        </Card>

        <View style={styles.footer}>
          <Typography variant="small" style={{ color: mutedForeground }}>{appName} • Designed for Financial Freedom</Typography>
        </View>
      </ScrollView>

      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp} style={[styles.modalContent, { backgroundColor: cardColor }]}>
            <Typography variant="bold" style={styles.modalTitle}>Export Data</Typography>

            <Typography variant="small" style={{ color: mutedForeground, marginBottom: 8 }}>Select format</Typography>
            <View style={{ marginBottom: 12 }}>
              {getExportFormats().map(fmt => (
                <TouchableOpacity
                  key={fmt.value}
                  style={[styles.currencyOption, { borderColor: border }, exportFormat === fmt.value && { backgroundColor: `${primary}15`, borderColor: primary }]}
                  onPress={() => setExportFormat(fmt.value as 'csv' | 'json' | 'pdf')}
                >
                  <View style={{ flex: 1 }}>
                    <Typography variant="bold">{fmt.label}</Typography>
                    <Typography variant="small" style={{ color: mutedForeground }}>{fmt.description}</Typography>
                  </View>
                  {exportFormat === fmt.value && <Typography style={{ color: primary }}>✓</Typography>}
                </TouchableOpacity>
              ))}
            </View>

            <Typography variant="small" style={{ color: mutedForeground, marginBottom: 8 }}>Include</Typography>
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Typography variant="bold">Transactions</Typography>
                  <Typography variant="small" style={{ color: mutedForeground }}>Include transaction history</Typography>
                </View>
                <Switch value={includeTransactionsExport} onValueChange={setIncludeTransactionsExport} trackColor={{ false: '#e2e8f0', true: primary }} thumbColor="#FFFFFF" />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Typography variant="bold">Budgets</Typography>
                  <Typography variant="small" style={{ color: mutedForeground }}>Include budgets and progress</Typography>
                </View>
                <Switch value={includeBudgetsExport} onValueChange={setIncludeBudgetsExport} trackColor={{ false: '#e2e8f0', true: primary }} thumbColor="#FFFFFF" />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Typography variant="bold">Analytics</Typography>
                  <Typography variant="small" style={{ color: mutedForeground }}>Include generated analytics/report</Typography>
                </View>
                <Switch value={includeAnalyticsExport} onValueChange={setIncludeAnalyticsExport} trackColor={{ false: '#e2e8f0', true: primary }} thumbColor="#FFFFFF" />
              </View>
            </View>

            <Typography variant="small" style={{ color: mutedForeground, marginBottom: 8 }}>Date range (optional)</Typography>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity style={[styles.currencyOption, { flex: 1, borderColor: border }]} onPress={() => handleExportDatePress('from')}>
                <Typography variant="small">From</Typography>
                <Typography variant="small" style={{ color: mutedForeground }}>{exportFromDate ? exportFromDate.toLocaleDateString() : 'Any'}</Typography>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.currencyOption, { flex: 1, borderColor: border }]} onPress={() => handleExportDatePress('to')}>
                <Typography variant="small">To</Typography>
                <Typography variant="small" style={{ color: mutedForeground }}>{exportToDate ? exportToDate.toLocaleDateString() : 'Any'}</Typography>
              </TouchableOpacity>
            </View>

            {showExportFromPicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={exportFromDate ?? new Date()}
                mode="date"
                display="default"
                onChange={(ev, date) => { setShowExportFromPicker(false); if (date) setExportFromDate(date); }}
              />
            )}

            {showExportToPicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={exportToDate ?? new Date()}
                mode="date"
                display="default"
                onChange={(ev, date) => { setShowExportToPicker(false); if (date) setExportToDate(date); }}
              />
            )}

            {/* Web in-modal date inputs */}
            {showWebExportInputs && Platform.OS === 'web' && (
              <View style={{ padding: 8 }}>
                <Typography variant="small" style={{ color: mutedForeground }}>From (YYYY-MM-DD)</Typography>
                <TextInput
                  value={webExportFromValue}
                  onChangeText={setWebExportFromValue}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={mutedForeground}
                  style={{ borderWidth: 1, borderColor: border, borderRadius: 8, padding: 8, marginTop: 6, color: text }}
                />

                <Typography variant="small" style={{ color: mutedForeground, marginTop: 8 }}>To (YYYY-MM-DD)</Typography>
                <TextInput
                  value={webExportToValue}
                  onChangeText={setWebExportToValue}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={mutedForeground}
                  style={{ borderWidth: 1, borderColor: border, borderRadius: 8, padding: 8, marginTop: 6, color: text }}
                />

                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity onPress={() => { setWebExportFromValue(''); setWebExportToValue(''); setShowWebExportInputs(false); }} style={[styles.closeModal, { backgroundColor: '#6b7280', flex: 1, marginRight: 8 }]}>
                    <Typography variant="bold" style={{ color: '#FFFFFF' }}>Cancel</Typography>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    // apply values
                    try {
                      if (webExportFromValue) {
                        const d1 = new Date(webExportFromValue);
                        if (!isNaN(d1.getTime())) setExportFromDate(d1);
                        else { Alert.alert('Invalid date', 'Please enter a valid From date (YYYY-MM-DD)'); return; }
                      } else {
                        setExportFromDate(undefined);
                      }

                      if (webExportToValue) {
                        const d2 = new Date(webExportToValue);
                        if (!isNaN(d2.getTime())) setExportToDate(d2);
                        else { Alert.alert('Invalid date', 'Please enter a valid To date (YYYY-MM-DD)'); return; }
                      } else {
                        setExportToDate(undefined);
                      }

                      setShowWebExportInputs(false);
                    } catch (e) {
                      Alert.alert('Error', 'Failed to apply dates');
                    }
                  }} style={[styles.closeModal, { backgroundColor: primary, flex: 1 }]}>
                    <Typography variant="bold" style={{ color: '#FFFFFF' }}>Apply</Typography>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <TouchableOpacity style={[styles.closeModal, { backgroundColor: '#6b7280', flex: 1, marginRight: 8 }]} onPress={() => setShowExportModal(false)}>
                <Typography variant="bold" style={{ color: '#FFFFFF' }}>Cancel</Typography>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.closeModal, { backgroundColor: primary, flex: 1 }]} onPress={handleStartExport}>
                <Typography variant="bold" style={{ color: '#FFFFFF' }}>Export</Typography>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showRulesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRulesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp} style={[styles.modalContent, { backgroundColor: cardColor }]}>
            <Typography variant="bold" style={styles.modalTitle}>Smart Rules</Typography>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.rulesScroll}>
              <Typography variant="small" style={{ color: mutedForeground, marginBottom: 8 }}>
                Auto-map transactions to categories using amount range and repeat patterns.
              </Typography>

              <Typography variant="small" style={{ color: mutedForeground, marginBottom: 6 }}>
                Quick Templates
              </Typography>
              <View style={styles.templateList}>
                {QUICK_RULE_TEMPLATES.map(template => (
                  <View key={template.id} style={[styles.templateCard, { borderColor: border }]}>
                    <View style={{ flex: 1 }}>
                      <Typography variant="bold">{template.name}</Typography>
                      <Typography variant="small" style={{ color: mutedForeground }}>
                        ₹{template.minAmount} - ₹{template.maxAmount} → {template.category}
                      </Typography>
                    </View>
                    <View style={styles.templateActions}>
                      <TouchableOpacity
                        style={[styles.templateBtn, { backgroundColor: `${primary}15` }]}
                        onPress={() => applyTemplateToForm(template)}
                      >
                        <Typography variant="small" weight="bold" style={{ color: primary }}>Use</Typography>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.templateBtn, { backgroundColor: primary }]}
                        disabled={rulesLoading}
                        onPress={() => handleCreateFromTemplate(template)}
                      >
                        <Typography variant="small" weight="bold" style={{ color: '#FFFFFF' }}>Add</Typography>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              <View style={[styles.ruleBuilderCard, { borderColor: border }]}>
                <Typography variant="bold" style={{ marginBottom: 8 }}>Create Amount Rule</Typography>

                <TextInput
                  value={newRuleName}
                  onChangeText={setNewRuleName}
                  placeholder="Rule name"
                  placeholderTextColor={mutedForeground}
                  style={[styles.ruleInput, { borderColor: border, color: text }]}
                />

                <TextInput
                  value={newRuleCategory}
                  onChangeText={setNewRuleCategory}
                  placeholder="Target category"
                  placeholderTextColor={mutedForeground}
                  style={[styles.ruleInput, { borderColor: border, color: text }]}
                />

                <View style={styles.ruleRow}>
                  <TextInput
                    value={newRuleMinAmount}
                    onChangeText={setNewRuleMinAmount}
                    placeholder="Min"
                    keyboardType="numeric"
                    placeholderTextColor={mutedForeground}
                    style={[styles.ruleInput, styles.ruleInputHalf, { borderColor: border, color: text }]}
                  />
                  <TextInput
                    value={newRuleMaxAmount}
                    onChangeText={setNewRuleMaxAmount}
                    placeholder="Max"
                    keyboardType="numeric"
                    placeholderTextColor={mutedForeground}
                    style={[styles.ruleInput, styles.ruleInputHalf, { borderColor: border, color: text }]}
                  />
                </View>

                <TextInput
                  value={newRuleKeywords}
                  onChangeText={setNewRuleKeywords}
                  placeholder="Keywords (comma separated)"
                  placeholderTextColor={mutedForeground}
                  style={[styles.ruleInput, { borderColor: border, color: text }]}
                />

                <View style={styles.ruleRow}>
                  <TextInput
                    value={newRuleRepeatCount}
                    onChangeText={setNewRuleRepeatCount}
                    placeholder="Repeat count"
                    keyboardType="numeric"
                    placeholderTextColor={mutedForeground}
                    style={[styles.ruleInput, styles.ruleInputThird, { borderColor: border, color: text }]}
                  />
                  <TextInput
                    value={newRuleRepeatDays}
                    onChangeText={setNewRuleRepeatDays}
                    placeholder="In days"
                    keyboardType="numeric"
                    placeholderTextColor={mutedForeground}
                    style={[styles.ruleInput, styles.ruleInputThird, { borderColor: border, color: text }]}
                  />
                  <TextInput
                    value={newRuleTolerance}
                    onChangeText={setNewRuleTolerance}
                    placeholder="Tolerance"
                    keyboardType="numeric"
                    placeholderTextColor={mutedForeground}
                    style={[styles.ruleInput, styles.ruleInputThird, { borderColor: border, color: text }]}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.closeModal, { backgroundColor: primary, marginTop: 4 }]}
                  onPress={handleCreateAmountRule}
                  disabled={rulesLoading}
                >
                  <Typography variant="bold" style={{ color: '#FFFFFF' }}>
                    {rulesLoading ? 'Saving...' : 'Create Rule'}
                  </Typography>
                </TouchableOpacity>
              </View>

              <Typography variant="small" style={{ color: mutedForeground, marginTop: 12, marginBottom: 6 }}>
                Existing Rules
              </Typography>

              {smartRules.map(rule => (
                <View key={rule.id} style={[styles.ruleCard, { borderColor: border }]}>
                  <View style={{ flex: 1 }}>
                    <Typography variant="bold">{rule.name || 'Unnamed Rule'}</Typography>
                    <Typography variant="small" style={{ color: mutedForeground }}>
                      {rule.field === 'amount' ? `Amount ${rule.value}` : `${rule.field} ${rule.operator} ${rule.value}`} → {rule.setCategory || 'No category'}
                    </Typography>
                    <Typography variant="small" style={{ color: mutedForeground }}>
                      Priority {rule.priority || 0} • {rule.typeFilter || 'both'}
                    </Typography>
                  </View>

                  <View style={styles.ruleActions}>
                    <Switch
                      value={rule.isActive}
                      onValueChange={(value) => handleToggleRule(rule, value)}
                      trackColor={{ false: '#e2e8f0', true: primary }}
                      thumbColor="#FFFFFF"
                    />
                    <TouchableOpacity style={styles.ruleDeleteBtn} onPress={() => handleDeleteRule(rule)}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.closeModal, { backgroundColor: isDark ? '#334155' : '#1e293b' }]} onPress={() => setShowRulesModal(false)}>
              <Typography variant="bold" style={{ color: '#FFFFFF' }}>Close</Typography>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp} style={[styles.modalContent, { backgroundColor: cardColor }]}>
            <Typography variant="bold" style={styles.modalTitle}>Select Currency</Typography>
            {Object.values(CURRENCIES).map((curr) => (
              <TouchableOpacity
                key={curr.code}
                style={[
                  styles.currencyOption,
                  { borderColor: border },
                  currency === curr.code && { backgroundColor: `${primary}15`, borderColor: primary },
                ]}
                onPress={() => handleCurrencyChange(curr.code)}
              >
                <Typography variant="bold" style={styles.currencySymbol}>{curr.symbol}</Typography>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Typography variant="bold">{curr.name}</Typography>
                  <Typography variant="small" style={{ color: mutedForeground }}>{curr.code}</Typography>
                </View>
                {currency === curr.code && <Typography style={{ color: primary }}>✓</Typography>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.closeModal, { backgroundColor: isDark ? '#334155' : '#1e293b' }]} onPress={() => setShowCurrencyModal(false)}>
              <Typography variant="bold" style={{ color: '#FFFFFF' }}>Cancel</Typography>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showFontModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFontModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp} style={[styles.modalContent, { backgroundColor: cardColor }]}>
            <View style={[styles.iconBox, { backgroundColor: `#f59e0b15`, alignSelf: 'center', marginBottom: 16 }]}>
              <Type size={24} color="#f59e0b" />
            </View>
            <Typography variant="bold" style={styles.modalTitle}>Select Font Style</Typography>
            {[
              { id: 'inter', name: 'Inter', desc: 'Clean & Modern' },
              { id: 'outfit', name: 'Outfit', desc: 'Sleek & Rounded' },
              { id: 'roboto', name: 'Roboto', desc: 'Classic Sans' },
              { id: 'opensans', name: 'Open Sans', desc: 'Highly Legible' },
              { id: 'jetbrains', name: 'JetBrains Mono', desc: 'Coding Style' }
            ].map((fontVariant) => (
              <TouchableOpacity
                key={fontVariant.id}
                style={[
                  styles.currencyOption,
                  { borderColor: border },
                  fontFamily === fontVariant.id && { backgroundColor: `${primary}15`, borderColor: primary },
                ]}
                onPress={() => {
                  setFontFamily(fontVariant.id as FontFamily);
                  setShowFontModal(false);
                }}
              >
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Typography variant="bold">{fontVariant.name}</Typography>
                  <Typography variant="small" style={{ color: mutedForeground }}>{fontVariant.desc}</Typography>
                </View>
                {fontFamily === fontVariant.id && <Typography style={{ color: primary }}>✓</Typography>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.closeModal, { backgroundColor: isDark ? '#334155' : '#1e293b' }]} onPress={() => setShowFontModal(false)}>
              <Typography variant="bold" style={{ color: '#FFFFFF' }}>Cancel</Typography>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showSupportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSupportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp} style={[styles.modalContent, { backgroundColor: cardColor }]}>
            <View style={[styles.iconBox, { backgroundColor: `#06b6d415`, alignSelf: 'center', marginBottom: 16 }]}>
              <HelpCircle size={24} color="#06b6d4" />
            </View>
            <Typography variant="bold" style={styles.modalTitle}>Help & Support</Typography>
            <Typography style={{ textAlign: 'center', color: mutedForeground, marginBottom: 24 }}>
              Need help or have any feedback? Reach out to us via email:
            </Typography>
            
            <TouchableOpacity 
              style={[styles.currencyOption, { borderColor: border, backgroundColor: cardColor }]}
              onPress={() => Linking.openURL('mailto:divyanox.dev@gmail.com')}
            >
              <View style={[styles.iconBox, { backgroundColor: `${primary}15`, width: 32, height: 32, marginRight: 12 }]}>
                 <MessageCircle size={16} color={primary} />
              </View>
              <Typography variant="bold" style={{ flex: 1 }}>divyanox.dev@gmail.com</Typography>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.closeModal, { backgroundColor: isDark ? '#334155' : '#1e293b' }]} onPress={() => setShowSupportModal(false)}>
              <Typography variant="bold" style={{ color: '#FFFFFF' }}>Close</Typography>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeading: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 24,
    padding: 4,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
  },
  linkBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    paddingBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  rulesScroll: {
    maxHeight: 520,
  },
  templateList: {
    marginBottom: 8,
  },
  templateCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 10,
  },
  templateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ruleBuilderCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ruleInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: 8,
  },
  ruleInputHalf: {
    flex: 1,
  },
  ruleInputThird: {
    flex: 1,
  },
  ruleCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ruleActions: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    gap: 8,
  },
  ruleDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
  },
  currencySymbol: {
    fontSize: 20,
    width: 30,
    textAlign: 'center',
  },
  closeModal: {
    marginTop: 16,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
});

export default SettingsScreen;