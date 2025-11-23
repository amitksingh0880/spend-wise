import { emitter } from '@/app/libs/emitter';
import { readJson } from '@/app/libs/storage';
import { getFilteredTransactions } from '@/app/services/transactionService';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { useAppTheme } from '@/app/contexts/ThemeContext';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
// no direct RN styles required in this layout

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const appTheme = useAppTheme();
  const theme = appTheme?.theme ?? colorScheme;
  const [suspiciousCount, setSuspiciousCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tx = await getFilteredTransactions({ tags: ['suspicious'] });
        const held = await readJson<any[]>('held_suspicious');
        if (mounted) setSuspiciousCount(((tx || []).length || 0) + (held?.length || 0));
      } catch (err) {
        console.warn('Failed to update suspicious badge', err);
      }
    })();
    // not using sidebar; read held suspicious list only
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const unsub = emitter.addListener('transactions:changed', async () => {
      try {
        const tx = await getFilteredTransactions({ tags: ['suspicious'] });
        const held = await readJson<any[]>('held_suspicious');
        setSuspiciousCount(((tx || []).length || 0) + (held?.length || 0));
      } catch (err) {
        console.warn('Failed to refresh suspicious badge', err);
      }
    });
    return () => { unsub(); };
  }, []);

  return (
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[theme ?? 'light'].tint,
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarStyle: {
              backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
              borderTopColor: theme === 'dark' ? '#1e293b' : '#e5e7eb',
            },
          }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transaction"
        options={{
          title: 'Transactions',
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
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="suspicious"
        options={{
          title: 'Suspicious',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="exclamationmark.triangle.fill" color={color} />,
          tabBarBadge: suspiciousCount > 0 ? suspiciousCount : undefined,
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: 'AI Assistant',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="mic.fill" color={color} />,
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
          href: null, // Hide from tab bar but keep accessible
          title: 'SMS Import',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide from tab bar but keep accessible
        }}
      />
        </Tabs>
  );
}

// no styles required for this layout
