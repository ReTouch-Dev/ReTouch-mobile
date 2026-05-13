/**
 * Centralised domain types for ReTouch Mobile.
 *
 * All interfaces that cross the API boundary live here.
 * API modules import from here; screens import from here.
 * This is the single source of truth for shared shapes.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  created_at?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface EmailAvailabilityResponse {
  available: boolean;
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

export interface OCRSummary {
  status: string | null;
  merchant: string | null;
  date: string | null;
  total: number | null;
  currency?: string | null;
  confidence: number | null;
}

export interface ReceiptListItem {
  receipt_id: string;
  created_at: string;
  mime_type: string | null;
  upload_status: string;
  image_url: string | null;
  ocr: OCRSummary | null;
}

export interface ReceiptListResponse {
  count: number;
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  results: ReceiptListItem[];
}

export interface LineItem {
  line_number: number | null;
  item_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
}

export interface ReceiptDetail {
  receipt_id: string;
  created_at: string;
  mime_type: string | null;
  upload_status: string;
  image_url: string | null;
  ocr_status: string | null;
  merchant_name: string | null;
  merchant_address: string | null;
  merchant_phone: string | null;
  transaction_date: string | null;
  transaction_time: string | null;
  currency?: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  payment_method: string | null;
  category: string | null;
  ocr_confidence: number | null;
  line_items: LineItem[];
}

export interface UploadResponse {
  receipt_id: string;
  upload_status: string;
  created_at: string;
  mime_type: string | null;
  image_url: string | null;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface SpendingSummary {
  user_id: number;
  display_currency?: string;
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
