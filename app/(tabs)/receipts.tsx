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
} from 'react-native';
import { useRouter } from 'expo-router';
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/receipt/${item.receipt_id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{merchant[0]?.toUpperCase() ?? 'R'}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.merchant} numberOfLines={1}>{merchant}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        {pending ? (
          <Text style={styles.processing}>Processing…</Text>
        ) : (
          <Text style={styles.amount}>{total}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ReceiptsScreen() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['receipts', search, page],
    queryFn: () => receiptsApi.list({ page, limit: 30, search }),
  });

  const onRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Receipts</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search merchant or date…"
          placeholderTextColor={colors.text3}
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(1); }}
          returnKeyType="search"
        />
      </View>

      {isLoading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
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
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No receipts yet. Tap Scan to add one.</Text>
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
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing['2xl'], paddingBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: colors.text1 },
  searchWrap: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  search: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    fontSize: 14,
    color: colors.text1,
  },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'], gap: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  cardBody: { flex: 1, gap: 2 },
  merchant: { fontSize: 14, fontWeight: '600', color: colors.text1 },
  date: { fontSize: 12, color: colors.text3 },
  cardRight: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '700', color: colors.text1, fontVariant: ['tabular-nums'] },
  processing: { fontSize: 12, color: colors.text3, fontStyle: 'italic' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: colors.text3, fontSize: 14 },
  errText: { color: colors.error, fontSize: 14 },
  retryBtn: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
  retryText: { color: colors.white, fontWeight: '600', fontSize: 13 },
});
