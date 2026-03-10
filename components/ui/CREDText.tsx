import React from 'react';
import { Text, TextProps, StyleSheet, Platform } from 'react-native';
import { CRED_COLORS } from '../../constants/CREDTheme';

interface CREDTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'code';
  weight?: 'regular' | 'medium' | 'bold' | 'black';
  color?: keyof typeof CRED_COLORS | string;
  glow?: boolean;
}

export const CREDText: React.FC<CREDTextProps> = ({ 
  children, 
  variant = 'body', 
  weight = 'regular',
  color,
  glow = false,
  style,
  ...props 
}) => {
  const textColor = color ? (CRED_COLORS[color as keyof typeof CRED_COLORS] || color) : CRED_COLORS.gray100;

  return (
    <Text 
      style={[
        styles.base,
        styles[variant],
        styles[weight],
        { color: textColor },
        glow && { 
          textShadowColor: textColor, 
          textShadowOffset: { width: 0, height: 0 }, 
          textShadowRadius: 8 
        },
        style
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    color: '#FFFFFF',
  },
  h1: { fontSize: 32, lineHeight: 40 },
  h2: { fontSize: 24, lineHeight: 32 },
  h3: { fontSize: 18, lineHeight: 28 },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 12, lineHeight: 18 },
  code: { fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  bold: { fontWeight: '700' },
  black: { fontWeight: '900' },
});
