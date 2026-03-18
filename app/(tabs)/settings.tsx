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
import React, { useEffect, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

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
  const [smsAutoFetch, setSmsAutoFetch] = useState(false);
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
    } catch (error) {
      console.error('Error loading settings:', error);
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
          {Platform.OS === 'android' && (
            <SettingRow
              index={4}
              icon={MessageCircle}
              title="Daily SMS Auto-Fetch"
              subtitle="Process bank alerts at 10 PM"
              color="#ec4899"
              rightElement={
                <Switch
                  value={smsAutoFetch}
                  onValueChange={async (v) => { 
                    setSmsAutoFetch(v); 
                    await saveUserPreferences({ smsAutoFetch: v });
                    if (v) {
                      await registerSmsAutoFetch();
                    } else {
                      await unregisterSmsAutoFetch();
                    }
                  }}
                  trackColor={{ false: '#e2e8f0', true: primary }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          )}
        </Card>

        <Typography variant="subtitle" weight="bold" style={styles.sectionHeading}>Data Management</Typography>
        <Card style={styles.sectionCard} delay={0}>
          <SettingRow
            index={4}
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
            index={5}
            icon={Download}
            title="Export Data"
            subtitle="Export to CSV or JSON"
            color="#3b82f6"
            onPress={() => {}}
          />
          <SettingRow
            index={6}
            icon={Database}
            title="Load Mock Data"
            subtitle="Populate app with sample data"
            color="#10b981"
            onPress={handleLoadMockData}
          />
          <SettingRow
            index={7}
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
            index={8}
            icon={Info}
            title="Version"
            subtitle="1.0.0 (Build 42)"
            color="#64748b"
          />
          <SettingRow
            index={9}
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