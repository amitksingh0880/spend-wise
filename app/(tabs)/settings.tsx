import { useCurrency } from '@/app/contexts/CurrencyContext';
import { useAppTheme } from '@/app/contexts/ThemeContext';
import { emitter } from '@/app/libs/emitter';
import { deleteKey } from '@/app/libs/storage';
import { getCurrency, getUserPreferences, updateCurrency } from '@/app/services/preferencesService';
import { CURRENCIES, Currency } from '@/app/utils/currency';
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
  ChevronRight,
  ShieldAlert,
  HelpCircle,
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

const SettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const { theme: currentTheme, setTheme } = useAppTheme();
  const [currency, setCurrency] = useState<Currency>('INR');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const { refreshCurrency } = useCurrency();

  const background = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const mutedForeground = useThemeColor({}, 'mutedForeground');

  useEffect(() => {
    loadCurrency();
  }, []);

  useEffect(() => {
    if (currentTheme) setDarkMode(currentTheme === 'dark');
  }, [currentTheme]);

  const loadCurrency = async () => {
    try {
      const savedCurrency = await getCurrency();
      setCurrency(savedCurrency);
    } catch (error) {
      console.error('Error loading currency:', error);
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
          <View>
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
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#334155', '#1e293b']}
        style={styles.headerGradient}
      >
        <Typography variant="title" weight="bold" style={styles.headerTitle}>Settings</Typography>
        <Typography style={styles.headerSubtitle}>Customize your financial experience</Typography>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                onValueChange={setNotifications}
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
        </Card>

        <Typography variant="subtitle" weight="bold" style={styles.sectionHeading}>Data Management</Typography>
        <Card style={styles.sectionCard} delay={0}>
          <SettingRow
            index={3}
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
            index={4}
            icon={Download}
            title="Export Data"
            subtitle="Export to CSV or JSON"
            color="#3b82f6"
            onPress={() => {}}
          />
          <SettingRow
            index={5}
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
            index={6}
            icon={Info}
            title="Version"
            subtitle="1.0.0 (Build 42)"
            color="#64748b"
          />
          <SettingRow
            index={7}
            icon={HelpCircle}
            title="Help & Support"
            subtitle="Contact us for assistance"
            color="#06b6d4"
            onPress={() => {}}
          />
        </Card>

        <View style={styles.footer}>
          <Typography variant="small" style={{ color: mutedForeground }}>SpendWise • Designed for Financial Freedom</Typography>
        </View>
      </ScrollView>

      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp} style={styles.modalContent}>
            <Typography variant="bold" style={styles.modalTitle}>Select Currency</Typography>
            {Object.values(CURRENCIES).map((curr) => (
              <TouchableOpacity
                key={curr.code}
                style={[
                  styles.currencyOption,
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
            <TouchableOpacity style={styles.closeModal} onPress={() => setShowCurrencyModal(false)}>
              <Typography variant="bold" style={{ color: '#FFFFFF' }}>Cancel</Typography>
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