/**
 * Unit tests for analyticsApi — all 5 endpoints, demo + real modes.
 *
 * Analytics now uses the shared `request` client from client.ts so mock
 * responses must include a Headers-compatible `headers.get` method and
 * error messages come from client.ts (ApiError / UnauthorizedError).
 */
import { analyticsApi } from '../api/analytics';
import * as demo from '../lib/demo';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('../lib/sessionStorage', () => ({
  getSessionItem: jest.fn().mockResolvedValue('mock-token'),
}));

function setDemoMode(val: boolean) {
  Object.defineProperty(demo, 'DEMO_MODE', { value: val, configurable: true });
}

/** Helper: resolve with a successful JSON response. */
function mockFetchOk(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: { get: (_key: string) => 'application/json' },
    json: async () => body,
  });
}

/** Helper: resolve with an error response that includes a JSON body. */
function mockFetchError(status: number) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    headers: { get: (_key: string) => 'application/json' },
    json: async () => ({ message: `Error ${status}` }),
  });
}

const MOCK_SUMMARY = {
  user_id: 1, total_spent: 1000, total_receipts: 10,
  average_transaction: 100, first_receipt_date: null,
  last_receipt_date: null, generated_at: '2024-01-01T00:00:00Z',
};

const MOCK_TRENDS = {
  user_id: 1, interval: 'daily', periods: 7,
  trends: [{ period: '2024-01-01', total_spent: 100, receipt_count: 1 }],
};

const MOCK_MERCHANTS = {
  user_id: 1, count: 1,
  merchants: [{ merchant: 'Starbucks', total_spent: 500, visits: 5, average_transaction: 100 }],
};

const MOCK_CATEGORIES = {
  user_id: 1, count: 1,
  categories: [{ category: 'Food', total_spent: 500, percentage: 50, receipt_count: 5, top_merchants: [] }],
};

const MOCK_INSIGHTS = {
  user_id: 1, model: 'claude', tokens_used: 100,
  pending: false, fallback_reason: null,
  generated_at: '2024-01-01T00:00:00Z',
  insights: [{ headline: 'Test', detail: 'You spend a lot.' }],
};

// ── demo mode ────────────────────────────────────────────────────────────────

describe('analyticsApi — demo mode', () => {
  beforeEach(() => { setDemoMode(true); jest.clearAllMocks(); });

  it('summary resolves with fixture data', async () => {
    const res = await analyticsApi.summary(30);
    expect(res).toHaveProperty('total_spent');
    expect(res).toHaveProperty('total_receipts');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('summary works with custom days', async () => {
    const res = await analyticsApi.summary(7);
    expect(res).toHaveProperty('total_spent');
  });

  it('trendsForDays resolves with trends array', async () => {
    const res = await analyticsApi.trendsForDays(30);
    expect(res).toHaveProperty('trends');
    expect(Array.isArray(res.trends)).toBe(true);
  });

  it('topMerchants resolves with merchants array', async () => {
    const res = await analyticsApi.topMerchants(30, 5);
    expect(res).toHaveProperty('merchants');
    expect(Array.isArray(res.merchants)).toBe(true);
  });

  it('categoryBreakdown resolves with categories array', async () => {
    const res = await analyticsApi.categoryBreakdown(30);
    expect(res).toHaveProperty('categories');
    expect(Array.isArray(res.categories)).toBe(true);
  });

  it('insights resolves with insights array', async () => {
    const res = await analyticsApi.insights(30);
    expect(res).toHaveProperty('insights');
    expect(Array.isArray(res.insights)).toBe(true);
  });
});

// ── real mode ────────────────────────────────────────────────────────────────

describe('analyticsApi — real mode', () => {
  beforeEach(() => { setDemoMode(false); jest.clearAllMocks(); });

  it('summary fetches /analytics/user/spending/summary with days param', async () => {
    mockFetchOk(MOCK_SUMMARY);
    const res = await analyticsApi.summary(30);
    expect(res.total_spent).toBe(1000);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/analytics/user/spending/summary');
    expect(url).toContain('days=30');
  });

  it('summary sends Authorization header', async () => {
    mockFetchOk(MOCK_SUMMARY);
    await analyticsApi.summary(30);
    const opts = mockFetch.mock.calls[0][1] as RequestInit;
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer mock-token');
  });

  it('trendsForDays fetches daily interval for ≤30 days', async () => {
    mockFetchOk(MOCK_TRENDS);
    await analyticsApi.trendsForDays(14);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('interval=daily');
  });

  it('trendsForDays fetches weekly interval for >30 days', async () => {
    mockFetchOk(MOCK_TRENDS);
    await analyticsApi.trendsForDays(90);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('interval=weekly');
  });

  it('topMerchants fetches /analytics/user/merchants/top with limit', async () => {
    mockFetchOk(MOCK_MERCHANTS);
    await analyticsApi.topMerchants(30, 5);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/analytics/user/merchants/top');
    expect(url).toContain('limit=5');
  });

  it('categoryBreakdown fetches /analytics/user/categories/breakdown', async () => {
    mockFetchOk(MOCK_CATEGORIES);
    await analyticsApi.categoryBreakdown(7);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/analytics/user/categories/breakdown');
    expect(url).toContain('days=7');
  });

  it('insights fetches /analytics/user/insights', async () => {
    mockFetchOk(MOCK_INSIGHTS);
    const res = await analyticsApi.insights(30);
    expect(res.insights[0].headline).toBe('Test');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/analytics/user/insights');
  });

  it('throws ApiError with server message on non-ok response', async () => {
    mockFetchError(500);
    await expect(analyticsApi.summary(30)).rejects.toThrow('Error 500');
  });

  it('throws UnauthorizedError on 401 after refresh also fails', async () => {
    // First call: analytics endpoint returns 401
    mockFetchError(401);
    // Second call: token refresh endpoint also returns 401 (refresh invalid)
    mockFetchError(401);
    await expect(analyticsApi.insights(30)).rejects.toThrow('Unauthorized');
  });
});
