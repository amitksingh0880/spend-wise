import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, StatusBar } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { emitter } from '@/libs/emitter';
import { getRecentTransactions, getTransactionSummary, Transaction } from '@/services/transactionService';

import { DashboardHeader } from '@/components/DashboardHeader';
import { BudgetHeroCard } from '@/components/BudgetHeroCard';
import { RecentTransactionsList } from '@/components/RecentTransactionsList';
import { Typography } from '@/components/ui/text';

const DashboardScreen: React.FC = () => {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const background = useThemeColor({}, 'background');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryData, recentTxs] = await Promise.all([
        getTransactionSummary(),
        getRecentTransactions(8),
      ]);
      setSummary(summaryData);
      setRecentTransactions(recentTxs);
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
    return () => { unsub(); };
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: background }]}>
        <StatusBar barStyle="dark-content" />
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
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" />
      
      <DashboardHeader userName="Amit Kumar" />
      
      <View style={styles.cardWrapper}>
        <BudgetHeroCard 
          title="Your daily budget"
          subtitle={subtitle}
          percentage={Math.max(0, 100 - percentage)} // Show remaining as positive value
          onPressAction={() => router.navigate('/budget')}
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
  }
});

export default DashboardScreen;
