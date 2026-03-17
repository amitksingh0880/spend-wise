/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#3b82f6';
const tintColorDark = '#60a5fa';

export const Colors = {
  light: {
    background: '#FFFFFF',
    foreground: '#000000',
    card: '#f8fafc',
    cardForeground: '#0f172a',
    popover: '#FFFFFF',
    popoverForeground: '#0f172a',
    primary: '#0f172a',
    primaryForeground: '#f8fafc',
    secondary: '#f1f5f9',
    secondaryForeground: '#0f172a',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    accent: '#f1f5f9',
    accentForeground: '#0f172a',
    destructive: '#ef4444',
    destructiveForeground: '#f8fafc',
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#0f172a',
    text: '#0f172a',
    icon: '#64748b',
    tint: '#0f172a',
    tabIconDefault: '#64748b',
    tabIconSelected: '#0f172a',
  },
  dark: {
    background: '#020617',
    foreground: '#f8fafc',
    card: '#020617',
    cardForeground: '#f8fafc',
    popover: '#020617',
    popoverForeground: '#f8fafc',
    primary: '#f8fafc',
    primaryForeground: '#0f172a',
    secondary: '#1e293b',
    secondaryForeground: '#f8fafc',
    muted: '#1e293b',
    mutedForeground: '#94a3b8',
    accent: '#1e293b',
    accentForeground: '#f8fafc',
    destructive: '#7f1d1d',
    destructiveForeground: '#f8fafc',
    border: '#1e293b',
    input: '#1e293b',
    ring: '#cbd5e1',
    text: '#f8fafc',
    icon: '#94a3b8',
    tint: '#f8fafc',
    tabIconDefault: '#94a3b8',
    tabIconSelected: '#f8fafc',
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
