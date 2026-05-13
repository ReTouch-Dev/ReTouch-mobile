/**
 * Analytics API adapter.
 *
 * All analytics endpoints live under /analytics/user/... on the main API server.
 * We use the shared `request` client from client.ts so:
 *   - The correct API base URL is always used (EXPO_PUBLIC_API_BASE_URL)
 *   - 401 / token-refresh logic is handled automatically
 *   - No separate EXPO_PUBLIC_ANALYTICS_BASE_URL env var is needed
 *
 * In DEMO_MODE every call resolves with computed fixture data; no network
 * requests are made.
 */
import { request } from './client';
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

// Re-export response types so screens can import from one place
export type {
  CategoryBreakdownResponse,
  InsightsResponse,
  SpendingSummary,
  SpendingTrendsResponse,
  TopMerchantsResponse,
};
export type { InsightCard, SpendingTrend, TopMerchant, CategoryItem } from '../types';

export const analyticsApi = {
  /** Total spend, receipt count, and average transaction for the given window. */
  summary: (days = 30): Promise<SpendingSummary> => {
    if (DEMO_MODE) return new Promise((res) => setTimeout(() => res(getDemoSummary(days)), 350));
    return request<SpendingSummary>(`/analytics/user/spending/summary?days=${days}`);
  },

  /** Spending broken into daily (≤30 days) or weekly (>30 days) periods. */
  trendsForDays: (days: number): Promise<SpendingTrendsResponse> => {
    if (DEMO_MODE) return new Promise((res) => setTimeout(() => res(getDemoTrends(days)), 350));
    const interval = days <= 30 ? 'daily' : 'weekly';
    const periods  = days <= 30 ? days : Math.ceil(days / 7);
    return request<SpendingTrendsResponse>(
      `/analytics/user/spending/trends?interval=${interval}&periods=${periods}`,
    );
  },

  /** Top merchants ranked by total spend. */
  topMerchants: (days = 30, limit = 10): Promise<TopMerchantsResponse> => {
    if (DEMO_MODE) return new Promise((res) => setTimeout(() => res(getDemoTopMerchants(days, limit)), 350));
    return request<TopMerchantsResponse>(`/analytics/user/merchants/top?days=${days}&limit=${limit}`);
  },

  /** Spend breakdown by OCR-extracted category. */
  categoryBreakdown: (days = 30): Promise<CategoryBreakdownResponse> => {
    if (DEMO_MODE) return new Promise((res) => setTimeout(() => res(getDemoCategoryBreakdown(days)), 350));
    return request<CategoryBreakdownResponse>(`/analytics/user/categories/breakdown?days=${days}`);
  },

  /** AI-generated spending insights (rate-limited to 5 refreshes/day client-side). */
  insights: (days = 30): Promise<InsightsResponse> => {
    if (DEMO_MODE) return new Promise((res) => setTimeout(() => res(getDemoInsights(days)), 500));
    return request<InsightsResponse>(`/analytics/user/insights?days=${days}`);
  },
};
