import { create } from 'zustand';
import type { ReceiptDetail } from '../types';

interface DemoReceiptsState {
  receipts: ReceiptDetail[];
  add: (receipt: ReceiptDetail) => void;
  getById: (id: string) => ReceiptDetail | undefined;
}

export const useDemoReceiptsStore = create<DemoReceiptsState>((set, get) => ({
  receipts: [],
  add: (receipt) => set((s) => ({ receipts: [receipt, ...s.receipts] })),
  getById: (id) => get().receipts.find((r) => r.receipt_id === id),
}));
