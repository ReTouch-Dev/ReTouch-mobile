import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type Colors } from '../../hooks/useTheme';
import { radius } from '../../theme/tokens';

interface AvatarProps {
  initial: string;
  size?: number;
  color?: string;
  shape?: 'circle' | 'rounded';
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.primary + '55',
    },
    text: { fontWeight: '800', color: colors.primary },
  });
}

export function Avatar({ initial, size = 44, color, shape = 'circle' }: AvatarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const br = shape === 'circle' ? size / 2 : radius.md;

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: br, backgroundColor: color ?? colors.primaryLight },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initial.toUpperCase()}</Text>
    </View>
  );
}
