/**
 * Receipts API adapter.
 *
 * Endpoints: list, detail, upload.
 * When DEMO_MODE is true every call resolves with fixture data.
 * Uploaded receipts in demo mode are stored in demoReceiptsStore so they
 * appear immediately in the list and detail views.
 */
import { Platform } from 'react-native';
import { request } from './client';
import { DEMO_MODE } from '../lib/demo';
import {
  getDemoReceiptList,
  DEMO_RECEIPT_DETAILS,
} from '../constants/fixtures';
import { useDemoReceiptsStore } from '../store/demoReceiptsStore';
import type {
  LineItem,
  OCRSummary,
  ReceiptDetail,
  ReceiptListItem,
  ReceiptListResponse,
  UploadResponse,
} from '../types';

export type { LineItem, OCRSummary, ReceiptDetail, ReceiptListItem, ReceiptListResponse, UploadResponse };

const DEMO_MERCHANTS = [
  { name: 'Pacific Coffee', addr: 'IFC Mall, Central, HK', cat: 'Food & Drink' },
  { name: 'ParknShop', addr: 'Times Square, Causeway Bay, HK', cat: 'Groceries' },
  { name: 'Starbucks HK', addr: 'Harbour City, TST, HK', cat: 'Food & Drink' },
  { name: 'Mannings', addr: 'Pacific Place, Admiralty, HK', cat: 'Health & Beauty' },
  { name: 'Wellcome', addr: 'Wan Chai, HK', cat: 'Groceries' },
];

function makeDemoReceipt(id: string, imageUri: string): ReceiptDetail {
  const m = DEMO_MERCHANTS[Math.floor(Math.random() * DEMO_MERCHANTS.length)];
  const total = parseFloat((30 + Math.random() * 270).toFixed(2));
  return {
    receipt_id: id,
    created_at: new Date().toISOString(),
    mime_type: 'image/jpeg',
    upload_status: 'completed',
    image_url: imageUri,
    ocr_status: 'completed',
    merchant_name: m.name,
    merchant_address: m.addr,
    merchant_phone: null,
    transaction_date: new Date().toISOString().slice(0, 10),
    transaction_time: new Date().toTimeString().slice(0, 8),
    currency: 'HKD',
    subtotal: parseFloat((total / 1.1).toFixed(2)),
    tax: parseFloat((total - total / 1.1).toFixed(2)),
    total,
    payment_method: ['Visa', 'Cash', 'Octopus'][Math.floor(Math.random() * 3)],
    category: m.cat,
    ocr_confidence: parseFloat((0.88 + Math.random() * 0.1).toFixed(2)),
    line_items: [
      { line_number: 1, item_name: 'Item A', quantity: 1, unit_price: parseFloat((total * 0.6).toFixed(2)), total_price: parseFloat((total * 0.6).toFixed(2)) },
      { line_number: 2, item_name: 'Item B', quantity: 1, unit_price: parseFloat((total * 0.4).toFixed(2)), total_price: parseFloat((total * 0.4).toFixed(2)) },
    ],
  };
}

export const receiptsApi = {
  list: (params: { page?: number; limit?: number; search?: string; date?: string } = {}): Promise<ReceiptListResponse> => {
    if (DEMO_MODE) {
      const extra = useDemoReceiptsStore.getState().receipts;
      return new Promise((res) => setTimeout(() => res(getDemoReceiptList(params, extra)), 400));
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
      const dynamic = useDemoReceiptsStore.getState().getById(receiptId);
      if (dynamic) return new Promise((res) => setTimeout(() => res(dynamic), 200));
      const fixture = DEMO_RECEIPT_DETAILS[receiptId];
      if (fixture) return new Promise((res) => setTimeout(() => res(fixture), 300));
      return Promise.reject(new Error('Receipt not found'));
    }
    return request<ReceiptDetail>(`/api/mobile/receipts/${receiptId}`);
  },

  upload: async (imageUri: string, mimeType: string): Promise<UploadResponse> => {
    if (DEMO_MODE) {
      const id = `r-demo-new-${Date.now()}`;
      const receipt = makeDemoReceipt(id, imageUri);
      useDemoReceiptsStore.getState().add(receipt);
      const response: UploadResponse = {
        receipt_id: id,
        upload_status: 'completed',
        created_at: receipt.created_at,
        mime_type: mimeType,
        image_url: imageUri,
      };
      return new Promise((res) => setTimeout(() => res(response), 1200));
    }
    const form = new FormData();

    if (Platform.OS === 'web') {
      // On web, imageUri is a blob:// URL — fetch it to get the actual File object
      const fetchRes = await fetch(imageUri);
      const blob = await fetchRes.blob();
      const actualMime = (blob.type && blob.type !== 'application/octet-stream') ? blob.type : mimeType;
      const ext = actualMime.includes('png') ? 'png' : actualMime.includes('webp') ? 'webp' : 'jpg';
      form.append('mime_type', actualMime);
      form.append('receipt', new File([blob], `receipt.${ext}`, { type: actualMime }));
    } else {
      form.append('mime_type', mimeType);
      form.append('receipt', { uri: imageUri, name: 'receipt.jpg', type: mimeType } as unknown as Blob);
    }

    return request<UploadResponse>('/api/mobile/receipts', { method: 'POST', body: form });
  },
};
