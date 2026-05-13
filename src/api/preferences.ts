import { request } from './client';

export interface Preferences {
  home_currency: string;
}

export const preferencesApi = {
  get: (): Promise<Preferences> =>
    request<Preferences>('/api/auth/preferences'),

  update: (home_currency: string): Promise<Preferences> =>
    request<Preferences>('/api/auth/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ home_currency }),
    }),
};
