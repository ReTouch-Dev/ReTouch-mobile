import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

interface CardProps extends ViewProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevation?: 'none' | 'sm' | 'md';
}

export function Card({ padding = 'lg', elevation = 'sm', style, children, ...rest }: CardProps) {
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

const PAD = { sm: spacing.md, md: spacing.lg, lg: spacing.xl } as const;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
