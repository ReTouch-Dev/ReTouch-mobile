import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnalyticsScreen from '../../app/(tabs)/analytics';
import { analyticsApi } from '../api/analytics';

jest.mock('../api/analytics');
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockAnalyticsApi = analyticsApi as jest.Mocked<typeof analyticsApi>;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const MOCK_SUMMARY = {
  user_id: 1,
  total_spent: 1250.75,
  total_receipts: 14,
  average_transaction: 89.34,
  first_receipt_date: '2024-01-01',
  last_receipt_date: '2024-01-31',
  generated_at: '2024-01-31T12:00:00Z',
};

const MOCK_MERCHANTS = {
  user_id: 1,
  count: 2,
  merchants: [
    { merchant: 'Pacific Coffee', total_spent: 450.0, visits: 5, average_transaction: 90.0 },
    { merchant: 'ParknShop', total_spent: 320.5, visits: 3, average_transaction: 106.83 },
  ],
};

const MOCK_CATEGORIES = {
  user_id: 1,
  count: 2,
  categories: [
    { category: 'Food & Drink', total_spent: 600.0, percentage: 48, receipt_count: 8, top_merchants: [] },
    { category: 'Groceries', total_spent: 400.0, percentage: 32, receipt_count: 4, top_merchants: [] },
  ],
};

const MOCK_INSIGHTS = {
  user_id: 1,
  model: 'claude-3-haiku',
  tokens_used: 200,
  pending: false,
  fallback_reason: null,
  generated_at: '2024-01-31T12:00:00Z',
  insights: [
    { headline: 'Top merchant', detail: 'You spend most at Pacific Coffee' },
  ],
};

const MOCK_TRENDS = {
  user_id: 1,
  interval: 'daily',
  trends: [{ period: '2024-01-01', total_spent: 100, receipt_count: 1, average_transaction: 100 }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAnalyticsApi.summary.mockResolvedValue(MOCK_SUMMARY);
  mockAnalyticsApi.topMerchants.mockResolvedValue(MOCK_MERCHANTS);
  mockAnalyticsApi.categoryBreakdown.mockResolvedValue(MOCK_CATEGORIES);
  mockAnalyticsApi.insights.mockResolvedValue(MOCK_INSIGHTS);
  mockAnalyticsApi.trendsForDays.mockResolvedValue(MOCK_TRENDS);
});

describe('AnalyticsScreen', () => {
  it('renders title and range selector buttons', () => {
    render(<AnalyticsScreen />, { wrapper: makeWrapper() });
    expect(screen.getByText('Analytics')).toBeTruthy();
    expect(screen.getByText('7d')).toBeTruthy();
    expect(screen.getByText('30d')).toBeTruthy();
    expect(screen.getByText('90d')).toBeTruthy();
  });

  it('renders summary labels after data loads', async () => {
    render(<AnalyticsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Total spent')).toBeTruthy();
      expect(screen.getByText('Transactions')).toBeTruthy();
      expect(screen.getByText('Avg. per receipt')).toBeTruthy();
    });
  });

  it('shows total spent amount in HK$ format', async () => {
    render(<AnalyticsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => {
      // Amount appears on both the Overview hero card and the Breakdown donut center
      expect(screen.getAllByText('HK$1,250.75').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows transaction count', async () => {
    render(<AnalyticsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('14')).toBeTruthy();
    });
  });

  it('shows top merchant name', async () => {
    render(<AnalyticsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Pacific Coffee')).toBeTruthy();
    });
  });

  it('shows category names in breakdown section', async () => {
    render(<AnalyticsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Food & Drink')).toBeTruthy();
      expect(screen.getByText('Groceries')).toBeTruthy();
    });
  });

  it('shows AI insight headline and detail', async () => {
    render(<AnalyticsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Top merchant')).toBeTruthy();
      expect(screen.getByText('You spend most at Pacific Coffee')).toBeTruthy();
    });
  });

  it('queries with 7 days when 7d button is pressed', async () => {
    render(<AnalyticsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText('Total spent'));
    fireEvent.press(screen.getByText('7d'));
    await waitFor(() => {
      expect(mockAnalyticsApi.summary).toHaveBeenCalledWith(7);
    });
  });

  it('queries with 90 days when 90d button is pressed', async () => {
    render(<AnalyticsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getByText('Total spent'));
    fireEvent.press(screen.getByText('90d'));
    await waitFor(() => {
      expect(mockAnalyticsApi.summary).toHaveBeenCalledWith(90);
    });
  });
});
