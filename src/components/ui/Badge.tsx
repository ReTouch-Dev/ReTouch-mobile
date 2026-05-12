import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type Colors } from '../../hooks/useTheme';
import { radius, spacing } from '../../theme/tokens';

type BadgeVariant = 'processing' | 'completed' | 'failed' | 'info' | 'warning';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

function variantColors(colors: Colors, variant: BadgeVariant) {
  return {
    processing: { bg: colors.primary + '22', text: colors.primary },
    completed:  { bg: colors.success + '22', text: colors.success },
    failed:     { bg: colors.error   + '22', text: colors.error },
    info:       { bg: colors.primary + '22', text: colors.primary },
    warning:    { bg: colors.warning + '22', text: colors.warning },
  }[variant];
}

function createStyles() {
  return StyleSheet.create({
    base:  { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: 3 },
    label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  });
}

export function Badge({ label, variant = 'info' }: BadgeProps) {
  const { colors } = useTheme();
  const styles = useMemo(createStyles, []);
  const { bg, text } = variantColors(colors, variant);
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}
