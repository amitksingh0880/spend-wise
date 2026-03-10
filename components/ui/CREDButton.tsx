import React from 'react';
import { Text, StyleSheet, Pressable, PressableProps, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CRED_COLORS, CRED_SHADOWS } from '../../constants/CREDTheme';

interface CREDButtonProps extends PressableProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'glass' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const CREDButton: React.FC<CREDButtonProps> = ({ 
  label, 
  variant = 'primary', 
  size = 'md',
  glow = false,
  style,
  onPress,
  ...props 
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      style={[
        styles.base,
        styles[variant],
        styles[size],
        glow && variant === 'primary' && CRED_SHADOWS.neon(CRED_COLORS.neonGreen),
        animatedStyle,
        style as any
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      {...props}
    >
      <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`]]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: CRED_COLORS.neonGreen,
  },
  secondary: {
    backgroundColor: CRED_COLORS.electricBlue,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: CRED_COLORS.edge,
  },
  sm: { paddingVertical: 8, paddingHorizontal: 16 },
  md: { paddingVertical: 14, paddingHorizontal: 24 },
  lg: { paddingVertical: 18, paddingHorizontal: 32 },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  primaryText: { color: CRED_COLORS.black },
  secondaryText: { color: CRED_COLORS.black },
  glassText: { color: '#FFFFFF' },
  outlineText: { color: CRED_COLORS.gray400 },
  smText: { fontSize: 13 },
  mdText: { fontSize: 16 },
  lgText: { fontSize: 18 },
});
