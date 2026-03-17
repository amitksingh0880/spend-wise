import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from './ui/text';
import { CircularProgress } from './CircularProgress';
import { useThemeColor } from '@/hooks/use-theme-color';
import { PlusCircle, ArrowRight, Target } from 'lucide-react-native';

interface BudgetHeroCardProps {
  title?: string;
  subtitle?: string;
  percentage: number;
  onPressAction?: () => void;
  onAddBudget?: () => void;
}

export const BudgetHeroCard: React.FC<BudgetHeroCardProps> = ({ 
  title = "Your daily budget",
  subtitle = "is looking good!",
  percentage = 75,
  onPressAction,
  onAddBudget
}) => {
  const primary = useThemeColor({}, 'primary');
  
  return (
    <View style={[styles.card, { backgroundColor: primary }]}>
      <View style={styles.content}>
        <View style={styles.textSection}>
          <View style={styles.headerRow}>
             <Target size={20} color="rgba(255,255,255,0.8)" style={{ marginRight: 8 }} />
             <Typography variant="small" weight="bold" style={{ color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 1 }}>
               Budgeting
             </Typography>
          </View>
          <Typography variant="large" weight="bold" style={styles.title}>
            {title}
          </Typography>
          <Typography variant="large" weight="bold" style={styles.title}>
            {subtitle}
          </Typography>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={onPressAction}
              activeOpacity={0.8}
            >
              <Typography variant="small" weight="bold" style={[styles.buttonText, { color: primary }]}>
                Details
              </Typography>
              <ArrowRight size={14} color={primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#FFFFFF', marginLeft: 10 }]} 
              onPress={onAddBudget || onPressAction}
              activeOpacity={0.8}
            >
              <PlusCircle size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Typography variant="small" weight="bold" style={{ color: '#FFFFFF' }}>
                Add
              </Typography>
            </TouchableOpacity>
          </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    lineHeight: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    // Color will be injected
  },
  progressSection: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
