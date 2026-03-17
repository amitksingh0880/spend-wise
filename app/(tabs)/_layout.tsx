import { emitter } from '@/app/libs/emitter';
import { readJson } from '@/app/libs/storage';
import { getFilteredTransactions } from '@/app/services/transactionService';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

import { useAppTheme } from '@/app/contexts/ThemeContext';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const appTheme = useAppTheme();
  const theme = appTheme?.theme ?? colorScheme;
  const isDark = theme === 'dark';
  const [suspiciousCount, setSuspiciousCount] = useState<number>(0);

  useEffect(() => {
    updateBadge();
    const unsub = emitter.addListener('transactions:changed', updateBadge);
    return () => { unsub(); };
  }, []);

  const updateBadge = async () => {
    try {
      const tx = await getFilteredTransactions({ tags: ['suspicious'] });
      const held = await readJson<any[]>('held_suspicious');
      setSuspiciousCount(((tx || []).length || 0) + (held?.length || 0));
    } catch (err) {
      console.warn('Failed to update badge', err);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#818cf8' : '#4f46e5',
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderTopColor: isDark ? '#1e293b' : '#f1f5f9',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 32 : 12,
          paddingTop: 12,
          position: 'absolute',
          elevation: 0,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transaction"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="list.bullet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.pie.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: 'AI Box',
          tabBarIcon: ({ color }) => (
            <View style={styles.voiceTabIcon}>
              <IconSymbol size={24} name="sparkles" color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="suspicious"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="exclamationmark.triangle.fill" color={color} />,
          tabBarBadge: suspiciousCount > 0 ? suspiciousCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#ef4444',
            fontSize: 10,
          }
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sms-import"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="sms-review"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="_hidden/voice"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="_hidden/explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  voiceTabIcon: {
    // Custom styling if needed for central tab
  }
});
