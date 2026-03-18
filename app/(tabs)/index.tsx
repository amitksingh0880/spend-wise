import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, StatusBar } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { emitter } from '@/libs/emitter';
import { getRecentTransactions, getTransactionSummary, Transaction } from '@/services/transactionService';
import { getUserPreferences } from '@/services/preferencesService';
import { useAppTheme } from '@/contexts/ThemeContext';

import { DashboardHeader } from '@/components/DashboardHeader';
import { BudgetHeroCard } from '@/components/BudgetHeroCard';
import { RecentTransactionsList } from '@/components/RecentTransactionsList';
import { Typography } from '@/components/ui/text';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';

const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const [summary, setSummary] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [userName, setUserName] = useState('User');
  
  const { theme } = useAppTheme();
  const isDark = theme === 'dark';

  const background = useThemeColor({}, 'background');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryData, recentTxs, prefs] = await Promise.all([
        getTransactionSummary(),
        getRecentTransactions(8),
        getUserPreferences()
      ]);
      setSummary(summaryData);
      setRecentTransactions(recentTxs);
      if (prefs.name) {
        setUserName(prefs.name);
      } else {
        setUserName('User');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, []);
  useFocusEffect(useCallback(() => { loadDashboardData(); }, []));
  useEffect(() => {
    const unsub = emitter.addListener('transactions:changed', loadDashboardData);
    const unsubPrefs = emitter.addListener('preferences:changed', loadDashboardData);
    return () => { 
      unsub(); 
      unsubPrefs();
    };
  }, []);

  const handleScroll = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const velocity = event.nativeEvent.velocity?.y ?? 0;
    
    if (currentY <= 0) {
      emitter.emit('tab-bar:show');
    } else if (velocity > 0.5 && currentY > lastScrollY + 10) {
      emitter.emit('tab-bar:hide');
    } else if (velocity < -0.5 || currentY < lastScrollY - 20) {
      emitter.emit('tab-bar:show');
    }
    
    setLastScrollY(currentY);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Typography variant="muted">Refreshing your finances...</Typography>
      </View>
    );
  }

  // Calculate generic percentage for the hero card mapping
  const percentage = summary?.totalIncome > 0 
    ? Math.min(100, (summary.totalExpenses / summary.totalIncome) * 100) 
    : 0;
    
  // Subtitle logic
  const subtitle = percentage > 90 ? "is almost depleted!" : "is looking good!";

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: background }]}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <DashboardHeader userName={userName} />
      
      <View style={styles.summaryCardsRow}>
        <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9' }]}>
           <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
               <ArrowDownLeft size={20} color="#22c55e" />
           </View>
           <View>
              <Typography variant="small" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Total Income</Typography>
              <Typography variant="bold" style={styles.summaryValue}>{formatAmount(summary?.totalIncome || 0)}</Typography>
           </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9' }]}>
           <View style={[styles.iconBox, { backgroundColor: '#fef2f2' }]}>
               <ArrowUpRight size={20} color="#ef4444" />
           </View>
           <View>
              <Typography variant="small" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Total Spent</Typography>
              <Typography variant="bold" style={styles.summaryValue}>{formatAmount(summary?.totalExpenses || 0)}</Typography>
           </View>
        </View>
      </View>

      <View style={styles.cardWrapper}>
        <BudgetHeroCard 
          title="Your daily budget"
          subtitle={subtitle}
          percentage={Math.max(0, 100 - percentage)} // Show remaining as positive value
          onPressAction={() => router.navigate('/budget')}
          onAddBudget={() => router.navigate('/budget')}
        />
      </View>

      <RecentTransactionsList 
        transactions={recentTransactions} 
        onSeeAll={() => router.navigate('/transaction')} 
      />

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 24,
  },
  summaryCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 10,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryValue: {
    fontSize: 16,
    marginTop: 2,
  }
});

export default DashboardScreen;
