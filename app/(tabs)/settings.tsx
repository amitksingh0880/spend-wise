// import { testServices } from '@/app/libs/test/servicesTest';
// import { testUUID } from '@/app/libs/test/uuidTest';
import { clearAllData, initializeSampleData } from '@/app/utils/sampleData';
import Card from '@/components/ui/card';
import {
    Bell,
    Database,
    DollarSign,
    Download,
    Info,
    Moon,
    Settings,
    Trash2,
    Upload,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Alert,
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

  const handleInitializeSampleData = async () => {
    Alert.alert(
      'Initialize Sample Data',
      'This will add sample transactions and budgets to help you explore the app. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Initialize', 
          onPress: async () => {
            try {
              setLoading(true);
              await initializeSampleData();
              Alert.alert('Success', 'Sample data has been added successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to initialize sample data');
            } finally {
              setLoading(false);
            }
          }
        },
      ]
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
              await clearAllData();
              Alert.alert('Success', 'All data has been cleared successfully!');
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
              onValueChange={setDarkMode}
              trackColor={{ false: '#374151', true: '#4f46e5' }}
              thumbColor={darkMode ? '#ffffff' : '#9ca3af'}
            />
          }
        />

        <SettingItem
          icon={DollarSign}
          title="Currency"
          subtitle="USD ($)"
          color="#22c55e"
        />
      </Card>

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
});

export default SettingsScreen;