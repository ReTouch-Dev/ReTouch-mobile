import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { receiptsApi } from '../../src/api/receipts';
import { colors, spacing, radius, shadow } from '../../src/theme/tokens';

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function formatCurrency(v: number | null | undefined) {
  if (v == null) return null;
  return `HK$${v.toFixed(2)}`;
}

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: receipt, isLoading, error, refetch } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => receiptsApi.detail(id),
    enabled: !!id,
    refetchInterval: (q) => {
      const status = q.state.data?.ocr_status;
      return status === 'processing' || status == null ? 5000 : false;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !receipt) {
    return (
      <View style={styles.center}>
        <Text style={styles.errText}>Failed to load receipt</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPending = receipt.ocr_status === 'processing' || receipt.ocr_status == null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Receipt image */}
      {receipt.image_url && (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: receipt.image_url }}
            style={styles.image}
            contentFit="contain"
            transition={200}
          />
        </View>
      )}

      {/* Processing banner */}
      {isPending && (
        <View style={styles.processingBanner}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.processingText}>Extracting receipt data…</Text>
        </View>
      )}

      {/* Merchant summary */}
      {receipt.merchant_name && (
        <View style={styles.card}>
          <Text style={styles.merchantName}>{receipt.merchant_name}</Text>
          {receipt.merchant_address && (
            <Text style={styles.merchantAddr}>{receipt.merchant_address}</Text>
          )}
          {receipt.total != null && (
            <Text style={styles.total}>{formatCurrency(receipt.total)}</Text>
          )}
        </View>
      )}

      {/* Receipt details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Row label="Date" value={receipt.transaction_date} />
        <Row label="Time" value={receipt.transaction_time} />
        <Row label="Category" value={receipt.category} />
        <Row label="Payment" value={receipt.payment_method} />
        <Row label="Subtotal" value={formatCurrency(receipt.subtotal)} />
        <Row label="Tax" value={formatCurrency(receipt.tax)} />
        <Row label="Total" value={formatCurrency(receipt.total)} />
      </View>

      {/* Line items */}
      {receipt.line_items && receipt.line_items.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items</Text>
          {receipt.line_items.map((item, i) => (
            <View key={i} style={styles.lineItem}>
              <View style={styles.lineItemLeft}>
                <Text style={styles.lineItemName}>{item.item_name ?? '—'}</Text>
                {item.quantity != null && item.quantity !== 1 && (
                  <Text style={styles.lineItemQty}>×{item.quantity}</Text>
                )}
              </View>
              {item.total_price != null && (
                <Text style={styles.lineItemPrice}>{formatCurrency(item.total_price)}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing['4xl'], gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  imageWrap: { backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden', height: 280, ...shadow.md },
  image: { width: '100%', height: '100%' },
  processingBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md },
  processingText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, ...shadow.sm, gap: spacing.sm },
  merchantName: { fontSize: 20, fontWeight: '700', color: colors.text1 },
  merchantAddr: { fontSize: 12, color: colors.text2 },
  total: { fontSize: 28, fontWeight: '700', color: colors.primary, marginTop: spacing.sm },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  rowLabel: { fontSize: 13, color: colors.text2 },
  rowValue: { fontSize: 13, fontWeight: '600', color: colors.text1 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: spacing.xs },
  lineItemLeft: { flex: 1, gap: 2 },
  lineItemName: { fontSize: 13, color: colors.text1 },
  lineItemQty: { fontSize: 11, color: colors.text3 },
  lineItemPrice: { fontSize: 13, fontWeight: '600', color: colors.text1, fontVariant: ['tabular-nums'] },
  errText: { color: colors.error, fontSize: 14 },
  retryBtn: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
  retryText: { color: colors.white, fontWeight: '600', fontSize: 13 },
});
