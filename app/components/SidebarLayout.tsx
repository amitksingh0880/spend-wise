/**
 * SidebarLayout.tsx
 *
 * Floating sidebar overlay — renders on top of everything via absolute positioning.
 * The sidebar state is driven by SidebarContext, which any screen can access via useSidebar().
 * This component must be mounted once in the root layout (_layout.tsx).
 */
import { emitter } from '@/app/libs/emitter';
import { readJson } from '@/app/libs/storage';
import { getFilteredTransactions } from '@/app/services/transactionService';
import { useSidebar } from '@/app/contexts/SidebarContext';
import { useRouter, useSegments } from 'expo-router';
import {
  AlertTriangle,
  BarChart2,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  PieChart,
  Settings,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SIDEBAR_WIDTH = 270;

function useSuspiciousCount() {
  const [count, setCount] = useState(0);
  const refresh = async () => {
    try {
      const tx = await getFilteredTransactions({ tags: ['suspicious'] });
      const held = await readJson<any[]>('held_suspicious');
      setCount(((tx || []).length || 0) + (held?.length || 0));
    } catch (e) {}
  };
  useEffect(() => {
    refresh();
    const unsub = emitter.addListener('transactions:changed', refresh);
    return () => { unsub(); };
  }, []);
  return count;
}

export default function SidebarOverlay() {
  const { isOpen, closeDrawer, translateX, backdropOpacity } = useSidebar();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const suspiciousCount = useSuspiciousCount();

  const activeRoute = String(segments[segments.length - 1] ?? '');

  const navigate = (route: string) => {
    closeDrawer();
    setTimeout(() => router.push(route as any), 20);
  };

  const NAV_ITEMS = [
    { label: 'Dashboard', route: '/', routeKey: 'index', icon: <LayoutDashboard size={20} color="#60a5fa" /> },
    { label: 'Transactions', route: '/transaction', routeKey: 'transaction', icon: <CreditCard size={20} color="#a78bfa" /> },
    { label: 'Budget', route: '/budget', routeKey: 'budget', icon: <PieChart size={20} color="#34d399" /> },
    { label: 'Insights', route: '/insights', routeKey: 'insights', icon: <BarChart2 size={20} color="#fbbf24" /> },
    {
      label: 'Suspicious',
      route: '/suspicious',
      routeKey: 'suspicious',
      icon: <AlertTriangle size={20} color="#f97316" />,
      badge: suspiciousCount > 0 ? suspiciousCount : undefined,
    },
    { label: 'SMS Import', route: '/sms-import', routeKey: 'sms-import', icon: <MessageCircle size={20} color="#22d3ee" /> },
    { label: 'Settings', route: '/settings', routeKey: 'settings', icon: <Settings size={20} color="#94a3b8" /> },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[s.drawer, { transform: [{ translateX }], paddingTop: insets.top + 8 }]}
      >
        {/* Header */}
        <View style={s.drawerHeader}>
          <View style={s.logoBadge}>
            <Text style={s.logoText}>SW</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.brandName}>SpendWise</Text>
            <Text style={s.brandSub}>Personal Finance</Text>
          </View>
          <TouchableOpacity onPress={closeDrawer} hitSlop={12} style={s.closeBtn}>
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={s.divider} />

        {/* Nav items */}
        <View style={s.navList}>
          {NAV_ITEMS.map((item) => {
            const routeStr = String(activeRoute);
            const isActive =
              routeStr === item.routeKey ||
              (item.routeKey === 'index' && (routeStr === '' || routeStr === '(tabs)'));
            return (
              <TouchableOpacity
                key={item.routeKey}
                onPress={() => navigate(item.route)}
                style={[s.navItem, isActive && s.navItemActive]}
                activeOpacity={0.7}
              >
                <View style={[s.navIcon, isActive && s.navIconActive]}>
                  {item.icon}
                </View>
                <Text style={[s.navLabel, isActive && s.navLabelActive]}>{item.label}</Text>
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={s.badge}><Text style={s.badgeText}>{item.badge}</Text></View>
                )}
                {!isActive && <ChevronRight size={14} color="#475569" style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={[s.footer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.divider} />
          <Text style={s.footerText}>SpendWise v1.0.0</Text>
        </View>
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 100,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#0c1525',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    zIndex: 101,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 6, height: 0 },
    elevation: 25,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  brandName: { color: '#f9fafb', fontWeight: '700', fontSize: 16 },
  brandSub: { color: '#64748b', fontSize: 12, marginTop: 1 },
  closeBtn: { padding: 6 },
  divider: { height: 1, backgroundColor: '#1e293b', marginHorizontal: 16, marginVertical: 8 },
  navList: { flex: 1, paddingHorizontal: 12, paddingTop: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  navItemActive: { backgroundColor: '#1e3a5f' },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navIconActive: { backgroundColor: '#1d3a6e' },
  navLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#94a3b8' },
  navLabelActive: { color: '#f9fafb', fontWeight: '700' },
  badge: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginRight: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  footer: { paddingHorizontal: 16 },
  footerText: { color: '#334155', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
