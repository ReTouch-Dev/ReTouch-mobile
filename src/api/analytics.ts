import { getSessionItem } from '../lib/sessionStorage';

const ANALYTICS_BASE = process.env.EXPO_PUBLIC_ANALYTICS_BASE_URL ?? 'http://localhost:5002/analytics';

function analyticsRequest<T>(path: string): Promise<T> {
  return fetch(`${ANALYTICS_BASE}${path}`, {
    headers: {},
  }).then(async (res) => {
    if (!res.ok) throw new Error(`Analytics ${res.status}`);
    return res.json() as Promise<T>;
  });
}

// We piggyback JWT from the API client for user-scoped analytics
async function authedAnalyticsRequest<T>(path: string): Promise<T> {
  const token = await getSessionItem('access_token');
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const res = await fetch(`${ANALYTICS_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`Analytics ${res.status}`);
  return res.json() as Promise<T>;
}

export interface SpendingSummary {
  user_id: number;
  total_receipts: number;
  total_spent: number;
  average_transaction: number;
  first_receipt_date: string | null;
  last_receipt_date: string | null;
}

export interface SpendingTrend {
  period: string;
  total_spent: number;
  receipt_count: number;
  average_transaction: number;
}

export interface SpendingTrendsResponse {
  user_id: number;
  interval: string;
  trends: SpendingTrend[];
}

export interface TopMerchant {
  merchant: string;
  visits: number;
  total_spent: number;
  average_transaction: number;
}

export interface TopMerchantsResponse {
  user_id: number;
  merchants: TopMerchant[];
  count: number;
}

export interface CategoryItem {
  category: string;
  receipt_count: number;
  total_spent: number;
  percentage: number;
  top_merchants: string[];
}

export interface CategoryBreakdownResponse {
  user_id: number;
  categories: CategoryItem[];
  count: number;
}

export interface InsightCard {
  headline: string;
  detail: string;
}

export interface InsightsResponse {
  user_id: number;
  insights: InsightCard[];
  model: string;
  tokens_used: number;
  pending: boolean;
  fallback_reason?: string | null;
}

export const analyticsApi = {
  summary: (days = 30) =>
    authedAnalyticsRequest<SpendingSummary>(`/user/spending/summary?days=${days}`),

  trends: (params: { interval?: string; periods?: number } = {}) => {
    const q = new URLSearchParams({ interval: params.interval ?? 'monthly', periods: String(params.periods ?? 6) });
    return authedAnalyticsRequest<SpendingTrendsResponse>(`/user/spending/trends?${q}`);
  },

  topMerchants: (days = 30, limit = 10) =>
    authedAnalyticsRequest<TopMerchantsResponse>(`/user/merchants/top?days=${days}&limit=${limit}`),

  categoryBreakdown: (days = 30) =>
    authedAnalyticsRequest<CategoryBreakdownResponse>(`/user/categories/breakdown?days=${days}`),

  insights: (days = 30) =>
    authedAnalyticsRequest<InsightsResponse>(`/user/insights?days=${days}`),
};
