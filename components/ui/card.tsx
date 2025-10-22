import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const Card: React.FC<CardProps> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
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
