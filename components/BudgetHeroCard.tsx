import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from './ui/text';
import { CircularProgress } from './CircularProgress';
import { useThemeColor } from '@/hooks/use-theme-color';

interface BudgetHeroCardProps {
  title?: string;
  subtitle?: string;
  percentage: number;
  onPressAction?: () => void;
}

export const BudgetHeroCard: React.FC<BudgetHeroCardProps> = ({ 
  title = "Your daily budget",
  subtitle = "is looking good!",
  percentage = 75,
  onPressAction
}) => {
  const primary = useThemeColor({}, 'primary'); // Should be the #F97316 orange
  
  return (
    <View style={[styles.card, { backgroundColor: primary }]}>
      <View style={styles.content}>
        <View style={styles.textSection}>
          <Typography variant="large" weight="bold" style={styles.title}>
            {title}
          </Typography>
          <Typography variant="large" weight="bold" style={styles.title}>
            {subtitle}
          </Typography>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={onPressAction}
            activeOpacity={0.8}
          >
            <Typography variant="small" weight="bold" style={[styles.buttonText, { color: primary }]}>
              View Activity
            </Typography>
          </TouchableOpacity>
        </View>
        
        <View style={styles.progressSection}>
          <CircularProgress percentage={percentage} radius={45} strokeWidth={8} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    borderRadius: 32,
    padding: 24,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textSection: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    color: '#FFFFFF',
    lineHeight: 28,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 20,
  },
  buttonText: {
    // Color will be injected
  },
  progressSection: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
