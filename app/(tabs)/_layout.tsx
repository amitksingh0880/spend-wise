import { emitter } from '@/app/libs/emitter';
import { readJson } from '@/app/libs/storage';
import { getFilteredTransactions } from '@/app/services/transactionService';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';

export default function TabLayout() {
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
        headerShown: false,
        // Bottom tab bar completely hidden — SidebarOverlay handles navigation
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="transaction" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen
        name="suspicious"
        options={{
          title: 'Suspicious',
          tabBarBadge: suspiciousCount > 0 ? suspiciousCount : undefined,
        }}
      />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      {/* Hidden from navigation */}
      <Tabs.Screen name="voice" options={{ href: null }} />
      <Tabs.Screen name="sms-import" options={{ href: null }} />
    </Tabs>
  );
}
