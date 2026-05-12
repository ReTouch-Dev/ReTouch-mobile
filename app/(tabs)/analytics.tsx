import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { analyticsApi } from '../../src/api/analytics';
import { Card } from '../../src/components/ui';
import { DonutChart, AreaLineChart, type DonutSlice } from '../../src/components/charts';
import { useTheme, type Colors } from '../../src/hooks/useTheme';
import { radius, shadow, spacing } from '../../src/theme/tokens';
import { formatCurrency } from '../../src/utils/format';
import { insightsRateLimit } from '../../src/lib/insightsRateLimit';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RANGES = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;
type RangeLabel = typeof RANGES[number]['label'];

const CATEGORY_COLORS = ['#1BC5E3', '#4ADE80', '#FBBF24', '#F87171', '#A78BFA', '#34D399'];

type CategoryView = 'bars' | 'donut';

// ---------------------------------------------------------------------------
// Styles factory
// ---------------------------------------------------------------------------

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: colors.bg },
    content:     { paddingHorizontal: spacing.xl, gap: spacing.md },

    titleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.lg },
    title:       { fontSize: 28, fontWeight: '800', color: colors.text1, letterSpacing: -0.5 },

    rangeRow:    { flexDirection: 'row', gap: spacing.sm },
    rangeBtn:    { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.lg, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    rangeBtnOn:  { backgroundColor: colors.primary, borderColor: colors.primary },
    rangeBtnTxt: { fontSize: 13, fontWeight: '700', color: colors.text2 },
    rangeBtnTxtOn:{ color: colors.bg },

    summaryRow:  { flexDirection: 'row', gap: spacing.sm },
    summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 4, ...shadow.sm },
    summaryIcon: { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    summaryLbl:  { fontSize: 9, color: colors.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
    summaryVal:  { fontSize: 14, fontWeight: '800', color: colors.text1 },

    section:     { gap: spacing.sm },
    sectionHdr:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
    sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    sectionTitle:{ fontSize: 12, fontWeight: '700', color: colors.text1, textTransform: 'uppercase', letterSpacing: 0.6 },

    viewToggle:  { flexDirection: 'row', gap: 4 },
    toggleBtn:   { paddingVertical: 3, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHigh },
    toggleBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    toggleTxt:   { fontSize: 10, fontWeight: '700', color: colors.text3 },
    toggleTxtOn: { color: colors.bg },

    merchantRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    merchantRank:    { fontSize: 11, color: colors.text3, width: 20, fontWeight: '700', paddingTop: 1 },
    merchantInfo:    { flex: 1, gap: 4 },
    merchantNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    merchantName:    { fontSize: 13, fontWeight: '600', color: colors.text1, flex: 1, marginRight: spacing.sm },
    merchantAmt:     { fontSize: 12, color: colors.text1, fontVariant: ['tabular-nums'], fontWeight: '600' },
    merchantVisits:  { fontSize: 10, color: colors.text3 },
    barBg:           { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    barFill:         { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },

    categoryRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    catDot:          { width: 9, height: 9, borderRadius: radius.full, flexShrink: 0 },
    catInfo:         { flex: 1, gap: 3 },
    catName:         { fontSize: 13, color: colors.text1 },
    catBarBg:        { height: 2, backgroundColor: colors.border, borderRadius: 1, overflow: 'hidden' },
    catBarFill:      { height: '100%', borderRadius: 1 },
    catPct:          { fontSize: 12, color: colors.text2, fontVariant: ['tabular-nums'], width: 34, textAlign: 'right' },
    catAmt:          { fontSize: 12, color: colors.text1, fontVariant: ['tabular-nums'], width: 80, textAlign: 'right', fontWeight: '600' },

    insightCard:        { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, gap: 4, borderWidth: 1, borderColor: colors.primary + '33' },
    insightHeadline:    { fontSize: 13, fontWeight: '700', color: colors.primary },
    insightDetail:      { fontSize: 12, color: colors.text2, lineHeight: 18 },
    insightFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
    insightMeta:        { fontSize: 10, color: colors.text3 },
    refreshBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary + '55', backgroundColor: colors.primaryLight },
    refreshBtnDisabled: { borderColor: colors.border, backgroundColor: colors.surface },
    refreshBtnTxt:      { fontSize: 11, fontWeight: '700', color: colors.primary },
    refreshBtnTxtOff:   { color: colors.text3 },

    pendingCard:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
    pendingTxt:   { color: colors.text2, fontSize: 13 },
    empty:        { fontSize: 13, color: colors.text3, textAlign: 'center', paddingVertical: spacing.sm },
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={styles.summaryVal} numberOfLines={1}>{value}</Text>
      <Text style={styles.summaryLbl}>{label}</Text>
    </View>
  );
}

function SectionHeader({
  icon, title, toggle, view, onToggle,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  toggle?: Array<{ key: string; label: string }>;
  view?: string;
  onToggle?: (key: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.sectionHdr}>
      <View style={styles.sectionLeft}>
        <Ionicons name={icon} size={14} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {toggle && (
        <View style={styles.viewToggle}>
          {toggle.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.toggleBtn, view === t.key && styles.toggleBtnOn]}
              onPress={() => onToggle?.(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleTxt, view === t.key && styles.toggleTxtOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function AnalyticsScreen() {
  const [range, setRange] = useState<RangeLabel>('30d');
  const [catView, setCatView] = useState<CategoryView>('bars');
  const [remaining, setRemaining] = useState(insightsRateLimit.max);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const insightsKey = useRef(0);

  const chartWidth = screenWidth - spacing.xl * 2 - spacing.xl * 2; // screen - outer pad - card pad

  const days = RANGES.find((r) => r.label === range)?.days ?? 30;

  const { data: summary,    isLoading: ldSum  } = useQuery({ queryKey: ['analytics-summary',    days], queryFn: () => analyticsApi.summary(days),           staleTime: 5 * 60_000 });
  const { data: merchants,  isLoading: ldMer  } = useQuery({ queryKey: ['analytics-merchants',  days], queryFn: () => analyticsApi.topMerchants(days, 6),    staleTime: 5 * 60_000 });
  const { data: categories, isLoading: ldCat  } = useQuery({ queryKey: ['analytics-categories', days], queryFn: () => analyticsApi.categoryBreakdown(days),  staleTime: 5 * 60_000 });
  const { data: trends,     isLoading: ldTrend } = useQuery({ queryKey: ['analytics-trends',     days], queryFn: () => analyticsApi.trendsForDays(days),       staleTime: 5 * 60_000 });
  const { data: insights,   isLoading: ldIns  } = useQuery({
    queryKey: ['analytics-insights', days, insightsKey.current],
    queryFn:  () => analyticsApi.insights(days),
    staleTime: 4 * 60 * 60_000, // 4 hours — insights are expensive
    gcTime:    24 * 60 * 60_000,
  });

  const loading = ldSum || ldMer || ldCat || ldTrend;

  useEffect(() => {
    insightsRateLimit.getRemaining().then(setRemaining);
  }, [insightsKey.current]);

  const handleRefreshInsights = useCallback(async () => {
    if (!(await insightsRateLimit.canRefresh())) return;
    await insightsRateLimit.recordRefresh();
    insightsKey.current += 1;
    queryClient.invalidateQueries({ queryKey: ['analytics-insights', days] });
    setRemaining(await insightsRateLimit.getRemaining());
  }, [days, queryClient]);

  // Trend data for line chart
  const trendPoints = useMemo(
    () => (trends?.trends ?? []).map((t) => ({ label: t.period, value: t.total_spent })),
    [trends],
  );

  // Donut data for categories
  const donutData: DonutSlice[] = useMemo(
    () => (categories?.categories ?? []).slice(0, 6).map((c, i) => ({
      value: c.total_spent,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      label: c.category || 'Other',
    })),
    [categories],
  );

  const totalSpentLabel = formatCurrency(summary?.total_spent);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing['4xl'] }]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>Analytics</Text>
        {loading && <ActivityIndicator color={colors.primary} size="small" />}
      </View>

      {/* Range selector */}
      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity key={r.label} style={[styles.rangeBtn, range === r.label && styles.rangeBtnOn]}
            onPress={() => setRange(r.label)} activeOpacity={0.7}>
            <Text style={[styles.rangeBtnTxt, range === r.label && styles.rangeBtnTxtOn]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <SummaryCard label="Total spent"   value={formatCurrency(summary?.total_spent)}         icon="card-outline" />
        <SummaryCard label="Transactions"  value={String(summary?.total_receipts ?? '—')}       icon="receipt-outline" />
        <SummaryCard label="Avg. spend"    value={formatCurrency(summary?.average_transaction)} icon="trending-up-outline" />
      </View>

      {/* Spending Trends */}
      {trendPoints.length > 1 && (
        <Card style={styles.section}>
          <SectionHeader icon="analytics-outline" title="Spending Trends" />
          <AreaLineChart
            data={trendPoints}
            width={chartWidth}
            height={130}
            color={colors.primary}
          />
        </Card>
      )}

      {/* Top Merchants */}
      <Card style={styles.section}>
        <SectionHeader icon="storefront-outline" title="Top Merchants" />
        {(merchants?.merchants ?? []).length === 0 ? (
          <Text style={styles.empty}>No data yet</Text>
        ) : (
          (merchants?.merchants ?? []).map((m, i) => {
            const maxS = merchants!.merchants[0]?.total_spent ?? 1;
            const pct = Math.max(4, (m.total_spent / maxS) * 100);
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

      {/* Categories */}
      <Card style={styles.section}>
        <SectionHeader
          icon="pie-chart-outline"
          title="Categories"
          toggle={[{ key: 'bars', label: 'Bars' }, { key: 'donut', label: 'Donut' }]}
          view={catView}
          onToggle={(k) => setCatView(k as CategoryView)}
        />
        {(categories?.categories ?? []).length === 0 ? (
          <Text style={styles.empty}>No data yet</Text>
        ) : catView === 'donut' ? (
          <DonutChart
            data={donutData}
            size={160}
            centerLabel={totalSpentLabel}
            centerSub="total"
          />
        ) : (
          (categories?.categories ?? []).slice(0, 6).map((c, i) => (
            <View key={c.category} style={styles.categoryRow}>
              <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }]} />
              <View style={styles.catInfo}>
                <Text style={styles.catName} numberOfLines={1}>{c.category || 'Other'}</Text>
                <View style={styles.catBarBg}>
                  <View style={[styles.catBarFill, { width: `${c.percentage}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }]} />
                </View>
              </View>
              <Text style={styles.catPct}>{c.percentage.toFixed(0)}%</Text>
              <Text style={styles.catAmt}>{formatCurrency(c.total_spent)}</Text>
            </View>
          ))
        )}
      </Card>

      {/* AI Insights */}
      <Card style={styles.section}>
        <SectionHeader icon="sparkles" title="AI Insights" />

        {ldIns ? (
          <View style={styles.pendingCard}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.pendingTxt}>Generating insights…</Text>
          </View>
        ) : insights?.pending ? (
          <View style={styles.pendingCard}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.pendingTxt}>Generating AI insights…</Text>
          </View>
        ) : (
          <>
            {(insights?.insights ?? []).map((ins, i) => (
              <View key={i} style={styles.insightCard}>
                <Text style={styles.insightHeadline}>{ins.headline}</Text>
                <Text style={styles.insightDetail}>{ins.detail}</Text>
              </View>
            ))}
            <View style={styles.insightFooter}>
              <Text style={styles.insightMeta}>
                {remaining}/{insightsRateLimit.max} refreshes left today
              </Text>
              <TouchableOpacity
                style={[styles.refreshBtn, remaining === 0 && styles.refreshBtnDisabled]}
                onPress={handleRefreshInsights}
                disabled={remaining === 0}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={11} color={remaining > 0 ? colors.primary : colors.text3} />
                <Text style={[styles.refreshBtnTxt, remaining === 0 && styles.refreshBtnTxtOff]}>
                  {remaining > 0 ? 'Refresh' : 'Limit reached'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Card>
    </ScrollView>
  );
}
