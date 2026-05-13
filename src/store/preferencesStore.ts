import { create } from 'zustand';
import { preferencesApi } from '../api/preferences';

// ISO 4217 codes surfaced in the UI — mirrors SUPPORTED_CURRENCIES in exchange_rates.py
export const CURRENCIES: { code: string; name: string }[] = [
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'TWD', name: 'Taiwan Dollar' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'BRL', name: 'Brazilian Real' },
];

interface PreferencesState {
  homeCurrency: string;
  isLoading: boolean;
  fetch: () => Promise<void>;
  setCurrency: (code: string) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  homeCurrency: 'HKD',
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true });
    try {
      const prefs = await preferencesApi.get();
      set({ homeCurrency: prefs.home_currency });
    } catch {
      // Keep default on error
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrency: async (code: string) => {
    const prefs = await preferencesApi.update(code);
    set({ homeCurrency: prefs.home_currency });
  },
}));
