import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

interface ThemedTextProps extends TextProps {
  variant?: 'default' | 'title' | 'subtitle' | 'caption' | 'muted' | 'error' | 'large' | 'small' | 'bold';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  style?: any;
  key?: React.Key;
}

export const Typography = ({ 
  style, 
  variant = 'default', 
  weight, 
  children,
  ...rest 
}: ThemedTextProps) => {
  const color = useThemeColor({}, variant === 'muted' ? 'mutedForeground' : variant === 'error' ? 'destructive' : 'text');
  
  const getVariantStyle = () => {
    switch (variant) {
      case 'title':
        return styles.title;
      case 'subtitle':
        return styles.subtitle;
      case 'large':
        return styles.large;
      case 'caption':
        return styles.caption;
      case 'small':
        return styles.small;
      case 'bold':
        return styles.bold;
      default:
        return styles.default;
    }
  };

  const fontWeight = weight || (variant === 'title' ? 'bold' : variant === 'subtitle' ? 'semibold' : 'normal');

  return (
    <Text 
      style={[
        { color }, 
        getVariantStyle(), 
        { fontWeight } as any,
        style
      ]} 
      {...rest} 
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 28,
  },
  large: {
    fontSize: 20,
    lineHeight: 28,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
  },
  bold: {
    fontWeight: '700',
  },
});

export default Typography;
