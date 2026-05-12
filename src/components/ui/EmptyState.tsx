import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type Colors } from '../../hooks/useTheme';
import { spacing } from '../../theme/tokens';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { alignItems: 'center', paddingTop: spacing['4xl'], paddingHorizontal: spacing['2xl'], gap: spacing.sm },
    icon:     { fontSize: 42, marginBottom: spacing.sm },
    title:    { fontSize: 17, fontWeight: '700', color: colors.text1, textAlign: 'center' },
    subtitle: { fontSize: 14, color: colors.text2, textAlign: 'center', lineHeight: 20 },
    action:   { marginTop: spacing.md },
  });
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} variant="secondary" size="sm" />
        </View>
      )}
    </View>
  );
}
