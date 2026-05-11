import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../src/api/analytics';
import { colors, spacing, radius, shadow } from '../../src/theme/tokens';

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

type RangeKey = typeof RANGES[number]['label'];

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '—';
  return `HK$${v.toLocaleString('en-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const CATEGORY_COLORS = ['#0B91C0', '#06B6D4', '#0E7490', '#22D3EE', '#67E8F9', '#A5F3FC'];

export default function AnalyticsScreen() {
  const [range, setRange] = useState<RangeKey>('30d');
  const days = RANGES.find((r) => r.label === range)?.days ?? 30;

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['analytics-summary', days],
    queryFn: () => analyticsApi.summary(days),
  });

  const { data: merchants, isLoading: loadingMerchants } = useQuery({
    queryKey: ['analytics-merchants', days],
    queryFn: () => analyticsApi.topMerchants(days, 6),
  });

  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ['analytics-categories', days],
    queryFn: () => analyticsApi.categoryBreakdown(days),
  });

  const { data: insights } = useQuery({
    queryKey: ['analytics-insights', days],
    queryFn: () => analyticsApi.insights(days),
  });

  const loading = loadingSummary || loadingMerchants || loadingCats;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Analytics</Text>

      {/* Range selector */}
      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r.label}
            style={[styles.rangeBtn, range === r.label && styles.rangeBtnActive]}
            onPress={() => setRange(r.label)}
          >
            <Text style={[styles.rangeBtnText, range === r.label && styles.rangeBtnTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <SummaryCard label="Total spent" value={formatCurrency(summary?.total_spent)} />
            <SummaryCard label="Transactions" value={String(summary?.total_receipts ?? '—')} />
            <SummaryCard label="Avg. txn" value={formatCurrency(summary?.average_transaction)} />
          </View>

          {/* Top merchants */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Merchants</Text>
            {(merchants?.merchants ?? []).length === 0 ? (
              <Text style={styles.empty}>No data yet</Text>
            ) : (
              (merchants?.merchants ?? []).map((m, i) => {
                const maxSpent = merchants!.merchants[0]?.total_spent ?? 1;
                return (
                  <View key={m.merchant} style={styles.merchantRow}>
                    <Text style={styles.merchantRank}>{i + 1}</Text>
                    <View style={styles.merchantInfo}>
                      <Text style={styles.merchantName}>{m.merchant}</Text>
                      <View style={styles.barBg}>
                        <View
                          style={[styles.barFill, { width: `${(m.total_spent / maxSpent) * 100}%` }]}
                        />
                      </View>
                    </View>
                    <Text style={styles.merchantAmt}>{formatCurrency(m.total_spent)}</Text>
                  </View>
                );
              })
            )}
          </View>

          {/* Category breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            {(categories?.categories ?? []).length === 0 ? (
              <Text style={styles.empty}>No data yet</Text>
            ) : (
              (categories?.categories ?? []).slice(0, 6).map((c, i) => (
                <View key={c.category} style={styles.categoryRow}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }]} />
                  <Text style={styles.categoryName}>{c.category || 'Other'}</Text>
                  <Text style={styles.categoryPct}>{c.percentage.toFixed(0)}%</Text>
                  <Text style={styles.categoryAmt}>{formatCurrency(c.total_spent)}</Text>
                </View>
              ))
            )}
          </View>

          {/* AI Insights */}
          {insights?.insights && insights.insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Insights</Text>
              {insights.insights.map((ins, i) => (
                <View key={i} style={styles.insightCard}>
                  <Text style={styles.insightHeadline}>{ins.headline}</Text>
                  <Text style={styles.insightDetail}>{ins.detail}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
  title: { fontSize: 28, fontWeight: '700', color: colors.text1, marginTop: spacing['2xl'], marginBottom: spacing.lg },
  rangeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  rangeBtn: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.lg, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  rangeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeBtnText: { fontSize: 13, fontWeight: '600', color: colors.text2 },
  rangeBtnTextActive: { color: colors.white },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  summaryCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  summaryLabel: { fontSize: 10, color: colors.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: colors.text1, marginTop: spacing.xs },
  section: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.sm, gap: spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text1, marginBottom: spacing.xs },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  merchantRank: { fontSize: 11, color: colors.text3, width: 18, textAlign: 'center' },
  merchantInfo: { flex: 1, gap: 3 },
  merchantName: { fontSize: 13, fontWeight: '600', color: colors.text1 },
  barBg: { height: 4, backgroundColor: colors.primaryLight, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary + '88', borderRadius: 2 },
  merchantAmt: { fontSize: 12, color: colors.text2, fontVariant: ['tabular-nums'] },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { flex: 1, fontSize: 13, color: colors.text1 },
  categoryPct: { fontSize: 12, color: colors.text2, fontVariant: ['tabular-nums'], width: 36 },
  categoryAmt: { fontSize: 12, color: colors.text1, fontVariant: ['tabular-nums'] },
  insightCard: { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, gap: 4 },
  insightHeadline: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  insightDetail: { fontSize: 12, color: colors.primaryDark + 'cc' },
  empty: { fontSize: 13, color: colors.text3 },
  center: { height: 200, alignItems: 'center', justifyContent: 'center' },
});
