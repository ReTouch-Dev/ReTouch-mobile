/**
 * Demo fixtures for the ReTouch Mobile app.
 *
 * Used when EXPO_PUBLIC_DEMO_MODE=true so the app runs fully offline
 * with realistic Hong Kong receipt data.
 *
 * Professional pattern: swap the API adapter at the boundary layer
 * instead of scattering conditionals throughout the UI.
 */

import type {
  AuthResponse,
  ReceiptListResponse,
  ReceiptDetail,
  SpendingSummary,
  SpendingTrend,
  SpendingTrendsResponse,
  TopMerchantsResponse,
  CategoryBreakdownResponse,
  InsightsResponse,
} from '../types';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const DEMO_USER: AuthResponse['user'] = {
  id: 1,
  email: 'iamsaleh.furqan@gmail.com',
  full_name: 'Saleh Furqan',
  is_active: true,
  is_verified: true,
};

export const DEMO_AUTH: AuthResponse = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  user: DEMO_USER,
};

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

const R = (
  id: string,
  merchant: string,
  date: string,
  total: number,
  category: string,
  address: string,
  items: Array<{ name: string; qty: number; price: number }>,
  confidence = 0.92,
): ReceiptDetail => ({
  receipt_id: id,
  created_at: `${date}T08:00:00Z`,
  mime_type: 'image/jpeg',
  upload_status: 'completed',
  image_url: null,
  ocr_status: 'completed',
  merchant_name: merchant,
  merchant_address: address,
  merchant_phone: null,
  transaction_date: date,
  transaction_time: '12:30:00',
  currency: 'HKD',
  subtotal: parseFloat((total / 1.1).toFixed(2)),
  tax: parseFloat((total - total / 1.1).toFixed(2)),
  total,
  payment_method: ['Visa', 'Cash', 'Octopus', 'Mastercard'][Math.abs(id.charCodeAt(7) - 48) % 4],
  category,
  ocr_confidence: confidence,
  line_items: items.map((it, i) => ({
    line_number: i + 1,
    item_name: it.name,
    quantity: it.qty,
    unit_price: parseFloat((it.price / it.qty).toFixed(2)),
    total_price: it.price,
  })),
});

export const DEMO_RECEIPT_DETAILS: Record<string, ReceiptDetail> = {
  'r-demo-001': R(
    'r-demo-001', 'Pacific Coffee', '2026-05-10', 68.00, 'Food & Drink',
    'Shop G01, IFC Mall, 1 Harbour View St, Central, HK',
    [{ name: 'Flat White (L)', qty: 1, price: 42.00 }, { name: 'Butter Croissant', qty: 1, price: 26.00 }],
    0.97,
  ),
  'r-demo-002': R(
    'r-demo-002', 'ParknShop', '2026-05-07', 312.50, 'Groceries',
    'Basement 1, Times Square, 1 Matheson St, Causeway Bay, HK',
    [
      { name: 'Organic Whole Milk 2L', qty: 2, price: 48.00 },
      { name: 'Chicken Breast 500g', qty: 1, price: 62.00 },
      { name: 'Japanese Eggs ×10', qty: 1, price: 38.50 },
      { name: 'Baby Spinach 200g', qty: 2, price: 34.00 },
      { name: 'Sourdough Bread', qty: 1, price: 45.00 },
      { name: 'Mineral Water 6pk', qty: 1, price: 29.00 },
      { name: 'Greek Yogurt', qty: 2, price: 56.00 },
    ],
    0.94,
  ),
  'r-demo-003': R(
    'r-demo-003', "McDonald's HK", '2026-05-05', 72.00, 'Food & Drink',
    '2F, Times Square, 1 Matheson St, Causeway Bay, HK',
    [{ name: 'Double Cheeseburger Meal', qty: 1, price: 54.00 }, { name: 'McFlurry Oreo', qty: 1, price: 18.00 }],
    0.96,
  ),
  'r-demo-004': R(
    'r-demo-004', 'Mannings', '2026-05-03', 138.00, 'Health & Beauty',
    'Shop 108, Pacific Place, 88 Queensway, Admiralty, HK',
    [
      { name: 'Vitamin C 1000mg ×60', qty: 1, price: 68.00 },
      { name: 'Facial Cleanser 150ml', qty: 1, price: 48.00 },
      { name: 'Hand Sanitiser 500ml', qty: 1, price: 22.00 },
    ],
    0.93,
  ),
  'r-demo-005': R(
    'r-demo-005', 'Starbucks HK', '2026-04-30', 58.00, 'Food & Drink',
    'Shop 1034, Harbour City, 3–27 Canton Rd, Tsim Sha Tsui, HK',
    [{ name: 'Caramel Macchiato (Venti)', qty: 1, price: 58.00 }],
    0.98,
  ),
  'r-demo-006': R(
    'r-demo-006', 'Café de Coral', '2026-04-28', 89.00, 'Food & Drink',
    '9 Queen\'s Rd Central, Central, HK',
    [
      { name: 'Char Siu Rice Set', qty: 1, price: 52.00 },
      { name: 'Milk Tea (L)', qty: 1, price: 22.00 },
      { name: 'Egg Tart ×2', qty: 2, price: 15.00 },
    ],
    0.91,
  ),
  'r-demo-007': R(
    'r-demo-007', '759 Store', '2026-04-26', 47.80, 'Groceries',
    'G/F, 129 King\'s Rd, North Point, HK',
    [
      { name: 'Yan Yan Biscuits', qty: 2, price: 19.80 },
      { name: 'Coconut Water 330ml', qty: 2, price: 18.00 },
      { name: 'Pocky Chocolate', qty: 2, price: 10.00 },
    ],
    0.89,
  ),
  'r-demo-008': R(
    'r-demo-008', 'ParknShop', '2026-04-22', 428.50, 'Groceries',
    'L3, Elements, 1 Austin Rd W, Tsim Sha Tsui, HK',
    [
      { name: 'Ribeye Steak 300g', qty: 1, price: 158.00 },
      { name: 'Salmon Fillet 400g', qty: 1, price: 96.00 },
      { name: 'Organic Avocado ×4', qty: 4, price: 52.00 },
      { name: 'Italian Pasta 500g', qty: 3, price: 48.00 },
      { name: 'Pasta Sauce', qty: 2, price: 38.00 },
      { name: 'Olive Oil 500ml', qty: 1, price: 36.50 },
    ],
    0.95,
  ),
  'r-demo-009': R(
    'r-demo-009', 'KFC HK', '2026-04-20', 138.00, 'Food & Drink',
    'G/F, 210 Johnston Rd, Wan Chai, HK',
    [
      { name: 'Family Bucket (10 pcs)', qty: 1, price: 138.00 },
    ],
    0.97,
  ),
  'r-demo-010': R(
    'r-demo-010', 'Watsons HK', '2026-04-18', 168.00, 'Health & Beauty',
    'Shop 204, Cityplaza, 18 Taikoo Shing Rd, Taikoo, HK',
    [
      { name: 'SK-II Toner 230ml', qty: 1, price: 98.00 },
      { name: 'Sunscreen SPF50 50ml', qty: 1, price: 45.00 },
      { name: 'Lip Balm SPF20', qty: 1, price: 25.00 },
    ],
    0.92,
  ),
  'r-demo-011': R(
    'r-demo-011', 'Pacific Coffee', '2026-04-15', 52.00, 'Food & Drink',
    'Shop 3, Man Yee Building, 68 Queen\'s Rd Central, HK',
    [{ name: 'Iced Latte (M)', qty: 1, price: 38.00 }, { name: 'Granola Bar', qty: 1, price: 14.00 }],
    0.96,
  ),
  'r-demo-012': R(
    'r-demo-012', 'Circle K', '2026-04-12', 34.50, 'Groceries',
    '183 Lockhart Rd, Wan Chai, HK',
    [
      { name: 'Yakult ×5', qty: 1, price: 14.50 },
      { name: 'Cup Noodles', qty: 2, price: 12.00 },
      { name: 'Vitamin Water', qty: 1, price: 8.00 },
    ],
    0.88,
  ),
  'r-demo-013': R(
    'r-demo-013', 'Fortress Electronics', '2026-04-09', 128.00, 'Electronics',
    'L2, New Town Plaza, 18 Sha Tin Centre St, Sha Tin, HK',
    [{ name: 'USB-C Cable (2m)', qty: 2, price: 128.00 }],
    0.99,
  ),
  'r-demo-014': R(
    'r-demo-014', 'SpiceStore', '2026-04-04', 153.00, 'Groceries',
    'Sha Tin, New Territories, HK',
    [
      { name: 'Chicken Boneless Breast', qty: 1, price: 65.00 },
      { name: 'Haldiram Moong Dal', qty: 1, price: 12.00 },
      { name: 'Basmati Rice 5kg', qty: 1, price: 58.00 },
      { name: 'Cardamom Pods 50g', qty: 1, price: 18.00 },
    ],
    0.94,
  ),
  'r-demo-015': R(
    'r-demo-015', 'Wellcome', '2026-03-31', 265.00, 'Groceries',
    'G/F, 30 Shaukeiwan Rd, Shaukeiwan, HK',
    [
      { name: 'Laundry Detergent 3kg', qty: 1, price: 68.00 },
      { name: 'Dish Soap 500ml', qty: 2, price: 26.00 },
      { name: 'Paper Towels ×6', qty: 1, price: 38.00 },
      { name: 'Toilet Paper ×12', qty: 1, price: 52.00 },
      { name: 'Fabric Softener 2L', qty: 1, price: 48.00 },
      { name: 'Sponges ×3', qty: 1, price: 33.00 },
    ],
    0.91,
  ),
  'r-demo-016': R(
    'r-demo-016', 'Pacific Coffee', '2026-03-27', 75.00, 'Food & Drink',
    'Shop G01, IFC Mall, 1 Harbour View St, Central, HK',
    [{ name: 'Flat White (L)', qty: 1, price: 42.00 }, { name: 'Egg Sandwich', qty: 1, price: 33.00 }],
    0.97,
  ),
  'r-demo-017': R(
    'r-demo-017', "McDonald's HK", '2026-03-23', 48.00, 'Food & Drink',
    'G/F, 50 Lee Garden Rd, Causeway Bay, HK',
    [{ name: 'McBreakfast Set A', qty: 1, price: 48.00 }],
    0.95,
  ),
  'r-demo-018': R(
    'r-demo-018', 'Mannings', '2026-03-18', 225.00, 'Health & Beauty',
    'Shop B104, Harbour City, 3 Canton Rd, Tsim Sha Tsui, HK',
    [
      { name: 'Retinol Serum 30ml', qty: 1, price: 128.00 },
      { name: 'Moisturiser SPF30 50ml', qty: 1, price: 68.00 },
      { name: 'Micellar Water 400ml', qty: 1, price: 29.00 },
    ],
    0.93,
  ),
  'r-demo-019': R(
    'r-demo-019', 'Café de Coral', '2026-03-13', 95.00, 'Food & Drink',
    '171 Johnston Rd, Wan Chai, HK',
    [
      { name: 'Wonton Noodle Soup', qty: 1, price: 48.00 },
      { name: 'Pineapple Bun + Butter', qty: 1, price: 22.00 },
      { name: 'Hong Kong Milk Tea', qty: 1, price: 25.00 },
    ],
    0.90,
  ),
  'r-demo-020': R(
    'r-demo-020', 'Starbucks HK', '2026-03-05', 78.00, 'Food & Drink',
    'Shop 1034, Harbour City, 3–27 Canton Rd, Tsim Sha Tsui, HK',
    [{ name: 'Vanilla Frappuccino (Venti)', qty: 1, price: 78.00 }],
    0.98,
  ),
};

const DETAILS_ARRAY = Object.values(DEMO_RECEIPT_DETAILS);

function toListItem(d: ReceiptDetail): import('../types').ReceiptListItem {
  return {
    receipt_id: d.receipt_id,
    created_at: d.created_at,
    mime_type: d.mime_type,
    upload_status: d.upload_status,
    image_url: d.image_url,
    ocr: {
      status: d.ocr_status,
      merchant: d.merchant_name,
      date: d.transaction_date,
      total: d.total,
      currency: d.currency,
      confidence: d.ocr_confidence,
    },
  };
}

export function getDemoReceiptList(
  params: { page?: number; limit?: number; search?: string },
  extraDetails: ReceiptDetail[] = [],
): ReceiptListResponse {
  const { page = 1, limit = 30, search = '' } = params;
  const all = [...extraDetails, ...DETAILS_ARRAY];
  const filtered = all.filter((r) =>
    !search || r.merchant_name?.toLowerCase().includes(search.toLowerCase()),
  );
  const total = filtered.length;
  const start = (page - 1) * limit;
  const results = filtered.slice(start, start + limit).map(toListItem);
  return { results, count: results.length, total, page, limit, has_next: start + limit < total };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

const DEMO_USER_ID = 1;

function summaryFor(days: number): SpendingSummary {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const relevant = DETAILS_ARRAY.filter((r) => new Date(r.created_at) >= cutoff && r.total != null);
  const total_spent = relevant.reduce((s, r) => s + (r.total ?? 0), 0);
  const total_receipts = relevant.length;
  return {
    user_id: DEMO_USER_ID,
    display_currency: 'HKD',
    total_receipts,
    total_spent: parseFloat(total_spent.toFixed(2)),
    average_transaction: total_receipts ? parseFloat((total_spent / total_receipts).toFixed(2)) : 0,
    first_receipt_date: relevant.at(-1)?.transaction_date ?? null,
    last_receipt_date: relevant[0]?.transaction_date ?? null,
  };
}

export function getDemoSummary(days: number): SpendingSummary {
  return summaryFor(days);
}

export function getDemoTopMerchants(days: number, limit = 10): TopMerchantsResponse {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const relevant = DETAILS_ARRAY.filter((r) => new Date(r.created_at) >= cutoff);

  const map = new Map<string, { visits: number; total: number }>();
  for (const r of relevant) {
    const key = r.merchant_name ?? 'Unknown';
    const cur = map.get(key) ?? { visits: 0, total: 0 };
    map.set(key, { visits: cur.visits + 1, total: cur.total + (r.total ?? 0) });
  }

  const merchants = [...map.entries()]
    .map(([merchant, { visits, total }]) => ({
      merchant,
      visits,
      total_spent: parseFloat(total.toFixed(2)),
      average_transaction: parseFloat((total / visits).toFixed(2)),
    }))
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, limit);

  return { user_id: DEMO_USER_ID, merchants, count: merchants.length };
}

export function getDemoCategoryBreakdown(days: number): CategoryBreakdownResponse {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const relevant = DETAILS_ARRAY.filter((r) => new Date(r.created_at) >= cutoff);
  const totalSpent = relevant.reduce((s, r) => s + (r.total ?? 0), 0);

  const map = new Map<string, { total: number; count: number; merchants: Set<string> }>();
  for (const r of relevant) {
    const cat = r.category ?? 'Other';
    const cur = map.get(cat) ?? { total: 0, count: 0, merchants: new Set() };
    cur.total += r.total ?? 0;
    cur.count += 1;
    if (r.merchant_name) cur.merchants.add(r.merchant_name);
    map.set(cat, cur);
  }

  const categories = [...map.entries()]
    .map(([category, { total, count, merchants }]) => ({
      category,
      receipt_count: count,
      total_spent: parseFloat(total.toFixed(2)),
      percentage: totalSpent ? parseFloat(((total / totalSpent) * 100).toFixed(1)) : 0,
      top_merchants: [...merchants].slice(0, 3),
    }))
    .sort((a, b) => b.total_spent - a.total_spent);

  return { user_id: DEMO_USER_ID, categories, count: categories.length };
}

export function getDemoInsights(days: number): InsightsResponse {
  const summary = summaryFor(days);
  const merchants = getDemoTopMerchants(days, 3);
  const categories = getDemoCategoryBreakdown(days);

  const topMerchant = merchants.merchants[0];
  const topCategory = categories.categories[0];
  const foodSpend = categories.categories.find((c) => c.category === 'Food & Drink');

  const insights = [];

  if (topMerchant) {
    insights.push({
      headline: `${topMerchant.merchant} is your top spot`,
      detail: `You've visited ${topMerchant.merchant} ${topMerchant.visits} time${topMerchant.visits > 1 ? 's' : ''} this period, spending HK$${topMerchant.total_spent.toFixed(0)} in total.`,
    });
  }

  if (topCategory && summary.total_spent > 0) {
    insights.push({
      headline: `${topCategory.percentage.toFixed(0)}% goes to ${topCategory.category}`,
      detail: `${topCategory.category} is your biggest spending category at HK$${topCategory.total_spent.toFixed(0)} — spread across ${topCategory.receipt_count} receipt${topCategory.receipt_count > 1 ? 's' : ''}.`,
    });
  }

  if (foodSpend && summary.total_spent > 0) {
    const avgPerDay = foodSpend.total_spent / days;
    insights.push({
      headline: 'Food & drink daily average',
      detail: `You spend roughly HK$${avgPerDay.toFixed(0)} per day on food & drink — HK$${foodSpend.total_spent.toFixed(0)} total this period.`,
    });
  }

  return {
    user_id: DEMO_USER_ID,
    insights,
    model: 'demo',
    tokens_used: 0,
    pending: false,
    fallback_reason: null,
  };
}

export function getDemoTrends(days: number): SpendingTrendsResponse {
  const now = new Date();
  const trends: SpendingTrend[] = [];

  if (days <= 30) {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayItems = DETAILS_ARRAY.filter((r) => r.transaction_date === dateStr);
      const total = dayItems.reduce((s, r) => s + (r.total ?? 0), 0);
      trends.push({
        period: `${d.getMonth() + 1}/${d.getDate()}`,
        total_spent: parseFloat(total.toFixed(2)),
        receipt_count: dayItems.length,
        average_transaction: dayItems.length ? parseFloat((total / dayItems.length).toFixed(2)) : 0,
      });
    }
  } else {
    const weeks = Math.ceil(days / 7);
    for (let w = weeks - 1; w >= 0; w--) {
      const wEnd = new Date(now);
      wEnd.setDate(wEnd.getDate() - w * 7);
      const wStart = new Date(wEnd);
      wStart.setDate(wStart.getDate() - 6);
      const wItems = DETAILS_ARRAY.filter((r) => {
        if (!r.transaction_date) return false;
        const d = new Date(r.transaction_date);
        return d >= wStart && d <= wEnd;
      });
      const total = wItems.reduce((s, r) => s + (r.total ?? 0), 0);
      trends.push({
        period: `W${weeks - w}`,
        total_spent: parseFloat(total.toFixed(2)),
        receipt_count: wItems.length,
        average_transaction: wItems.length ? parseFloat((total / wItems.length).toFixed(2)) : 0,
      });
    }
  }

  return { user_id: DEMO_USER_ID, interval: days <= 30 ? 'daily' : 'weekly', trends };
}
