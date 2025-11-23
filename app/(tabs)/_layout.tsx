import { emitter } from '@/app/libs/emitter';
import { readJson } from '@/app/libs/storage';
import { getUserPreferences, updateSidebarCollapsed } from '@/app/services/preferencesService';
import { getFilteredTransactions } from '@/app/services/transactionService';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { useAppTheme } from '@/app/contexts/ThemeContext';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const appTheme = useAppTheme();
  const theme = appTheme?.theme ?? colorScheme;
  const [suspiciousCount, setSuspiciousCount] = useState<number>(0);
  const pathname = usePathname();
  const router = useRouter();
  const bg = useThemeColor({}, 'background');
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const { width } = useWindowDimensions();
  const [isCollapsed, setIsCollapsed] = useState(width < 680);
  const [prefSet, setPrefSet] = useState<boolean>(false);
  useEffect(() => { if (!prefSet) setIsCollapsed(width < 680); }, [width, prefSet]);
  const sidebarCollapsed = isCollapsed;

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
    // read persisted sidebar preference
    (async () => {
      try {
        const prefs = await getUserPreferences();
        if (typeof prefs.sidebarCollapsed === 'boolean') {
          setIsCollapsed(!!prefs.sidebarCollapsed);
          setPrefSet(true);
        }
      } catch (err) {
        console.warn('Failed to read sidebar preference', err);
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

  // Listen for preference changes to update the collapse state
  useEffect(() => {
    const unsub = emitter.addListener('preferences:changed', (prefs: any) => {
      if (prefs && typeof prefs.sidebarCollapsed === 'boolean') setIsCollapsed(prefs.sidebarCollapsed);
    });
    return () => { unsub(); };
  }, []);
  useEffect(() => {
    const unsub = emitter.addListener('preferences:changed', (prefs: any) => {
      if (prefs && typeof prefs.sidebarCollapsed === 'boolean') setPrefSet(true);
    });
    return () => { unsub(); };
  }, []);

  const navItems = [
    { name: 'index', title: 'Dashboard', href: '/', icon: 'house.fill' },
    { name: 'transaction', title: 'Transactions', href: '/transaction', icon: 'list.bullet' },
    { name: 'budget', title: 'Budget', href: '/budget', icon: 'chart.pie.fill' },
    { name: 'insights', title: 'Insights', href: '/insights', icon: 'chart.bar.fill' },
    { name: 'suspicious', title: 'Suspicious', href: '/suspicious', icon: 'exclamationmark.triangle.fill' },
    { name: 'voice', title: 'AI Assistant', href: '/voice', icon: 'mic.fill' },
    { name: 'settings', title: 'Settings', href: '/settings', icon: 'gearshape.fill' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.sidebar, { width: sidebarCollapsed ? 64 : 84, backgroundColor: theme === 'dark' ? '#07102a' : '#ffffff' }] }>
        <TouchableOpacity onPress={() => router.push('/settings' as any)} style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: tint }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>A</Text>
          </View>
          {!sidebarCollapsed && <Text style={[styles.userName, { color: text }]}>You</Text>}
          <TouchableOpacity onPress={async () => { const nv = !isCollapsed; setIsCollapsed(nv); try { await updateSidebarCollapsed(nv); } catch (err) { console.warn('Persist sidebar collapsed failed', err); } }} style={{ marginLeft: 8 }}>
            <IconSymbol name={isCollapsed ? 'chevron.right' : 'chevron.left'} size={18} color={text} />
          </TouchableOpacity>
        </TouchableOpacity>
  {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <TouchableOpacity key={item.name} style={[styles.navItem, active ? { backgroundColor: tint } : {}]} onPress={() => router.push(item.href as any)}>
              <IconSymbol name={item.icon as any} size={20} color={active ? '#fff' : (text || '#111')} />
              {!sidebarCollapsed && <Text style={[styles.navText, active ? { color: '#fff' } : { color: text }]}>{item.title}</Text>}
              {item.name === 'suspicious' && suspiciousCount > 0 && (
                <View style={[styles.badge, active ? { backgroundColor: '#fff' } : { backgroundColor: '#ef4444' }]}>
                  <Text style={[styles.badgeText, active ? { color: '#111' } : { color: '#fff' }]}>{suspiciousCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.content}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[theme ?? 'light'].tint,
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarStyle: { display: 'none' },
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 84, borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.06)', paddingVertical: 12, paddingHorizontal: 8 },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 13, fontWeight: '700' },
  content: { flex: 1 },
  navItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, borderRadius: 12, marginVertical: 4 },
  navText: { fontSize: 12, marginTop: 4 },
  badge: { position: 'absolute', right: 8, top: 12, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
