import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';

type BadgeVariant = 'processing' | 'completed' | 'failed' | 'info' | 'warning';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  processing: { bg: colors.primary + '22', text: colors.primary },
  completed:  { bg: colors.success + '22', text: colors.success },
  failed:     { bg: colors.error + '22',   text: colors.error },
  info:       { bg: colors.primary + '22', text: colors.primary },
  warning:    { bg: colors.warning + '22', text: colors.warning },
};

export function Badge({ label, variant = 'info' }: BadgeProps) {
  const { bg, text } = VARIANT_COLORS[variant];
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
});
