import { useMemo } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { radius, shadow, spacing, type Colors } from '../../theme/tokens';

interface CardProps extends ViewProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevation?: 'none' | 'sm' | 'md';
}

const PAD = { sm: spacing.md, md: spacing.lg, lg: spacing.xl } as const;

function createStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}

export function Card({ padding = 'lg', elevation = 'sm', style, children, ...rest }: CardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.card,
        padding !== 'none' && { padding: PAD[padding] },
        elevation !== 'none' && shadow[elevation],
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
