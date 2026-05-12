import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Colors } from '../../hooks/useTheme';
import { radius, spacing } from '../../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const SIZE_STYLES: Record<Size, { py: number; px: number; fontSize: number; iconSize: number }> = {
  sm: { py: spacing.xs + 2, px: spacing.md,  fontSize: 13, iconSize: 14 },
  md: { py: spacing.sm + 4, px: spacing.lg,  fontSize: 15, iconSize: 16 },
  lg: { py: spacing.md + 2, px: spacing.xl,  fontSize: 16, iconSize: 18 },
};

function variantColors(colors: Colors, variant: Variant) {
  return {
    primary:   { bg: colors.primary,   text: colors.bg,    border: undefined },
    secondary: { bg: 'transparent',    text: colors.primary, border: colors.primary },
    ghost:     { bg: 'transparent',    text: colors.text2, border: undefined },
    danger:    { bg: colors.error,     text: colors.white, border: undefined },
  }[variant];
}

function createStyles() {
  return StyleSheet.create({
    base:      { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
    fullWidth: { alignSelf: 'stretch' },
    inner:     { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
    label:     { fontWeight: '700', letterSpacing: 0.2 },
  });
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(createStyles, []);
  const v = variantColors(colors, variant);
  const s = SIZE_STYLES[size];
  const inactive = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
          opacity: inactive ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <View style={styles.inner}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={s.iconSize} color={v.text} />
          )}
          <Text style={[styles.label, { color: v.text, fontSize: s.fontSize }]}>{label}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={s.iconSize} color={v.text} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
