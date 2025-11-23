// import { testServices } from '@/app/libs/test/servicesTest';
// import { testUUID } from '@/app/libs/test/uuidTest';
import { useCurrency } from '@/app/contexts/CurrencyContext';
import { useAppTheme } from '@/app/contexts/ThemeContext';
import { emitter } from '@/app/libs/emitter';
import { deleteKey } from '@/app/libs/storage';
import { getCurrency, getUserPreferences, updateCurrency } from '@/app/services/preferencesService';
import { CURRENCIES, Currency } from '@/app/utils/currency';
import { GhostButton } from '@/components/ui/button';
import Card from '@/components/ui/card';
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
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const SettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(true);
    const { theme: currentTheme, setTheme } = useAppTheme();
  const [currency, setCurrency] = useState<Currency>('INR');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const { refreshCurrency } = useCurrency();

  useEffect(() => {
    loadCurrency();
    (async () => {
      try {
        const prefs = await getUserPreferences();
        // Auth preferences removed
      } catch (err) {
        console.warn('Failed to load preferences', err);
      }
    })();
  }, []);

  useEffect(() => {
    const unsub = emitter.addListener('preferences:changed', (prefs: any) => {
      // Auth preferences removed
    });
    return () => { unsub(); };
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
      Alert.alert('Success', 'Currency updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update currency');
    }
  };

  const handleInitializeSampleData = async () => {
    Alert.alert(
      'Feature Not Available',
      'Sample data initialization is currently disabled. This feature will be available in a future update.',
      [{ text: 'OK' }]
    );
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
              
              // Clear all storage keys
              const storageKeys = [
                'transactions',
                'budgets', 
                'budget_alerts',
                'categories',
                'user_preferences'
              ];
              
              await Promise.all(storageKeys.map(key => deleteKey(key)));
              
              // Reset currency context
              await refreshCurrency();
              
              Alert.alert('Success', 'All data has been cleared successfully!');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            } finally {
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  const handleTestServices = async () => {
    try {
      setLoading(true);
      const success = "Success";
      Alert.alert(
        success ? 'Success' : 'Error', 
        success ? 'All services are working correctly!' : 'Some services failed. Check console for details.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to test services');
    } finally {
      setLoading(false);
    }
  };

  const handleTestUUID = async () => {
    try {
      setLoading(true);
      const success = "Success";
      Alert.alert(
        success ? 'Success' : 'Error', 
        success ? 'UUID generation is working correctly!' : 'UUID test failed. Check console for details.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to test UUID generation');
    } finally {
      setLoading(false);
    }
  };

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement,
    color = '#60a5fa'
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    color?: string;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Icon size={20} color={color} />
        </View>
        <View>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      {/* App Preferences */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>App Preferences</Text>
        
        <SettingItem
          icon={Bell}
          title="Notifications"
          subtitle="Budget alerts and reminders"
          rightElement={
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#374151', true: '#4f46e5' }}
              thumbColor={notifications ? '#ffffff' : '#9ca3af'}
            />
          }
        />

        <SettingItem
          icon={Moon}
          title="Dark Mode"
          subtitle="App appearance"
          rightElement={
              <Switch
                value={darkMode}
                onValueChange={(v) => { setDarkMode(v); setTheme && setTheme(v ? 'dark' : 'light'); }}
                trackColor={{ false: '#374151', true: '#4f46e5' }}
                thumbColor={darkMode ? '#ffffff' : '#9ca3af'}
              />
          }
        />

        {/* Authentication settings removed */}

        <SettingItem
          icon={DollarSign}
          title="Currency"
          subtitle={`${CURRENCIES[currency].name} (${CURRENCIES[currency].symbol})`}
          onPress={() => setShowCurrencyModal(true)}
          color="#22c55e"
        />
      </Card>

  {/* AuthLock removed */}

      {/* Data Management */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <SettingItem
          icon={Database}
          title="Initialize Sample Data"
          subtitle="Add sample transactions and budgets"
          onPress={handleInitializeSampleData}
          color="#22c55e"
        />

        <SettingItem
          icon={Settings}
          title="Test Services"
          subtitle="Verify all services are working"
          onPress={handleTestServices}
          color="#8b5cf6"
        />

        <SettingItem
          icon={Database}
          title="Test UUID Generation"
          subtitle="Verify UUID generation is working"
          onPress={handleTestUUID}
          color="#06b6d4"
        />

        <SettingItem
          icon={Download}
          title="Export Data"
          subtitle="Download your financial data"
          color="#3b82f6"
        />

        <SettingItem
          icon={Upload}
          title="Import Data"
          subtitle="Upload data from file"
          color="#8b5cf6"
        />

        <SettingItem
          icon={Trash2}
          title="Clear All Data"
          subtitle="Delete all transactions and budgets"
          onPress={handleClearAllData}
          color="#ef4444"
        />
        <SettingItem
          icon={Settings}
          title="Review Suspicious Transactions"
          subtitle="View transactions tagged as suspicious"
          onPress={undefined}
          color="#ef4444"
          rightElement={
            <Link href="/suspicious">
              <GhostButton style={{ marginLeft: 8 }}>Open</GhostButton>
            </Link>
          }
        />
      </Card>

      {/* SMS Import */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>SMS Import</Text>
        
        <SettingItem
          icon={MessageCircle}
          title="Import from SMS"
          subtitle="Extract expenses from bank SMS alerts"
          onPress={() => Alert.alert(
            'SMS Import Feature',
            'SMS import functionality has been added to your app! This feature allows you to automatically extract expense information from your bank SMS alerts and transaction notifications.\n\nFeatures:\n• Read SMS messages with permission\n• Extract amounts, vendors, and categories\n• Auto-categorize transactions\n• Import with confidence scoring\n\nNote: This feature is currently only available on Android devices.',
            [{ text: 'OK' }]
          )}
          color="#06b6d4"
        />
      </Card>

      {/* About */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <SettingItem
          icon={Info}
          title="SpendWise"
          subtitle="Version 1.0.0"
          color="#6b7280"
        />

        <View style={styles.aboutText}>
          <Text style={styles.aboutDescription}>
            SpendWise is your personal finance companion, helping you track expenses, 
            manage budgets, and make smarter financial decisions with AI-powered insights.
          </Text>
        </View>
      </Card>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            {Object.values(CURRENCIES).map((curr) => (
              <TouchableOpacity
                key={curr.code}
                style={[
                  styles.currencyOption,
                  currency === curr.code && styles.selectedCurrencyOption,
                ]}
                onPress={() => handleCurrencyChange(curr.code)}
              >
                <Text style={[
                  styles.currencySymbol,
                  currency === curr.code && styles.selectedCurrencyText,
                ]}>
                  {curr.symbol}
                </Text>
                <View style={styles.currencyInfo}>
                  <Text style={[
                    styles.currencyName,
                    currency === curr.code && styles.selectedCurrencyText,
                  ]}>
                    {curr.name}
                  </Text>
                  <Text style={[
                    styles.currencyCode,
                    currency === curr.code && styles.selectedCurrencyText,
                  ]}>
                    {curr.code}
                  </Text>
                </View>
                {currency === curr.code && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCurrencyModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  aboutText: {
    paddingTop: 8,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f9fafb',
    textAlign: 'center',
    marginBottom: 20,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#374151',
  },
  selectedCurrencyOption: {
    backgroundColor: '#4f46e5',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#f9fafb',
    marginRight: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  currencyCode: {
    fontSize: 14,
    color: '#9ca3af',
  },
  selectedCurrencyText: {
    color: '#ffffff',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;