import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

export const PrimaryButton = ({ children, onPress, style, disabled, ...rest }: TouchableOpacityProps & { children: React.ReactNode; onPress?: () => void; style?: any; disabled?: boolean; }) => {
  const tint = useThemeColor({}, 'tint');
  const primaryTextColor = useThemeColor({}, 'text');
  const disabledBg = useThemeColor({ light: '#6b7280', dark: '#475569' }, 'background');
  return (
    <TouchableOpacity
      style={[{ backgroundColor: disabled ? disabledBg : tint }, styles.primary, style]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
      {...rest}
    >
      <Text style={[styles.primaryText, { color: '#fff' }]}>{children}</Text>
    </TouchableOpacity>
  );
};

export const IconButton = ({ children, onPress, style, ...rest }: TouchableOpacityProps & { children: React.ReactNode; onPress?: () => void; style?: any }) => (
  <TouchableOpacity style={[styles.iconBtn, style]} onPress={onPress} activeOpacity={0.8} {...rest}>
    <View>{children}</View>
  </TouchableOpacity>
);

export const GhostButton = ({ children, onPress, style, color, ...rest }: TouchableOpacityProps & { children: React.ReactNode; onPress?: () => void; style?: any; color?: string }) => {
  const tint = useThemeColor({}, 'tint');
  const useColor = color || tint;
  return (
    <TouchableOpacity style={[styles.ghost, { borderColor: useColor }, style]} onPress={onPress} activeOpacity={0.8} {...rest}>
      <Text style={[styles.ghostText, { color: useColor }]}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primary: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  disabled: {
    backgroundColor: '#6b7280',
    opacity: 0.85,
  },
  iconBtn: {
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 8,
  },
  ghost: {
    borderWidth: 1,
    borderColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  ghostText: {
    fontWeight: '700',
  }
});

export default PrimaryButton;
