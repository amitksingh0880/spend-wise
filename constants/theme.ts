/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#F97316'; // Premium Orange
const tintColorDark = '#FB923C'; // Slightly lighter orange for dark mode

export const Colors = {
  light: {
    background: '#FFFFFF',
    foreground: '#0f172a',
    card: '#f4f4f5', // Very light gray for cards
    cardForeground: '#0f172a',
    popover: '#FFFFFF',
    popoverForeground: '#0f172a',
    primary: '#F97316', // Orange
    primaryForeground: '#FFFFFF',
    secondary: '#fff7ed', // Very light orange tint for secondary
    secondaryForeground: '#ea580c', // Darker orange
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    accent: '#fff7ed',
    accentForeground: '#F97316',
    destructive: '#ef4444',
    destructiveForeground: '#FFFFFF',
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#F97316',
    text: '#0f172a',
    icon: '#64748b',
    tint: tintColorLight,
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
  },
  dark: {
    background: '#1a1f28', // Brighter slate base
    foreground: '#fafafa',
    card: '#252c38', // Brighter elevated card surface
    cardForeground: '#fafafa',
    popover: '#212835',
    popoverForeground: '#fafafa',
    primary: '#F97316', // Orange
    primaryForeground: '#FFFFFF',
    secondary: '#2d3442',
    secondaryForeground: '#fafafa',
    muted: '#323b4b',
    mutedForeground: '#c4cbda',
    accent: '#33221a', // Subtle warm dark tint
    accentForeground: '#FB923C',
    destructive: '#8b2a2a',
    destructiveForeground: '#fafafa',
    border: '#3d4657',
    input: '#3d4657',
    ring: '#F97316',
    text: '#fafafa',
    icon: '#c4cbda',
    tint: tintColorDark,
    tabIconDefault: '#96a1b7',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
