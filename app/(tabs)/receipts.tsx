import { useMemo, useState, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { receiptsApi, type ReceiptListItem } from '../../src/api/receipts';
import { Avatar, Badge, EmptyState, ReceiptCardSkeleton } from '../../src/components/ui';
import { useTheme, type Colors } from '../../src/hooks/useTheme';
import { radius, shadow, spacing } from '../../src/theme/tokens';
import { formatCurrency, formatRelativeDate, getInitial } from '../../src/utils/format';

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: colors.bg },
    header:      { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
    titleRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title:       { fontSize: 28, fontWeight: '800', color: colors.text1, letterSpacing: -0.5 },
    countBadge:  { backgroundColor: colors.primaryLight, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    countText:   { fontSize: 12, fontWeight: '700', color: colors.primary },
    searchWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingRight: spacing.sm },
    searchIcon:  { paddingLeft: spacing.md },
    search:      { flex: 1, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm, fontSize: 14, color: colors.text1 },
    clearBtn:    { padding: spacing.xs },
    skeletonWrap:{ paddingHorizontal: spacing.xl, marginTop: spacing.xs },
    listCard:    { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
    list:        { paddingTop: spacing.xs },
    cardWrapper: { backgroundColor: colors.surface, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
    cardFirst:   { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1 },
    cardLast:    { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, borderBottomWidth: 1 },
    card:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2, gap: spacing.md },
    cardBody:    { flex: 1, gap: 3 },
    merchant:    { fontSize: 14, fontWeight: '600', color: colors.text1 },
    date:        { fontSize: 12, color: colors.text3 },
    cardRight:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    amount:      { fontSize: 14, fontWeight: '700', color: colors.text1, fontVariant: ['tabular-nums'] },
    separator:   { height: 1, backgroundColor: colors.divider },
    center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    errText:     { color: colors.error, fontSize: 14 },
    retryBtn:    { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
    retryText:   { color: colors.bg, fontWeight: '600', fontSize: 13 },
  });
}

function ReceiptCard({ item }: { item: ReceiptListItem }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const merchant = item.ocr?.merchant ?? 'Receipt';
  const total = item.ocr?.total != null ? formatCurrency(item.ocr.total) : null;
  const date = formatRelativeDate(item.ocr?.date ?? item.created_at);
  const isPending = item.upload_status !== 'completed' || item.ocr?.status === 'processing';
  const initial = getInitial(merchant, 'R');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/receipt/${item.receipt_id}`)}
      activeOpacity={0.7}
    >
      <Avatar initial={initial} size={44} shape="rounded" />
      <View style={styles.cardBody}>
        <Text style={styles.merchant} numberOfLines={1}>{merchant}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <View style={styles.cardRight}>
        {isPending ? (
          <Badge label="Processing" variant="processing" />
        ) : total ? (
          <Text style={styles.amount}>{total}</Text>
        ) : null}
        <Ionicons name="chevron-forward" size={14} color={colors.text3} />
      </View>
    </TouchableOpacity>
  );
}

export default function ReceiptsScreen() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['receipts', search, page],
    queryFn: () => receiptsApi.list({ page, limit: 30, search }),
  });

  const onRefresh = useCallback(() => { setPage(1); refetch(); }, [refetch]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Receipts</Text>
          {data?.total != null && data.total > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{data.total}</Text>
            </View>
          )}
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={15} color={colors.text3} style={styles.searchIcon} />
          <TextInput
            style={styles.search}
            placeholder="Search by merchant…"
            placeholderTextColor={colors.text3}
            value={search}
            onChangeText={(t) => { setSearch(t); setPage(1); }}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.text3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading && !data ? (
        <View style={styles.skeletonWrap}>
          <View style={[styles.listCard, { overflow: 'hidden' }]}>
            {Array.from({ length: 7 }).map((_, i) => <ReceiptCardSkeleton key={i} />)}
          </View>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.text3} />
          <Text style={styles.errText}>Failed to load receipts</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.results ?? []}
          keyExtractor={(item) => item.receipt_id}
          renderItem={({ item, index }) => (
            <View style={[
              styles.cardWrapper,
              index === 0 && styles.cardFirst,
              index === (data?.results.length ?? 0) - 1 && styles.cardLast,
            ]}>
              <ReceiptCard item={item} />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['2xl'] }]}
          style={{ marginHorizontal: spacing.xl }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="🧾" title="No receipts yet" subtitle="Tap Scan to add your first one" />}
          onEndReached={() => { if (data?.has_next) setPage((p) => p + 1); }}
          onEndReachedThreshold={0.4}
        />
      )}
    </View>
  );
}
