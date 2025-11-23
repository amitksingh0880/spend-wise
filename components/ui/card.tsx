import ThemeContext from '@/app/contexts/ThemeContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useContext } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const Card: React.FC<CardProps> = ({ children, style }) => {
  const ctx = useContext(ThemeContext);
  const theme = ctx?.theme ?? 'light';
  const background = useThemeColor({}, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#334155' }, 'background');
  const computedStyle = [styles.card, { backgroundColor: background, borderColor }, style];
  return <View style={computedStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
});

export default Card;
