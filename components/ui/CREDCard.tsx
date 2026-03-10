import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { CRED_COLORS, CRED_SHADOWS } from '../../constants/CREDTheme';

interface CREDCardProps extends ViewProps {
  variant?: 'glass' | 'filled' | 'outline' | 'neon';
  accentColor?: string;
  glow?: boolean;
}

export const CREDCard: React.FC<CREDCardProps> = ({ 
  children, 
  variant = 'glass', 
  accentColor, 
  glow = false,
  style,
  ...props 
}) => {
  const isNeon = variant === 'neon';
  const neonColor = accentColor || CRED_COLORS.neonGreen;

  return (
    <View 
      style={[
        styles.base,
        styles[variant],
        isNeon && { borderColor: neonColor },
        glow && CRED_SHADOWS.neon(neonColor),
        style
      ]}
      {...props}
    >
      {variant === 'glass' && <View style={styles.glassHighlight} />}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    padding: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filled: {
    backgroundColor: CRED_COLORS.graphite,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: CRED_COLORS.edge,
  },
  neon: {
    backgroundColor: CRED_COLORS.onyx,
    borderWidth: 2,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: '10%',
    right: '10%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  }
});
