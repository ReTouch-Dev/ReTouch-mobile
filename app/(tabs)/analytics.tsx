import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { analyticsApi } from '../../src/api/analytics';
import { Card } from '../../src/components/ui';
import { colors, radius, shadow, spacing } from '../../src/theme/tokens';
import { formatCurrency } from '../../src/utils/format';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RANGES = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

type RangeLabel = typeof RANGES[number]['label'];

const CATEGORY_COLORS = [
  '#1BC5E3', '#4ADE80', '#FBBF24', '#F87171', '#A78BFA', '#34D399',
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIconWrap}>
        <Ionicons name={icon} size={15} color={colors.primary} />
      </View>
      <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AnalyticsScreen() {
  const [range, setRange] = useState<RangeLabel>('30d');
  const insets = useSafeAreaInsets();
  const days = RANGES.find((r) => r.label === range)?.days ?? 30;

  const { data: summary,    isLoading: loadingSummary }  = useQuery({ queryKey: ['analytics-summary',    days], queryFn: () => analyticsApi.summary(days) });
  const { data: merchants,  isLoading: loadingMerchants } = useQuery({ queryKey: ['analytics-merchants',  days], queryFn: () => analyticsApi.topMerchants(days, 6) });
  const { data: categories, isLoading: loadingCats }      = useQuery({ queryKey: ['analytics-categories', days], queryFn: () => analyticsApi.categoryBreakdown(days) });
  const { data: insights }                                 = useQuery({ queryKey: ['analytics-insights',   days], queryFn: () => analyticsApi.insights(days) });

  const loading = loadingSummary || loadingMerchants || loadingCats;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top, paddingBottom: insets.bottom + spacing['4xl'] },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Title row */}
      <View style={styles.titleRow}>
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
          icon="card-outline"
        />
        <SummaryCard
          label="Transactions"
          value={String(summary?.total_receipts ?? '—')}
          icon="receipt-outline"
        />
        <SummaryCard
          label="Avg. spend"
          value={formatCurrency(summary?.average_transaction)}
          icon="trending-up-outline"
        />
      </View>

      {/* Top Merchants */}
      <Card style={styles.section}>
        <SectionHeader icon="storefront-outline" title="Top Merchants" />
        {(merchants?.merchants ?? []).length === 0 ? (
          <Text style={styles.empty}>No data yet</Text>
        ) : (
          (merchants?.merchants ?? []).map((m, i) => {
            const maxSpent = merchants!.merchants[0]?.total_spent ?? 1;
            const pct = Math.max(4, (m.total_spent / maxSpent) * 100);
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
                  <Text style={styles.merchantVisits}>{m.visits} visit{m.visits !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      {/* Category Breakdown */}
      <Card style={styles.section}>
        <SectionHeader icon="pie-chart-outline" title="Categories" />
        {(categories?.categories ?? []).length === 0 ? (
          <Text style={styles.empty}>No data yet</Text>
        ) : (
          (categories?.categories ?? []).slice(0, 6).map((c, i) => (
            <View key={c.category} style={styles.categoryRow}>
              <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }]} />
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName} numberOfLines={1}>{c.category || 'Other'}</Text>
                <View style={styles.categoryBarBg}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: `${c.percentage}%`,
                        backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.categoryPct}>{c.percentage.toFixed(0)}%</Text>
              <Text style={styles.categoryAmt}>{formatCurrency(c.total_spent)}</Text>
            </View>
          ))
        )}
      </Card>

      {/* AI Insights */}
      {insights?.insights && insights.insights.length > 0 ? (
        <Card style={styles.section}>
          <SectionHeader icon="sparkles" title="AI Insights" />
          {insights.insights.map((ins, i) => (
            <View key={i} style={styles.insightCard}>
              <Text style={styles.insightHeadline}>{ins.headline}</Text>
              <Text style={styles.insightDetail}>{ins.detail}</Text>
            </View>
          ))}
        </Card>
      ) : insights?.pending ? (
        <Card style={[styles.section, styles.insightPending]}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.insightPendingText}>Generating AI insights…</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, gap: spacing.md },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text1, letterSpacing: -0.5 },

  rangeRow: { flexDirection: 'row', gap: spacing.sm },
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

  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
    ...shadow.sm,
  },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.text3,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryValue: { fontSize: 15, fontWeight: '800', color: colors.text1 },

  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  merchantRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  merchantRank: { fontSize: 11, color: colors.text3, width: 22, fontWeight: '700', paddingTop: 1 },
  merchantInfo: { flex: 1, gap: 5 },
  merchantNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  merchantName: { fontSize: 13, fontWeight: '600', color: colors.text1, flex: 1, marginRight: spacing.sm },
  merchantAmt: { fontSize: 12, color: colors.text1, fontVariant: ['tabular-nums'], fontWeight: '600' },
  merchantVisits: { fontSize: 10, color: colors.text3 },
  barBg: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },

  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: radius.full, flexShrink: 0 },
  categoryInfo: { flex: 1, gap: 4 },
  categoryName: { fontSize: 13, color: colors.text1 },
  categoryBarBg: { height: 2, backgroundColor: colors.border, borderRadius: 1, overflow: 'hidden' },
  categoryBarFill: { height: '100%', borderRadius: 1 },
  categoryPct: { fontSize: 12, color: colors.text2, fontVariant: ['tabular-nums'], width: 34, textAlign: 'right' },
  categoryAmt: { fontSize: 12, color: colors.text1, fontVariant: ['tabular-nums'], width: 82, textAlign: 'right', fontWeight: '600' },

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
