import { useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';
import { makeColors, type Colors } from '../theme/tokens';

export type { Colors };

export function useTheme() {
  const { isDark, toggle } = useThemeStore();
  const colors = useMemo(() => makeColors(isDark), [isDark]);
  return { colors, isDark, toggle };
}
