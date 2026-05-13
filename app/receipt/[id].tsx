import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { receiptsApi } from '../../src/api/receipts';
import { API_BASE } from '../../src/api/client';
import { Card } from '../../src/components/ui';
import { useTheme, type Colors } from '../../src/hooks/useTheme';
import { radius, shadow, spacing } from '../../src/theme/tokens';
import { formatCurrency, formatDate, formatTime } from '../../src/utils/format';

/** Resolve a potentially relative server URL to an absolute one. */
function resolveUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container:        { flex: 1, backgroundColor: colors.bg },
    content:          { padding: spacing.xl, gap: spacing.md },
    center:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg, gap: spacing.md },
    imageWrap:        { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden', height: 280, borderWidth: 1, borderColor: colors.border, ...shadow.md },
    image:            { width: '100%', height: '100%' },
    processingBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '33' },
    processingText:   { color: colors.primary, fontSize: 13, fontWeight: '600' },
    failedBanner:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.error + '12', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.error + '33' },
    failedText:       { flex: 1, color: colors.error, fontSize: 13, fontWeight: '600' },
    merchantName:     { fontSize: 20, fontWeight: '800', color: colors.text1, letterSpacing: -0.3 },
    merchantAddr:     { fontSize: 12, color: colors.text2, marginTop: 3 },
    totalAmount:      { fontSize: 34, fontWeight: '800', color: colors.primary, marginTop: spacing.sm, letterSpacing: -1 },
    sectionTitle:     { fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },
    row:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
    rowLabel:         { fontSize: 13, color: colors.text2 },
    rowValue:         { fontSize: 13, fontWeight: '600', color: colors.text1 },
    rowDivider:       { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },
    lineItem:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: spacing.xs },
    lineItemLeft:     { flex: 1, gap: 2 },
    lineItemName:     { fontSize: 13, color: colors.text1 },
    lineItemQty:      { fontSize: 11, color: colors.text3 },
    lineItemPrice:    { fontSize: 13, fontWeight: '600', color: colors.text1, fontVariant: ['tabular-nums'] },
    confidenceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm },
    confidenceText:   { color: colors.text3, fontSize: 11 },
    errText:          { color: colors.error, fontSize: 14, textAlign: 'center' },
    retryBtn:         { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
    retryText:        { color: colors.bg, fontWeight: '700', fontSize: 13 },
  });
}

function DetailRow({ label, value, styles }: { label: string; value?: string | null; styles: ReturnType<typeof createStyles> }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets  = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: receipt, isLoading, error, refetch } = useQuery({
    queryKey: ['receipt', id],
    queryFn:  () => receiptsApi.detail(id),
    enabled:  !!id,
    refetchInterval: (q) => {
      const status = q.state.data?.ocr_status;
      return status === 'processing' || status == null ? 5000 : false;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !receipt) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={styles.errText}>Failed to load receipt</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPending = receipt.ocr_status === 'processing' || receipt.ocr_status == null;
  const isFailed  = receipt.ocr_status === 'failed' || receipt.ocr_status === 'invalid_image';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['4xl'] }]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      {receipt.image_url && (
        <View style={styles.imageWrap}>
          <Image source={{ uri: resolveUrl(receipt.image_url) }} style={styles.image} contentFit="contain" transition={300} />
        </View>
      )}

      {isPending && (
        <View style={styles.processingBanner}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.processingText}>Extracting receipt data… check back in a moment</Text>
        </View>
      )}

      {isFailed && (
        <View style={styles.failedBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.failedText}>
            {receipt.ocr_status === 'invalid_image'
              ? "This image doesn't look like a receipt. Try uploading a clearer photo."
              : 'Could not extract data from this receipt. The image was saved but OCR failed.'}
          </Text>
        </View>
      )}

      {receipt.merchant_name && (
        <Card>
          <Text style={styles.merchantName}>{receipt.merchant_name}</Text>
          {receipt.merchant_address && <Text style={styles.merchantAddr}>{receipt.merchant_address}</Text>}
          {receipt.total != null && <Text style={styles.totalAmount}>{formatCurrency(receipt.total, receipt.currency)}</Text>}
        </Card>
      )}

      <Card>
        <Text style={styles.sectionTitle}>Details</Text>
        <DetailRow label="Date"     value={formatDate(receipt.transaction_date)}  styles={styles} />
        <DetailRow label="Time"     value={formatTime(receipt.transaction_time)}  styles={styles} />
        <DetailRow label="Category" value={receipt.category}                      styles={styles} />
        <DetailRow label="Payment"  value={receipt.payment_method}                styles={styles} />
        <View style={styles.rowDivider} />
        <DetailRow label="Subtotal" value={formatCurrency(receipt.subtotal, receipt.currency)} styles={styles} />
        <DetailRow label="Tax"      value={formatCurrency(receipt.tax,      receipt.currency)} styles={styles} />
        <DetailRow label="Total"    value={formatCurrency(receipt.total,    receipt.currency)} styles={styles} />
      </Card>

      {receipt.line_items?.length > 0 && (
        <Card>
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
                <Text style={styles.lineItemPrice}>{formatCurrency(item.total_price, receipt.currency)}</Text>
              )}
            </View>
          ))}
        </Card>
      )}

      {receipt.ocr_confidence != null && (
        <View style={styles.confidenceRow}>
          <Ionicons name="sparkles-outline" size={12} color={colors.text3} />
          <Text style={styles.confidenceText}>
            OCR confidence: {(receipt.ocr_confidence * 100).toFixed(0)}%
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
