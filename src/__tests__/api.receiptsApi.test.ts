/**
 * Unit tests for receiptsApi — list, detail, upload in both modes.
 */
import { receiptsApi } from '../api/receipts';
import * as client from '../api/client';
import * as demo from '../lib/demo';

jest.mock('../api/client');
jest.mock('../store/demoReceiptsStore', () => ({
  useDemoReceiptsStore: {
    getState: () => ({
      receipts: [],
      add: jest.fn(),
      getById: jest.fn().mockReturnValue(undefined),
    }),
  },
}));

const mockRequest = client.request as jest.MockedFunction<typeof client.request>;

function setDemoMode(val: boolean) {
  Object.defineProperty(demo, 'DEMO_MODE', { value: val, configurable: true });
}

const MOCK_LIST = {
  results: [
    {
      receipt_id: 'r-1',
      created_at: '2024-01-01T00:00:00Z',
      mime_type: 'image/jpeg',
      upload_status: 'completed',
      ocr: { merchant: 'Starbucks', total: 45.0, date: '2024-01-01', status: 'completed' },
    },
  ],
  total: 1,
  page: 1,
  limit: 30,
  has_next: false,
};

const MOCK_DETAIL = {
  receipt_id: 'r-1',
  created_at: '2024-01-01T00:00:00Z',
  mime_type: 'image/jpeg',
  upload_status: 'completed',
  image_url: 'https://example.com/receipt.jpg',
  ocr_status: 'completed',
  merchant_name: 'Starbucks',
  merchant_address: null,
  merchant_phone: null,
  transaction_date: '2024-01-01',
  transaction_time: '09:30:00',
  subtotal: 40.0,
  tax: 5.0,
  total: 45.0,
  payment_method: 'Visa',
  category: 'Food & Drink',
  ocr_confidence: 0.95,
  line_items: [],
};

const MOCK_UPLOAD = {
  receipt_id: 'r-new',
  upload_status: 'processing',
  created_at: '2024-01-02T00:00:00Z',
  mime_type: 'image/jpeg',
  image_url: null,
};

// ── demo mode ────────────────────────────────────────────────────────────────

describe('receiptsApi — demo mode', () => {
  beforeEach(() => { setDemoMode(true); jest.clearAllMocks(); });

  it('list resolves with fixture data', async () => {
    const res = await receiptsApi.list();
    expect(res).toHaveProperty('results');
    expect(Array.isArray(res.results)).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('list respects search param without hitting network', async () => {
    const res = await receiptsApi.list({ search: 'coffee' });
    expect(res).toHaveProperty('results');
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('detail rejects for unknown id', async () => {
    await expect(receiptsApi.detail('nonexistent-id')).rejects.toThrow();
  });

  it('upload resolves with receipt_id without hitting network', async () => {
    const res = await receiptsApi.upload('file:///img.jpg', 'image/jpeg');
    expect(res).toHaveProperty('receipt_id');
    expect(res.receipt_id).toMatch(/^r-demo-new-/);
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

// ── real mode ────────────────────────────────────────────────────────────────

describe('receiptsApi — real mode', () => {
  beforeEach(() => { setDemoMode(false); jest.clearAllMocks(); });

  it('list GETs /api/mobile/receipts', async () => {
    mockRequest.mockResolvedValueOnce(MOCK_LIST);
    const res = await receiptsApi.list({ page: 1, limit: 10 });
    expect(mockRequest).toHaveBeenCalledWith(expect.stringContaining('/api/mobile/receipts'));
    expect(res.results[0].receipt_id).toBe('r-1');
  });

  it('list includes query params for search', async () => {
    mockRequest.mockResolvedValueOnce(MOCK_LIST);
    await receiptsApi.list({ search: 'coffee', page: 2 });
    const url = mockRequest.mock.calls[0][0] as string;
    expect(url).toContain('search=coffee');
    expect(url).toContain('page=2');
  });

  it('detail GETs /api/mobile/receipts/:id', async () => {
    mockRequest.mockResolvedValueOnce(MOCK_DETAIL);
    const res = await receiptsApi.detail('r-1');
    expect(mockRequest).toHaveBeenCalledWith('/api/mobile/receipts/r-1');
    expect(res.merchant_name).toBe('Starbucks');
  });

  it('upload POSTs FormData to /api/mobile/receipts', async () => {
    mockRequest.mockResolvedValueOnce(MOCK_UPLOAD);
    const res = await receiptsApi.upload('file:///img.jpg', 'image/jpeg');
    expect(mockRequest).toHaveBeenCalledWith('/api/mobile/receipts', expect.objectContaining({ method: 'POST' }));
    expect(res.receipt_id).toBe('r-new');
  });

  it('upload sends FormData body', async () => {
    mockRequest.mockResolvedValueOnce(MOCK_UPLOAD);
    await receiptsApi.upload('file:///img.jpg', 'image/png');
    const opts = mockRequest.mock.calls[0][1] as { body: unknown };
    expect(opts.body).toBeInstanceOf(FormData);
  });

  it('list propagates network errors', async () => {
    mockRequest.mockRejectedValueOnce(new client.ApiError(500, 'Server error'));
    await expect(receiptsApi.list()).rejects.toBeInstanceOf(client.ApiError);
  });

  it('detail propagates 404 as ApiError', async () => {
    mockRequest.mockRejectedValueOnce(new client.ApiError(404, 'Not found'));
    await expect(receiptsApi.detail('missing')).rejects.toBeInstanceOf(client.ApiError);
  });

  it('upload propagates UnauthorizedError on 401', async () => {
    mockRequest.mockRejectedValueOnce(new client.UnauthorizedError());
    await expect(receiptsApi.upload('file:///x.jpg', 'image/jpeg')).rejects.toBeInstanceOf(client.UnauthorizedError);
  });
});
