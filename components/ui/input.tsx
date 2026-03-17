import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View, Text } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: any;
}

export const Input = ({ label, error, containerStyle, style, ...props }: InputProps) => {
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'mutedForeground');
  const destructive = useThemeColor({}, 'destructive');

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          { 
            backgroundColor, 
            borderColor: error ? destructive : borderColor, 
            color: textColor 
          },
          style
        ]}
        placeholderTextColor={placeholderColor}
        {...props}
      />
      {error && <Text style={[styles.error, { color: destructive }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;
