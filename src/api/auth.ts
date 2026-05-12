/**
 * Authentication API adapter.
 *
 * Endpoints: login, register, email availability, token refresh, me, logout, changePassword.
 * When DEMO_MODE is true every call resolves with fixture data.
 */
import { request } from './client';
import { DEMO_MODE } from '../lib/demo';
import { DEMO_AUTH, DEMO_USER } from '../constants/fixtures';
import type {
  AuthResponse,
  EmailAvailabilityResponse,
  LoginPayload,
  RegisterPayload,
} from '../types';

export type { AuthResponse, EmailAvailabilityResponse, LoginPayload, RegisterPayload };

export const authApi = {
  login: (payload: LoginPayload): Promise<AuthResponse> => {
    if (DEMO_MODE) return Promise.resolve(DEMO_AUTH);
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },

  register: (payload: RegisterPayload): Promise<AuthResponse> => {
    if (DEMO_MODE) return Promise.resolve(DEMO_AUTH);
    return request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },

  checkEmailAvailability: (email: string): Promise<EmailAvailabilityResponse> => {
    if (DEMO_MODE) return Promise.resolve({ available: true });
    return request<EmailAvailabilityResponse>('/api/auth/email-availability', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  },

  refresh: (refreshToken: string): Promise<{ access_token: string }> => {
    if (DEMO_MODE) return Promise.resolve({ access_token: 'demo-access-token' });
    return request<{ access_token: string }>('/api/auth/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
      skipAuth: true,
    });
  },

  me: (): Promise<AuthResponse['user']> => {
    if (DEMO_MODE) return Promise.resolve(DEMO_USER);
    return request<AuthResponse['user']>('/api/auth/me');
  },

  logout: (): Promise<void> => {
    if (DEMO_MODE) return Promise.resolve();
    return request<void>('/api/auth/logout', { method: 'POST' });
  },

  changePassword: (currentPassword: string, newPassword: string): Promise<void> => {
    if (DEMO_MODE) return new Promise((res) => setTimeout(() => res(), 600));
    return request<void>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },
};
