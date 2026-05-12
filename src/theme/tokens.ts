const DARK = {
  primary:      '#1BC5E3',
  primaryDark:  '#0891B2',
  primaryLight: '#0A2530',
  bg:           '#0D0D0D',
  surface:      '#161616',
  surfaceHigh:  '#202020',
  overlay:      'rgba(0,0,0,0.6)',
  border:       '#2A2A2A',
  divider:      '#1C1C1C',
  text1:        '#F0F0F0',
  text2:        '#8A8A8A',
  text3:        '#4A4A4A',
  success:      '#4ADE80',
  warning:      '#FBBF24',
  error:        '#F87171',
  white:        '#FFFFFF',
  black:        '#000000',
};

const LIGHT: typeof DARK = {
  primary:      '#1BC5E3',
  primaryDark:  '#0891B2',
  primaryLight: '#E0F9FC',
  bg:           '#F8FAFC',
  surface:      '#FFFFFF',
  surfaceHigh:  '#F1F5F9',
  overlay:      'rgba(0,0,0,0.4)',
  border:       '#E2E8F0',
  divider:      '#F1F5F9',
  text1:        '#0F172A',
  text2:        '#64748B',
  text3:        '#94A3B8',
  success:      '#16A34A',
  warning:      '#D97706',
  error:        '#DC2626',
  white:        '#FFFFFF',
  black:        '#000000',
};

export type Colors = typeof DARK;

export function makeColors(isDark: boolean): Colors {
  return isDark ? DARK : LIGHT;
}

/** Static dark-mode fallback — use makeColors(isDark) inside themed components. */
export const colors: Colors = DARK;

export const fonts = {
  heading: 'SpaceGrotesk',
  body:    'Manrope',
  mono:    'IBMPlexMono',
} as const;

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  '2xl': 28,
  full: 9999,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
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
