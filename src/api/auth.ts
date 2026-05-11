import { request } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    email: string;
    full_name: string | null;
    is_active: boolean;
    is_verified: boolean;
  };
}

export interface EmailAvailabilityResponse {
  available: boolean;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    }),

  register: (payload: RegisterPayload) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    }),

  checkEmailAvailability: (email: string) =>
    request<EmailAvailabilityResponse>('/api/auth/email-availability', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    }),

  refresh: (refreshToken: string) =>
    request<{ access_token: string }>('/api/auth/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
      skipAuth: true,
    }),

  me: () => request<AuthResponse['user']>('/api/auth/me'),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
};
