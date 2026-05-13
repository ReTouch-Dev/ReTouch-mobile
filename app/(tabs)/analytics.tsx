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
import { DonutChart, AreaLineChart, type DonutSlice } from '../../src/components/charts';
import { useTheme, type Colors } from '../../src/hooks/useTheme';
import { radius, shadow, spacing } from '../../src/theme/tokens';
import { formatCurrency } from '../../src/utils/format';
import { insightsRateLimit } from '../../src/lib/insightsRateLimit';
import { usePreferencesStore } from '../../src/store/preferencesStore';

const RANGES = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;
type RangeLabel = typeof RANGES[number]['label'];

const CAT_COLORS = ['#1BC5E3', '#4ADE80', '#FBBF24', '#F87171', '#A78BFA', '#34D399'];

type CatView = 'bars' | 'donut';

function createStyles(colors: Colors) {
  return StyleSheet.create({
    screen:        { flex: 1, backgroundColor: colors.bg },
    scroll:        { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },

    header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.lg, marginBottom: spacing.md },
    title:         { fontSize: 28, fontWeight: '800', color: colors.text1, letterSpacing: -0.5 },

    rangeRow:      { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
    rangeBtn:      { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    rangeBtnOn:    { backgroundColor: colors.primary, borderColor: colors.primary },
    rangeTxt:      { fontSize: 12, fontWeight: '700', color: colors.text2 },
    rangeTxtOn:    { color: colors.bg },

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
    barTrack:      { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    barFill:       { height: '100%', borderRadius: 2 },
    merchantVis:   { fontSize: 11, color: colors.text3 },
    merchantAmt:   { fontSize: 12, fontWeight: '700', color: colors.text1, fontVariant: ['tabular-nums'] },

    catRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
    catDot:        { width: 10, height: 10, borderRadius: 5 },
    catInfo:       { flex: 1, gap: 4 },
    catName:       { fontSize: 13, color: colors.text1, fontWeight: '500' },
    catBarTrack:   { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    catBarFill:    { height: '100%', borderRadius: 2 },
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

export default function AnalyticsScreen() {
  const [range,     setRange]     = useState<RangeLabel>('30d');
  const [catView,   setCatView]   = useState<CatView>('bars');
  const [remaining, setRemaining] = useState(insightsRateLimit.max);
  const insets     = useSafeAreaInsets();
  const { width }  = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const styles     = useMemo(() => createStyles(colors), [colors]);
  const qc         = useQueryClient();
  const insKey     = useRef(0);
  const { homeCurrency } = usePreferencesStore();

  const chartW = width - spacing.xl * 2 - spacing.lg * 2;
  const days   = RANGES.find((r) => r.label === range)?.days ?? 30;

  // Include homeCurrency in all query keys so a currency change triggers a fresh fetch
  const { data: summary,    isLoading: ldSum } = useQuery({ queryKey: ['a-sum', days, homeCurrency], queryFn: () => analyticsApi.summary(days),          staleTime: 5 * 60_000 });
  const { data: merchants  }                   = useQuery({ queryKey: ['a-mer', days, homeCurrency], queryFn: () => analyticsApi.topMerchants(days, 6),   staleTime: 5 * 60_000 });
  const { data: categories }                   = useQuery({ queryKey: ['a-cat', days, homeCurrency], queryFn: () => analyticsApi.categoryBreakdown(days), staleTime: 5 * 60_000 });
  const { data: trends     }                   = useQuery({ queryKey: ['a-trd', days, homeCurrency], queryFn: () => analyticsApi.trendsForDays(days),      staleTime: 5 * 60_000 });
  // Insights are not range-specific and not currency-specific — key is independent of both
  const { data: insights, isLoading: ldIns }   = useQuery({
    queryKey: ['a-ins', insKey.current],
    queryFn:  () => analyticsApi.insights(90),
    staleTime: 4 * 60 * 60_000,
    gcTime:    24 * 60 * 60_000,
  });

  // Derive display currency from server response (it confirms the conversion used)
  const currency = summary?.display_currency ?? homeCurrency ?? 'HKD';

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

  const trendPoints = useMemo(
    () => (trends?.trends ?? []).map((t) => ({ label: t.period, value: t.total_spent })),
    [trends],
  );

  const donutData: DonutSlice[] = useMemo(
    () => (categories?.categories ?? []).slice(0, 6).map((c, i) => ({
      value: c.total_spent,
      color: CAT_COLORS[i % CAT_COLORS.length],
      label: c.category || 'Other',
    })),
    [categories],
  );

  const merList  = merchants?.merchants  ?? [];
  const catList  = categories?.categories ?? [];
  const insList  = insights?.insights    ?? [];
  const maxMerch = merList[0]?.total_spent ?? 1;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        {ldSum && <ActivityIndicator color={colors.primary} size="small" />}
      </View>

      {/* Range selector */}
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

      {/* Hero spend card */}
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

      {/* Spending trend */}
      {trendPoints.length > 1 && (
        <View style={styles.section}>
          <View style={styles.sectionTop}>
            <Text style={styles.sectionTitle}>Spending Over Time</Text>
            <View style={styles.sectionIcon}>
              <Ionicons name="analytics-outline" size={14} color={colors.primary} />
            </View>
          </View>
          <AreaLineChart data={trendPoints} width={chartW} height={120} color={colors.primary} />
        </View>
      )}

      {/* Top merchants */}
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
            <View key={m.merchant}>
              <View style={styles.merchantRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankTxt}>{i + 1}</Text>
                </View>
                <View style={styles.merchantInfo}>
                  <View style={styles.merchantMeta}>
                    <Text style={styles.merchantName} numberOfLines={1}>{m.merchant}</Text>
                    <Text style={styles.merchantAmt}>{formatCurrency(m.total_spent, currency)}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, {
                      width: `${Math.max(6, (m.total_spent / maxMerch) * 100)}%`,
                      backgroundColor: CAT_COLORS[i % CAT_COLORS.length],
                    }]} />
                  </View>
                  <Text style={styles.merchantVis}>{m.visits} visit{m.visits !== 1 ? 's' : ''}</Text>
                </View>
              </View>
              {i < merList.length - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionTop}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.viewToggle}>
            {(['bars', 'donut'] as CatView[]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.togglePill, catView === v && styles.togglePillOn]}
                onPress={() => setCatView(v)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleTxt, catView === v && styles.toggleTxtOn]}>
                  {v === 'bars' ? 'Bars' : 'Donut'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {catList.length === 0 ? (
          <Text style={styles.emptyTxt}>No data for this period</Text>
        ) : catView === 'donut' ? (
          <DonutChart
            data={donutData}
            size={170}
            centerLabel={formatCurrency(summary?.total_spent, currency)}
            centerSub="total"
          />
        ) : (
          catList.slice(0, 6).map((c, i) => (
            <View key={c.category}>
              <View style={styles.catRow}>
                <View style={[styles.catDot, { backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
                <View style={styles.catInfo}>
                  <Text style={styles.catName} numberOfLines={1}>{c.category || 'Other'}</Text>
                  <View style={styles.catBarTrack}>
                    <View style={[styles.catBarFill, {
                      width: `${c.percentage}%`,
                      backgroundColor: CAT_COLORS[i % CAT_COLORS.length],
                    }]} />
                  </View>
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

      {/* AI Insights */}
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
              <View key={i}>
                <View style={styles.insightItem}>
                  <Text style={styles.insightHdl}>{ins.headline}</Text>
                  <Text style={styles.insightDtl}>{ins.detail}</Text>
                </View>
                {i < insList.length - 1 && <View style={styles.divider} />}
              </View>
            ))}

            <View style={styles.insightFooter}>
              <Text style={styles.insightMeta}>{remaining}/{insightsRateLimit.max} refreshes today</Text>
              <TouchableOpacity
                style={[styles.refreshBtn, remaining === 0 && styles.refreshBtnOff]}
                onPress={handleRefresh}
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
