import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppTheme } from '@/contexts/ThemeContext';
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
  const { fontFamily: activeFontFamily } = useAppTheme();
  
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

  const getFontFamily = () => {
    switch(activeFontFamily) {
      case 'inter':
        switch (fontWeight) {
          case 'bold': return 'Inter_700Bold';
          case 'semibold': return 'Inter_600SemiBold';
          case 'medium': return 'Inter_500Medium';
          default: return 'Inter_400Regular';
        }
      case 'outfit':
        switch (fontWeight) {
          case 'bold': return 'Outfit_700Bold';
          case 'semibold': return 'Outfit_600SemiBold';
          case 'medium': return 'Outfit_500Medium';
          default: return 'Outfit_400Regular';
        }
      case 'roboto':
        switch (fontWeight) {
          case 'bold': return 'Roboto_700Bold';
          case 'semibold': return 'Roboto_500Medium';
          case 'medium': return 'Roboto_500Medium';
          default: return 'Roboto_400Regular';
        }
      case 'opensans':
        switch (fontWeight) {
          case 'bold': return 'OpenSans_700Bold';
          case 'semibold': return 'OpenSans_600SemiBold';
          case 'medium': return 'OpenSans_500Medium';
          default: return 'OpenSans_400Regular';
        }
      case 'jetbrains':
      default:
        switch (fontWeight) {
          case 'bold':
            return 'JetBrainsMono_700Bold';
          case 'semibold':
            return 'JetBrainsMono_600SemiBold';
          case 'medium':
            return 'JetBrainsMono_500Medium';
          case 'normal':
          default:
            return 'JetBrainsMono_400Regular';
        }
    }
  };

  return (
    <Text 
      style={[
        { color, fontFamily: getFontFamily() }, 
        getVariantStyle(), 
        // Removed { fontWeight } as the custom font family handles the weight natively
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
