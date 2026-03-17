import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = ({
  children,
  variant = 'default',
  size = 'default',
  onPress,
  disabled,
  loading,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  ...rest
}: ButtonProps) => {
  const primary = useThemeColor({}, 'primary');
  const primaryForeground = useThemeColor({}, 'primaryForeground');
  const secondary = useThemeColor({}, 'secondary');
  const secondaryForeground = useThemeColor({}, 'secondaryForeground');
  const destructive = useThemeColor({}, 'destructive');
  const destructiveForeground = useThemeColor({}, 'destructiveForeground');
  const border = useThemeColor({}, 'border');

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.96);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return { 
          button: { backgroundColor: destructive }, 
          text: { color: destructiveForeground } 
        };
      case 'outline':
        return { 
          button: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: border }, 
          text: { color: primary } 
        };
      case 'secondary':
        return { 
          button: { backgroundColor: secondary }, 
          text: { color: secondaryForeground } 
        };
      case 'ghost':
        return { 
          button: { backgroundColor: 'transparent' }, 
          text: { color: primary } 
        };
      case 'link':
        return { 
          button: { backgroundColor: 'transparent', paddingHorizontal: 0 }, 
          text: { color: primary, textDecorationLine: 'underline' as const } 
        };
      default:
        return { 
          button: { backgroundColor: primary }, 
          text: { color: primaryForeground } 
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { height: 36, paddingHorizontal: 12, borderRadius: 12 };
      case 'lg':
        return { height: 56, paddingHorizontal: 32, borderRadius: 16 };
      case 'icon':
        return { height: 44, width: 44, paddingHorizontal: 0, borderRadius: 12 };
      default:
        return { height: 48, paddingHorizontal: 20, borderRadius: 14 };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        sizeStyles as any,
        variantStyles.button,
        animatedStyle,
        disabled && { opacity: 0.5 },
        style
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variantStyles.text.color} size="small" />
        ) : (
          <>
            {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
            {children && (
              <Text style={[styles.text, variantStyles.text, textStyle]}>
                {children}
              </Text>
            )}
            {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
          </>
        )}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export const IconButton = ({
  children,
  onPress,
  style,
  ...props
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable 
      onPress={onPress} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          padding: 8,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
        }, 
        animatedStyle,
        style
      ]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
};

export default Button;
