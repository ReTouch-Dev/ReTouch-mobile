import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
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

const CATEGORY_COLORS = [
  '#1BC5E3', '#4ADE80', '#FBBF24', '#F87171', '#A78BFA', '#34D399',
];

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.summaryCard}>
      <Ionicons name={icon} size={16} color={colors.primary} style={{ marginBottom: 4 }} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [range, setRange] = useState<RangeKey>('30d');
  const insets = useSafeAreaInsets();
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing['4xl'] }]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Analytics</Text>
        {loading && <ActivityIndicator color={colors.primary} size="small" />}
      </View>

      {/* Range selector */}
      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r.label}
            style={[styles.rangeBtn, range === r.label && styles.rangeBtnActive]}
            onPress={() => setRange(r.label)}
            activeOpacity={0.7}
          >
            <Text style={[styles.rangeBtnText, range === r.label && styles.rangeBtnTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <SummaryCard
          label="Total spent"
          value={formatCurrency(summary?.total_spent)}
          icon="card"
        />
        <SummaryCard
          label="Transactions"
          value={String(summary?.total_receipts ?? '—')}
          icon="receipt"
        />
        <SummaryCard
          label="Avg. spend"
          value={formatCurrency(summary?.average_transaction)}
          icon="trending-up"
        />
      </View>

      {/* Top Merchants */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Merchants</Text>
        {(merchants?.merchants ?? []).length === 0 ? (
          <Text style={styles.empty}>No data yet</Text>
        ) : (
          (merchants?.merchants ?? []).map((m, i) => {
            const maxSpent = merchants!.merchants[0]?.total_spent ?? 1;
            const pct = (m.total_spent / maxSpent) * 100;
            return (
              <View key={m.merchant} style={styles.merchantRow}>
                <Text style={styles.merchantRank}>#{i + 1}</Text>
                <View style={styles.merchantInfo}>
                  <View style={styles.merchantNameRow}>
                    <Text style={styles.merchantName} numberOfLines={1}>{m.merchant}</Text>
                    <Text style={styles.merchantAmt}>{formatCurrency(m.total_spent)}</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                </View>
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
              <Text style={styles.categoryName} numberOfLines={1}>{c.category || 'Other'}</Text>
              <Text style={styles.categoryPct}>{c.percentage.toFixed(0)}%</Text>
              <Text style={styles.categoryAmt}>{formatCurrency(c.total_spent)}</Text>
            </View>
          ))
        )}
      </View>

      {/* AI Insights */}
      {insights?.insights && insights.insights.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.insightHeader}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>AI Insights</Text>
          </View>
          {insights.insights.map((ins, i) => (
            <View key={i} style={styles.insightCard}>
              <Text style={styles.insightHeadline}>{ins.headline}</Text>
              <Text style={styles.insightDetail}>{ins.detail}</Text>
            </View>
          ))}
        </View>
      ) : insights?.pending ? (
        <View style={[styles.section, styles.insightPending]}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.insightPendingText}>Generating AI insights…</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    marginBottom: spacing.md,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text1, letterSpacing: -0.5 },
  rangeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  rangeBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rangeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeBtnText: { fontSize: 13, fontWeight: '700', color: colors.text2 },
  rangeBtnTextActive: { color: colors.bg },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  summaryLabel: { fontSize: 10, color: colors.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },
  summaryValue: { fontSize: 15, fontWeight: '800', color: colors.text1 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.text1, textTransform: 'uppercase', letterSpacing: 0.5 },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  merchantRank: { fontSize: 11, color: colors.text3, width: 24, fontWeight: '700' },
  merchantInfo: { flex: 1, gap: 5 },
  merchantNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  merchantName: { fontSize: 13, fontWeight: '600', color: colors.text1, flex: 1 },
  barBg: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  merchantAmt: { fontSize: 12, color: colors.text2, fontVariant: ['tabular-nums'], marginLeft: spacing.sm },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: radius.full },
  categoryName: { flex: 1, fontSize: 13, color: colors.text1 },
  categoryPct: { fontSize: 12, color: colors.text2, fontVariant: ['tabular-nums'], width: 36, textAlign: 'right' },
  categoryAmt: { fontSize: 12, color: colors.text1, fontVariant: ['tabular-nums'], width: 80, textAlign: 'right' },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  insightCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  insightHeadline: { fontSize: 13, fontWeight: '700', color: colors.primary },
  insightDetail: { fontSize: 12, color: colors.text2, lineHeight: 18 },
  insightPending: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  insightPendingText: { color: colors.text2, fontSize: 13 },
  empty: { fontSize: 13, color: colors.text3, textAlign: 'center', paddingVertical: spacing.sm },
});
