import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReceiptsScreen from '../../app/(tabs)/receipts';
import { receiptsApi, type ReceiptListResponse } from '../api/receipts';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
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

const EMPTY_LIST: ReceiptListResponse = {
  results: [],
  count: 0,
  total: 0,
  page: 1,
  limit: 30,
  has_next: false,
};

const MOCK_RECEIPT = {
  receipt_id: 'r-001',
  upload_status: 'completed',
  created_at: '2024-01-15T10:00:00Z',
  mime_type: 'image/jpeg',
  image_url: null,
  ocr: {
    status: 'done',
    merchant: 'Pacific Coffee',
    date: '2024-01-15',
    total: 45.5,
    confidence: 0.95,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ReceiptsScreen', () => {
  it('renders title', async () => {
    mockReceiptsApi.list.mockResolvedValue(EMPTY_LIST);
    render(<ReceiptsScreen />, { wrapper: makeWrapper() });
    expect(screen.getByText('Receipts')).toBeTruthy();
  });

  it('renders search input', async () => {
    mockReceiptsApi.list.mockResolvedValue(EMPTY_LIST);
    render(<ReceiptsScreen />, { wrapper: makeWrapper() });
    expect(screen.getByPlaceholderText('Search merchant or date…')).toBeTruthy();
  });

  it('renders receipt list when data loads', async () => {
    mockReceiptsApi.list.mockResolvedValue({
      ...EMPTY_LIST,
      results: [MOCK_RECEIPT],
      count: 1,
      total: 1,
    });

    render(<ReceiptsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Pacific Coffee')).toBeTruthy();
    });
  });

  it('shows HK$ amount for completed receipts', async () => {
    mockReceiptsApi.list.mockResolvedValue({
      ...EMPTY_LIST,
      results: [MOCK_RECEIPT],
      count: 1,
      total: 1,
    });

    render(<ReceiptsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('HK$45.50')).toBeTruthy();
    });
  });

  it('shows Processing text for pending receipts', async () => {
    const pending = {
      ...MOCK_RECEIPT,
      upload_status: 'processing',
      ocr: { ...MOCK_RECEIPT.ocr, status: 'processing' },
    };
    mockReceiptsApi.list.mockResolvedValue({
      ...EMPTY_LIST,
      results: [pending],
      count: 1,
      total: 1,
    });

    render(<ReceiptsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Processing…')).toBeTruthy();
    });
  });

  it('shows empty state when no receipts', async () => {
    mockReceiptsApi.list.mockResolvedValue(EMPTY_LIST);

    render(<ReceiptsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No receipts yet. Tap Scan to add one.')).toBeTruthy();
    });
  });

  it('shows error state on fetch failure', async () => {
    mockReceiptsApi.list.mockRejectedValue(new Error('network error'));

    render(<ReceiptsScreen />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Failed to load receipts')).toBeTruthy();
    });
  });

  it('passes search string to API when user types', async () => {
    mockReceiptsApi.list.mockResolvedValue(EMPTY_LIST);

    render(<ReceiptsScreen />, { wrapper: makeWrapper() });
    const searchInput = screen.getByPlaceholderText('Search merchant or date…');
    fireEvent.changeText(searchInput, 'coffee');

    await waitFor(() => {
      expect(mockReceiptsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'coffee', page: 1 }),
      );
    });
  });
});
