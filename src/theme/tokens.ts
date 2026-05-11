export const colors = {
  primary: '#0B91C0',
  primaryDark: '#09475C',
  primaryLight: '#E0F4FC',
  bg: '#F0F9FF',
  surface: '#FFFFFF',
  border: '#D1EAF5',
  text1: '#0D1F2D',
  text2: '#3A5568',
  text3: '#8AAFC5',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  white: '#FFFFFF',
} as const;

export const fonts = {
  heading: 'SpaceGrotesk',
  body: 'Manrope',
  mono: 'IBMPlexMono',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
