import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface CardProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
}

export const Card = ({ children, style, delay = 0 }: CardProps) => {
  const backgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');

  return (
    <Animated.View 
      entering={FadeInUp.delay(delay).duration(600).springify()}
      style={[styles.card, { backgroundColor, borderColor }, style]}
    >
      {children}
    </Animated.View>
  );
};

export const CardHeader = ({ children, style }: CardProps) => (
  <View style={[styles.header, style]}>{children}</View>
);

export const CardTitle = ({ children, style }: CardProps) => {
  return children; // Should be used with Typography
};

export const CardDescription = ({ children, style }: CardProps) => {
  return children; // Should be used with Typography variant="muted"
};

export const CardContent = ({ children, style }: CardProps) => (
  <View style={[styles.content, style]}>{children}</View>
);

export const CardFooter = ({ children, style }: CardProps) => (
  <View style={[styles.footer, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    padding: 20,
    gap: 4,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  footer: {
    padding: 20,
    paddingTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
