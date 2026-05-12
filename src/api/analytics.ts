/**
 * Analytics API adapter.
 *
 * Connects to the analytics microservice (port 5002).
 * When DEMO_MODE is true every call resolves with computed fixture data.
 */
import { getSessionItem } from '../lib/sessionStorage';
import { DEMO_MODE } from '../lib/demo';
import {
  getDemoSummary,
  getDemoTopMerchants,
  getDemoCategoryBreakdown,
  getDemoInsights,
  getDemoTrends,
} from '../constants/fixtures';
import type {
  CategoryBreakdownResponse,
  InsightsResponse,
  SpendingSummary,
  SpendingTrendsResponse,
  TopMerchantsResponse,
} from '../types';

export type {
  CategoryBreakdownResponse,
  InsightsResponse,
  SpendingSummary,
  SpendingTrendsResponse,
  TopMerchantsResponse,
};
export type { InsightCard, SpendingTrend, TopMerchant, CategoryItem } from '../types';

const ANALYTICS_BASE =
  process.env.EXPO_PUBLIC_ANALYTICS_BASE_URL ?? 'http://localhost:5002/analytics';

async function authedRequest<T>(path: string): Promise<T> {
  const token = await getSessionItem('access_token');
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${ANALYTICS_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`Analytics ${res.status}`);
  return res.json() as Promise<T>;
}

export const analyticsApi = {
  summary: (days = 30): Promise<SpendingSummary> => {
    if (DEMO_MODE) return new Promise((res) => setTimeout(() => res(getDemoSummary(days)), 350));
    return authedRequest<SpendingSummary>(`/user/spending/summary?days=${days}`);
  },

  trendsForDays: (days: number): Promise<SpendingTrendsResponse> => {
    if (DEMO_MODE) return new Promise((res) => setTimeout(() => res(getDemoTrends(days)), 350));
    const interval = days <= 30 ? 'daily' : 'weekly';
    const periods = days <= 30 ? days : Math.ceil(days / 7);
    return authedRequest<SpendingTrendsResponse>(
      `/user/spending/trends?interval=${interval}&periods=${periods}`,
    );
  },

  topMerchants: (days = 30, limit = 10): Promise<TopMerchantsResponse> => {
    if (DEMO_MODE) return new Promise((res) => setTimeout(() => res(getDemoTopMerchants(days, limit)), 350));
    return authedRequest<TopMerchantsResponse>(`/user/merchants/top?days=${days}&limit=${limit}`);
  },

  categoryBreakdown: (days = 30): Promise<CategoryBreakdownResponse> => {
    if (DEMO_MODE) return new Promise((res) => setTimeout(() => res(getDemoCategoryBreakdown(days)), 350));
    return authedRequest<CategoryBreakdownResponse>(`/user/categories/breakdown?days=${days}`);
  },

  insights: (days = 30): Promise<InsightsResponse> => {
    if (DEMO_MODE) return new Promise((res) => setTimeout(() => res(getDemoInsights(days)), 500));
    return authedRequest<InsightsResponse>(`/user/insights?days=${days}`);
  },
};
