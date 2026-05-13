import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReceiptDetailScreen from '../../app/receipt/[id]';
import { receiptsApi } from '../api/receipts';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'r-001' }),
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-image', () => ({
  Image: () => null,
}));
jest.mock('../api/receipts');

const mockReceiptsApi = receiptsApi as jest.Mocked<typeof receiptsApi>;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const MOCK_DETAIL = {
  receipt_id: 'r-001',
  created_at: '2024-01-15T10:00:00Z',
  mime_type: 'image/jpeg',
  upload_status: 'completed',
  image_url: null,
  ocr_status: 'completed',
  merchant_name: 'SpiceStore',
  merchant_address: 'Sha Tin, New Territories, HK',
  merchant_phone: null,
  transaction_date: '2024-01-15',
  transaction_time: '14:30:00',
  subtotal: 140.0,
  tax: 0,
  total: 153.0,
  payment_method: 'Cash',
  category: 'Groceries',
  ocr_confidence: 0.94,
  line_items: [
    { line_number: 1, item_name: 'Chicken Boneless Breast', quantity: 1, unit_price: 65, total_price: 65 },
    { line_number: 2, item_name: 'Haldiram Moong Dal', quantity: 1, unit_price: 12, total_price: 12 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ReceiptDetailScreen', () => {
  it('shows loading indicator while fetching', () => {
    mockReceiptsApi.detail.mockReturnValue(new Promise(() => {}));
    render(<ReceiptDetailScreen />, { wrapper: makeWrapper() });
    expect(screen.queryByText('SpiceStore')).toBeNull();
  });

  it('renders merchant name and total after data loads', async () => {
    mockReceiptsApi.detail.mockResolvedValue(MOCK_DETAIL);
    render(<ReceiptDetailScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('SpiceStore')).toBeTruthy();
    });
    // HK$153.00 appears in both the merchant card and the details row
    expect(screen.getAllByText('HK$153.00').length).toBeGreaterThanOrEqual(1);
  });

  it('renders merchant address', async () => {
    mockReceiptsApi.detail.mockResolvedValue(MOCK_DETAIL);
    render(<ReceiptDetailScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Sha Tin, New Territories, HK')).toBeTruthy();
    });
  });

  it('renders line items', async () => {
    mockReceiptsApi.detail.mockResolvedValue(MOCK_DETAIL);
    render(<ReceiptDetailScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Chicken Boneless Breast')).toBeTruthy();
      expect(screen.getByText('Haldiram Moong Dal')).toBeTruthy();
    });
  });

  it('shows OCR confidence', async () => {
    mockReceiptsApi.detail.mockResolvedValue(MOCK_DETAIL);
    render(<ReceiptDetailScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('OCR confidence: 94%')).toBeTruthy();
    });
  });

  it('shows processing banner when OCR is still running', async () => {
    const pending = { ...MOCK_DETAIL, ocr_status: 'processing', merchant_name: null, total: null };
    mockReceiptsApi.detail.mockResolvedValue(pending);
    render(<ReceiptDetailScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Extracting receipt data/)).toBeTruthy();
    });
  });

  it('shows error state and Retry button on fetch failure', async () => {
    mockReceiptsApi.detail.mockRejectedValue(new Error('network error'));
    render(<ReceiptDetailScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Failed to load receipt')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });
  });

  it('retries fetch when Retry is pressed', async () => {
    mockReceiptsApi.detail
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(MOCK_DETAIL);

    render(<ReceiptDetailScreen />, { wrapper: makeWrapper() });

    await waitFor(() => screen.getByText('Retry'));
    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => {
      expect(mockReceiptsApi.detail).toHaveBeenCalledTimes(2);
    });
  });

  it('renders payment method in details section', async () => {
    mockReceiptsApi.detail.mockResolvedValue(MOCK_DETAIL);
    render(<ReceiptDetailScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Cash')).toBeTruthy();
    });
  });

  it('renders category in details section', async () => {
    mockReceiptsApi.detail.mockResolvedValue(MOCK_DETAIL);
    render(<ReceiptDetailScreen />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeTruthy();
    });
  });
});
