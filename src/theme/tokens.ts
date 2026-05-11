export const colors = {
  // Brand
  primary: '#1BC5E3',
  primaryDark: '#0891B2',
  primaryLight: '#0A2530',

  // Backgrounds
  bg: '#0D0D0D',
  surface: '#161616',
  surfaceHigh: '#202020',
  overlay: 'rgba(0,0,0,0.6)',

  // Borders & dividers
  border: '#2A2A2A',
  divider: '#1C1C1C',

  // Text hierarchy
  text1: '#F0F0F0',
  text2: '#8A8A8A',
  text3: '#4A4A4A',

  // Semantic
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',

  white: '#FFFFFF',
  black: '#000000',
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
  '2xl': 28,
  full: 9999,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  glow: {
    shadowColor: '#1BC5E3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
