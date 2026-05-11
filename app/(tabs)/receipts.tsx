import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { receiptsApi, type ReceiptListItem } from '../../src/api/receipts';
import { colors, spacing, radius, shadow } from '../../src/theme/tokens';

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-HK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmount(v: number | null) {
  if (v == null) return '';
  return `HK$${v.toFixed(2)}`;
}

function ReceiptCard({ item }: { item: ReceiptListItem }) {
  const router = useRouter();
  const merchant = item.ocr?.merchant ?? 'Receipt';
  const date = item.ocr?.date ? formatDate(item.ocr.date) : formatDate(item.created_at);
  const total = formatAmount(item.ocr?.total ?? null);
  const pending = item.upload_status !== 'completed' || item.ocr?.status === 'processing';
  const initial = merchant[0]?.toUpperCase() ?? 'R';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/receipt/${item.receipt_id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.merchant} numberOfLines={1}>{merchant}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        {pending ? (
          <View style={styles.processingBadge}>
            <Text style={styles.processingText}>Processing</Text>
          </View>
        ) : total ? (
          <Text style={styles.amount}>{total}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

export default function ReceiptsScreen() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const insets = useSafeAreaInsets();

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['receipts', search, page],
    queryFn: () => receiptsApi.list({ page, limit: 30, search }),
  });

  const onRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Receipts</Text>
        {data?.total != null && data.total > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{data.total}</Text>
          </View>
        )}
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search by merchant…"
          placeholderTextColor={colors.text3}
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(1); }}
          returnKeyType="search"
        />
      </View>

      {isLoading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errText}>Failed to load receipts</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.results ?? []}
          keyExtractor={(item) => item.receipt_id}
          renderItem={({ item }) => <ReceiptCard item={item} />}
          ItemSeparatorComponent={ListSeparator}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['2xl'] }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTitle}>No receipts yet</Text>
              <Text style={styles.emptySubtitle}>Tap Scan to add your first one</Text>
            </View>
          }
          onEndReached={() => { if (data?.has_next) setPage((p) => p + 1); }}
          onEndReachedThreshold={0.4}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text1, letterSpacing: -0.5 },
  countBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  searchWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    fontSize: 14,
    color: colors.text1,
  },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs },
  separator: { height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.md },
  card: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  cardBody: { flex: 1, gap: 3 },
  merchant: { fontSize: 14, fontWeight: '600', color: colors.text1 },
  date: { fontSize: 12, color: colors.text3 },
  cardRight: { alignItems: 'flex-end', minWidth: 70 },
  amount: { fontSize: 14, fontWeight: '700', color: colors.text1, fontVariant: ['tabular-nums'] },
  processingBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  processingText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'], gap: spacing.sm },
  emptyIcon: { fontSize: 40, marginBottom: spacing.sm },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text1 },
  emptySubtitle: { fontSize: 14, color: colors.text2 },
  errText: { color: colors.error, fontSize: 14 },
  retryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  retryText: { color: colors.bg, fontWeight: '600', fontSize: 13 },
});
