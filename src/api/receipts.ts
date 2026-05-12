/**
 * Receipts API adapter.
 *
 * Endpoints: list, detail, upload.
 * When DEMO_MODE is true every call resolves with fixture data.
 */
import { request } from './client';
import { DEMO_MODE } from '../lib/demo';
import {
  getDemoReceiptList,
  DEMO_RECEIPT_DETAILS,
  DEMO_AUTH,
} from '../constants/fixtures';
import type {
  LineItem,
  OCRSummary,
  ReceiptDetail,
  ReceiptListItem,
  ReceiptListResponse,
  UploadResponse,
} from '../types';

// Re-export types consumed by screens / tests
export type { LineItem, OCRSummary, ReceiptDetail, ReceiptListItem, ReceiptListResponse, UploadResponse };

export const receiptsApi = {
  list: (params: { page?: number; limit?: number; search?: string; date?: string } = {}): Promise<ReceiptListResponse> => {
    if (DEMO_MODE) {
      return new Promise((res) => setTimeout(() => res(getDemoReceiptList(params)), 400));
    }
    const q = new URLSearchParams();
    if (params.page)   q.set('page',   String(params.page));
    if (params.limit)  q.set('limit',  String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.date)   q.set('date',   params.date);
    return request<ReceiptListResponse>(`/api/mobile/receipts?${q}`);
  },

  detail: (receiptId: string): Promise<ReceiptDetail> => {
    if (DEMO_MODE) {
      const rec = DEMO_RECEIPT_DETAILS[receiptId];
      if (rec) return new Promise((res) => setTimeout(() => res(rec), 300));
      return Promise.reject(new Error('Receipt not found'));
    }
    return request<ReceiptDetail>(`/api/mobile/receipts/${receiptId}`);
  },

  upload: (imageUri: string, mimeType: string): Promise<UploadResponse> => {
    if (DEMO_MODE) {
      const fake: UploadResponse = {
        receipt_id: `r-demo-new-${Date.now()}`,
        upload_status: 'pending',
        created_at: new Date().toISOString(),
        mime_type: mimeType,
        image_url: null,
      };
      return new Promise((res) => setTimeout(() => res(fake), 800));
    }
    const form = new FormData();
    form.append('mime_type', mimeType);
    form.append('receipt', {
      uri: imageUri,
      name: 'receipt.jpg',
      type: mimeType,
    } as unknown as Blob);
    return request<UploadResponse>('/api/mobile/receipts', { method: 'POST', body: form });
  },
};

// Silence unused import warning in demo builds
void DEMO_AUTH;
