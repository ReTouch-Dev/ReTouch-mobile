/**
 * Auth state — stored in Zustand.
 * Tokens are persisted to session storage; state hydrated on app launch.
 */
import { create } from 'zustand';
import { authApi, type AuthResponse } from '../api/auth';
import { ApiError, UnauthorizedError } from '../api/client';
import { deleteSessionItem, getSessionItem, setSessionItem } from '../lib/sessionStorage';

interface User {
  id: number;
  email: string;
  full_name: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

async function saveTokens(access: string, refresh: string) {
  await setSessionItem('access_token', access);
  await setSessionItem('refresh_token', refresh);
}

async function clearTokens() {
  await deleteSessionItem('access_token');
  await deleteSessionItem('refresh_token');
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const token = await getSessionItem('access_token');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        const refreshed = await get().refreshToken();
        if (refreshed) {
          try {
            const user = await authApi.me();
            set({ user, isAuthenticated: true, isLoading: false });
            return;
          } catch {}
        }
        await clearTokens();
      }
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },

  login: async (email: string, password: string) => {
    const res: AuthResponse = await authApi.login({ email, password });
    await saveTokens(res.access_token, res.refresh_token);
    set({ user: res.user, isAuthenticated: true });
  },

  register: async (email: string, password: string, fullName?: string) => {
    const availability = await authApi.checkEmailAvailability(email);
    if (!availability.available) {
      throw new ApiError(400, 'User with this email already exists');
    }

    const res: AuthResponse = await authApi.register({
      email,
      password,
      full_name: fullName,
    });
    await saveTokens(res.access_token, res.refresh_token);
    set({ user: res.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    await clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  refreshToken: async () => {
    try {
      const refresh = await getSessionItem('refresh_token');
      if (!refresh) return false;
      const res = await authApi.refresh(refresh);
      await setSessionItem('access_token', res.access_token);
      return true;
    } catch {
      return false;
    }
  },
}));
