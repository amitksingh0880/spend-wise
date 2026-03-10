import { Platform } from 'react-native';

export const CRED_COLORS = {
  black: '#000000',
  onyx: '#050505',
  graphite: '#121212',
  charcoal: '#1A1A1A',
  edge: '#262626',
  neonGreen: '#00FFA3',
  electricBlue: '#00E0FF',
  vibrantPurple: '#BD00FF',
  coralRed: '#FF4D4D',
  gold: '#FFD700',
  success: '#00FFA3',
  error: '#FF4D4D',
  warning: '#FFB800',
  info: '#00E0FF',
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.15)',
};

export const CRED_THEME = {
  dark: {
    background: CRED_COLORS.black,
    card: CRED_COLORS.graphite,
    text: '#FFFFFF',
    textMuted: CRED_COLORS.gray400,
    border: CRED_COLORS.edge,
    primary: CRED_COLORS.neonGreen,
    secondary: CRED_COLORS.electricBlue,
    destructive: CRED_COLORS.coralRed,
    tint: CRED_COLORS.neonGreen,
  },
  light: {
    background: '#FFFFFF',
    card: '#F5F5F5',
    text: '#000000',
    textMuted: '#737373',
    border: '#E5E5E5',
    primary: '#000000',
    secondary: '#262626',
    destructive: '#FF4D4D',
    tint: '#000000',
  }
};

export const CRED_SHADOWS = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  neon: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  }),
};

export const CRED_FONTS = Platform.select({
  ios: {
    heading: 'AvenirNext-Bold',
    body: 'AvenirNext-Regular',
    mono: 'CourierNewPSMT',
  },
  android: {
    heading: 'Roboto',
    body: 'Roboto',
    mono: 'monospace',
  },
  default: {
    heading: 'system-ui',
    body: 'system-ui',
    mono: 'monospace',
  },
});
