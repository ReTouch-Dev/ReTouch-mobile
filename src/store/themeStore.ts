import { create } from 'zustand';
import { getSessionItem, setSessionItem } from '../lib/sessionStorage';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: true,

  toggle: () => {
    const isDark = !get().isDark;
    setSessionItem('theme_mode', isDark ? 'dark' : 'light').catch(() => {});
    set({ isDark });
  },

  hydrate: async () => {
    try {
      const saved = await getSessionItem('theme_mode');
      if (saved === 'light') set({ isDark: false });
    } catch {}
  },
}));
