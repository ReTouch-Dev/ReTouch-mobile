/**
 * Analytics screen.
 *
 * Four horizontally-swipeable dashboard pages, each independently scrollable:
 *   0 · Overview   — hero spend card + spending trend chart
 *   1 · Breakdown  — animated donut chart + category bar list
 *   2 · Merchants  — staggered animated bar ranking
 *   3 · Insights   — AI-generated spending insights
 *
 * Bar widths grow from 0 on every data load (merchant + category bars).
 * The donut springs in with a physics-based zoom.
 * The area chart slides up from below.
 */
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
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { analyticsApi } from '../../src/api/analytics';
import type {
  SpendingSummary,
  TopMerchantsResponse,
  CategoryBreakdownResponse,
  InsightsResponse,
} from '../../src/types';
import { DonutChart, AreaLineChart, type DonutSlice } from '../../src/components/charts';
import { AnimatedBar } from '../../src/components/ui';
import { useTheme, type Colors } from '../../src/hooks/useTheme';
import { radius, shadow, spacing } from '../../src/theme/tokens';
import { formatCurrency } from '../../src/utils/format';
import { insightsRateLimit } from '../../src/lib/insightsRateLimit';
import { usePreferencesStore } from '../../src/store/preferencesStore';

// ─── constants ────────────────────────────────────────────────────────────────

const RANGES = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;
type RangeLabel = typeof RANGES[number]['label'];

const CAT_COLORS = ['#1BC5E3', '#4ADE80', '#FBBF24', '#F87171', '#A78BFA', '#34D399'];

const PAGES = [
  { key: 'overview',  label: 'Overview',  icon: 'trending-up-outline'  as const },
  { key: 'breakdown', label: 'Breakdown', icon: 'pie-chart-outline'    as const },
  { key: 'merchants', label: 'Merchants', icon: 'storefront-outline'   as const },
  { key: 'insights',  label: 'Insights',  icon: 'sparkles'             as const },
];

// ─── styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: Colors, pageWidth: number) {
  return StyleSheet.create({
    screen:        { flex: 1, backgroundColor: colors.bg },

    topBar:        { paddingHorizontal: spacing.xl },
    header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.lg, marginBottom: spacing.md },
    title:         { fontSize: 28, fontWeight: '800', color: colors.text1, letterSpacing: -0.5 },

    rangeRow:      { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
    rangeBtn:      { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    rangeBtnOn:    { backgroundColor: colors.primary, borderColor: colors.primary },
    rangeTxt:      { fontSize: 12, fontWeight: '700', color: colors.text2 },
    rangeTxtOn:    { color: colors.bg },

    pageTabBar:    { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
    pageTab:       { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, gap: 3 },
    pageTabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
    pageTabTxt:    { fontSize: 10, fontWeight: '600', color: colors.text3 },
    pageTabTxtOn:  { color: colors.primary },

    page:          { width: pageWidth },
    pageContent:   { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing['4xl'] },

    heroCard:      { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.md, ...shadow.md },
    heroLabel:     { fontSize: 11, fontWeight: '600', color: colors.bg + 'BB', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    heroVal:       { fontSize: 36, fontWeight: '800', color: colors.bg, letterSpacing: -1 },
    heroSub:       { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
    heroSubItem:   { gap: 2 },
    heroSubLbl:    { fontSize: 10, color: colors.bg + 'AA', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
    heroSubVal:    { fontSize: 14, fontWeight: '700', color: colors.bg },

    section:       { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
    sectionTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    sectionTitle:  { fontSize: 14, fontWeight: '700', color: colors.text1 },
    sectionIcon:   { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

    viewToggle:    { flexDirection: 'row', backgroundColor: colors.surfaceHigh, borderRadius: radius.sm, padding: 3, gap: 2 },
    togglePill:    { paddingVertical: 3, paddingHorizontal: spacing.sm, borderRadius: radius.sm - 2 },
    togglePillOn:  { backgroundColor: colors.surface, ...shadow.sm },
    toggleTxt:     { fontSize: 11, fontWeight: '700', color: colors.text3 },
    toggleTxtOn:   { color: colors.text1 },

    merchantRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs + 2 },
    rankBadge:     { width: 22, height: 22, borderRadius: radius.sm, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
    rankTxt:       { fontSize: 10, fontWeight: '800', color: colors.text2 },
    merchantInfo:  { flex: 1, gap: 5 },
    merchantMeta:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    merchantName:  { fontSize: 13, fontWeight: '600', color: colors.text1, flex: 1, paddingRight: spacing.sm },
    merchantVis:   { fontSize: 11, color: colors.text3 },
    merchantAmt:   { fontSize: 12, fontWeight: '700', color: colors.text1, fontVariant: ['tabular-nums'] },

    catRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
    catDot:        { width: 10, height: 10, borderRadius: 5 },
    catInfo:       { flex: 1, gap: 4 },
    catName:       { fontSize: 13, color: colors.text1, fontWeight: '500' },
    catRight:      { alignItems: 'flex-end', gap: 1 },
    catPct:        { fontSize: 11, fontWeight: '700', color: colors.text2, fontVariant: ['tabular-nums'] },
    catAmt:        { fontSize: 11, color: colors.text3, fontVariant: ['tabular-nums'] },

    insightItem:   { paddingVertical: spacing.sm, gap: 3 },
    insightHdl:    { fontSize: 13, fontWeight: '700', color: colors.text1 },
    insightDtl:    { fontSize: 12, color: colors.text2, lineHeight: 18 },
    insightFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
    insightMeta:   { fontSize: 11, color: colors.text3 },
    refreshBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary + '44' },
    refreshBtnOff: { backgroundColor: colors.surfaceHigh, borderColor: colors.border },
    refreshTxt:    { fontSize: 11, fontWeight: '700', color: colors.primary },
    refreshTxtOff: { color: colors.text3 },

    divider:       { height: 1, backgroundColor: colors.divider, marginVertical: 2 },
    emptyTxt:      { fontSize: 13, color: colors.text3, textAlign: 'center', paddingVertical: spacing.md },
    pendingRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
    pendingTxt:    { fontSize: 13, color: colors.text2 },
  });
}

type Styles = ReturnType<typeof createStyles>;
type CatView = 'donut' | 'bars';

// ─── page components ──────────────────────────────────────────────────────────

function OverviewPage({ summary, trendPoints, currency, chartW, styles }: {
  summary:     SpendingSummary | undefined;
  trendPoints: { label: string; value: number }[];
  currency:    string;
  chartW:      number;
  styles:      Styles;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.pageContent} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total spent</Text>
          <Text style={styles.heroVal}>{formatCurrency(summary?.total_spent, currency)}</Text>
          <View style={styles.heroSub}>
            <View style={styles.heroSubItem}>
              <Text style={styles.heroSubLbl}>Transactions</Text>
              <Text style={styles.heroSubVal}>{summary?.total_receipts ?? '—'}</Text>
            </View>
            <View style={styles.heroSubItem}>
              <Text style={styles.heroSubLbl}>Avg. per receipt</Text>
              <Text style={styles.heroSubVal}>{formatCurrency(summary?.average_transaction, currency)}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {trendPoints.length > 1 && (
        <View style={styles.section}>
          <View style={styles.sectionTop}>
            <Text style={styles.sectionTitle}>Spending Over Time</Text>
            <View style={styles.sectionIcon}>
              <Ionicons name="analytics-outline" size={14} color={colors.primary} />
            </View>
          </View>
          <AreaLineChart data={trendPoints} width={chartW} height={130} color={colors.primary} />
        </View>
      )}
    </ScrollView>
  );
}

function BreakdownPage({ categories, summary, currency, styles }: {
  categories: CategoryBreakdownResponse | undefined;
  summary:    SpendingSummary | undefined;
  currency:   string;
  styles:     Styles;
}) {
  const { colors } = useTheme();
  const [catView, setCatView] = useState<CatView>('donut');
  const catList = categories?.categories ?? [];

  const donutData: DonutSlice[] = useMemo(
    () => catList.slice(0, 6).map((c, i) => ({
      value: c.total_spent,
      color: CAT_COLORS[i % CAT_COLORS.length],
      label: c.category || 'Other',
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catList.length, categories],
  );

  return (
    <ScrollView contentContainerStyle={styles.pageContent} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.sectionTop}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.viewToggle}>
            {(['donut', 'bars'] as CatView[]).map((v) => (
              <TouchableOpacity key={v} style={[styles.togglePill, catView === v && styles.togglePillOn]} onPress={() => setCatView(v)} activeOpacity={0.7}>
                <Text style={[styles.toggleTxt, catView === v && styles.toggleTxtOn]}>{v === 'bars' ? 'Bars' : 'Donut'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {catList.length === 0 ? (
          <Text style={styles.emptyTxt}>No data for this period</Text>
        ) : catView === 'donut' ? (
          <DonutChart data={donutData} size={180} centerLabel={formatCurrency(summary?.total_spent, currency)} centerSub="total" />
        ) : (
          catList.slice(0, 6).map((c, i) => (
            <View key={c.category}>
              <View style={styles.catRow}>
                <View style={[styles.catDot, { backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
                <View style={styles.catInfo}>
                  <Text style={styles.catName} numberOfLines={1}>{c.category || 'Other'}</Text>
                  <AnimatedBar
                    percentage={c.percentage}
                    color={CAT_COLORS[i % CAT_COLORS.length]}
                    delay={i * 80}
                    height={3}
                    trackColor={colors.border}
                  />
                </View>
                <View style={styles.catRight}>
                  <Text style={styles.catPct}>{c.percentage.toFixed(0)}%</Text>
                  <Text style={styles.catAmt}>{formatCurrency(c.total_spent, currency)}</Text>
                </View>
              </View>
              {i < Math.min(catList.length, 6) - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function MerchantsPage({ merchants, currency, styles }: {
  merchants: TopMerchantsResponse | undefined;
  currency:  string;
  styles:    Styles;
}) {
  const { colors } = useTheme();
  const merList  = merchants?.merchants ?? [];
  const maxMerch = merList[0]?.total_spent ?? 1;

  return (
    <ScrollView contentContainerStyle={styles.pageContent} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.sectionTop}>
          <Text style={styles.sectionTitle}>Top Merchants</Text>
          <View style={styles.sectionIcon}>
            <Ionicons name="storefront-outline" size={14} color={colors.primary} />
          </View>
        </View>

        {merList.length === 0 ? (
          <Text style={styles.emptyTxt}>No data for this period</Text>
        ) : (
          merList.map((m, i) => (
            <Animated.View key={m.merchant} entering={FadeIn.delay(i * 60).duration(300)}>
              <View style={styles.merchantRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankTxt}>{i + 1}</Text>
                </View>
                <View style={styles.merchantInfo}>
                  <View style={styles.merchantMeta}>
                    <Text style={styles.merchantName} numberOfLines={1}>{m.merchant}</Text>
                    <Text style={styles.merchantAmt}>{formatCurrency(m.total_spent, currency)}</Text>
                  </View>
                  <AnimatedBar
                    percentage={Math.max(6, (m.total_spent / maxMerch) * 100)}
                    color={CAT_COLORS[i % CAT_COLORS.length]}
                    delay={i * 80}
                    height={4}
                    trackColor={colors.border}
                  />
                  <Text style={styles.merchantVis}>{m.visits} visit{m.visits !== 1 ? 's' : ''}</Text>
                </View>
              </View>
              {i < merList.length - 1 && <View style={styles.divider} />}
            </Animated.View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function InsightsPage({ insights, ldIns, remaining, onRefresh, styles }: {
  insights:  InsightsResponse | undefined;
  ldIns:     boolean;
  remaining: number;
  onRefresh: () => void;
  styles:    Styles;
}) {
  const { colors } = useTheme();
  const insList = insights?.insights ?? [];

  return (
    <ScrollView contentContainerStyle={styles.pageContent} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.sectionTop}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          <View style={styles.sectionIcon}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
          </View>
        </View>

        {ldIns || insights?.pending ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.pendingTxt}>Generating insights…</Text>
          </View>
        ) : insList.length === 0 ? (
          <Text style={styles.emptyTxt}>No insights yet — add more receipts</Text>
        ) : (
          <>
            {insList.map((ins, i) => (
              <Animated.View key={i} entering={FadeInDown.delay(i * 80).duration(300)}>
                <View style={styles.insightItem}>
                  <Text style={styles.insightHdl}>{ins.headline}</Text>
                  <Text style={styles.insightDtl}>{ins.detail}</Text>
                </View>
                {i < insList.length - 1 && <View style={styles.divider} />}
              </Animated.View>
            ))}
            <View style={styles.insightFooter}>
              <Text style={styles.insightMeta}>{remaining}/{insightsRateLimit.max} refreshes today</Text>
              <TouchableOpacity
                style={[styles.refreshBtn, remaining === 0 && styles.refreshBtnOff]}
                onPress={onRefresh}
                disabled={remaining === 0}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={11} color={remaining > 0 ? colors.primary : colors.text3} />
                <Text style={[styles.refreshTxt, remaining === 0 && styles.refreshTxtOff]}>
                  {remaining > 0 ? 'Refresh' : 'Limit reached'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const [range,     setRange]     = useState<RangeLabel>('30d');
  const [page,      setPage]      = useState(0);
  const [remaining, setRemaining] = useState(insightsRateLimit.max);

  const insets     = useSafeAreaInsets();
  const { width }  = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const styles     = useMemo(() => createStyles(colors, width), [colors, width]);
  const qc         = useQueryClient();
  const insKey     = useRef(0);
  const hScrollRef = useRef<ScrollView>(null);
  const { homeCurrency } = usePreferencesStore();

  const chartW = width - spacing.xl * 2 - spacing.lg * 2;
  const days   = RANGES.find((r) => r.label === range)?.days ?? 30;

  // Include homeCurrency in query keys so a currency change triggers fresh data
  const { data: summary,    isLoading: ldSum } = useQuery({ queryKey: ['a-sum', days, homeCurrency], queryFn: () => analyticsApi.summary(days),          staleTime: 5 * 60_000 });
  const { data: merchants  }                   = useQuery({ queryKey: ['a-mer', days, homeCurrency], queryFn: () => analyticsApi.topMerchants(days, 6),   staleTime: 5 * 60_000 });
  const { data: categories }                   = useQuery({ queryKey: ['a-cat', days, homeCurrency], queryFn: () => analyticsApi.categoryBreakdown(days), staleTime: 5 * 60_000 });
  const { data: trends     }                   = useQuery({ queryKey: ['a-trd', days, homeCurrency], queryFn: () => analyticsApi.trendsForDays(days),      staleTime: 5 * 60_000 });
  // Insights are not range- or currency-specific; key tracks manual refresh
  const { data: insights,  isLoading: ldIns }  = useQuery({
    queryKey: ['a-ins', insKey.current],
    queryFn:  () => analyticsApi.insights(90),
    staleTime: 4 * 60 * 60_000,
    gcTime:    24 * 60 * 60_000,
  });

  const currency = summary?.display_currency ?? homeCurrency ?? 'HKD';

  const trendPoints = useMemo(
    () => (trends?.trends ?? []).map((t) => ({ label: t.period, value: t.total_spent })),
    [trends],
  );

  useEffect(() => {
    insightsRateLimit.getRemaining().then(setRemaining);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insKey.current]);

  const handleRefresh = useCallback(async () => {
    if (!(await insightsRateLimit.canRefresh())) return;
    await insightsRateLimit.recordRefresh();
    insKey.current += 1;
    qc.invalidateQueries({ queryKey: ['a-ins'] });
    setRemaining(await insightsRateLimit.getRemaining());
  }, [qc]);

  const goToPage = (i: number) => {
    setPage(i);
    hScrollRef.current?.scrollTo({ x: i * width, animated: true });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Fixed top bar: title + range selector */}
      <View style={styles.topBar}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          {ldSum && <ActivityIndicator color={colors.primary} size="small" />}
        </View>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.label}
              style={[styles.rangeBtn, range === r.label && styles.rangeBtnOn]}
              onPress={() => setRange(r.label)}
              activeOpacity={0.7}
            >
              <Text style={[styles.rangeTxt, range === r.label && styles.rangeTxtOn]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Page tab bar with icon + label per page */}
      <View style={styles.pageTabBar}>
        {PAGES.map((p, i) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.pageTab, page === i && styles.pageTabActive]}
            onPress={() => goToPage(i)}
            activeOpacity={0.7}
          >
            <Ionicons name={p.icon} size={14} color={page === i ? colors.primary : colors.text3} />
            <Text style={[styles.pageTabTxt, page === i && styles.pageTabTxtOn]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Horizontal swipeable pages — each page is an independent ScrollView */}
      <ScrollView
        ref={hScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        onMomentumScrollEnd={(e) => {
          setPage(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      >
        <View style={styles.page}>
          <OverviewPage summary={summary} trendPoints={trendPoints} currency={currency} chartW={chartW} styles={styles} />
        </View>
        <View style={styles.page}>
          <BreakdownPage categories={categories} summary={summary} currency={currency} styles={styles} />
        </View>
        <View style={styles.page}>
          <MerchantsPage merchants={merchants} currency={currency} styles={styles} />
        </View>
        <View style={styles.page}>
          <InsightsPage insights={insights} ldIns={ldIns} remaining={remaining} onRefresh={handleRefresh} styles={styles} />
        </View>
      </ScrollView>
    </View>
  );
}
