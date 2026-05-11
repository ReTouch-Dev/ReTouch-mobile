import { request } from './client';

export interface OCRSummary {
  status: string | null;
  merchant: string | null;
  date: string | null;
  total: number | null;
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

export const receiptsApi = {
  list: (params: { page?: number; limit?: number; search?: string; date?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.date) q.set('date', params.date);
    return request<ReceiptListResponse>(`/api/mobile/receipts?${q}`);
  },

  detail: (receiptId: string) =>
    request<ReceiptDetail>(`/api/mobile/receipts/${receiptId}`),

  upload: (imageUri: string, mimeType: string) => {
    const form = new FormData();
    form.append('mime_type', mimeType);
    form.append('receipt', {
      uri: imageUri,
      name: 'receipt.jpg',
      type: mimeType,
    } as unknown as Blob);
    return request<UploadResponse>('/api/mobile/receipts', {
      method: 'POST',
      body: form,
    });
  },
};
