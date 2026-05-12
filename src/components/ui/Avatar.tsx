import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../theme/tokens';

interface AvatarProps {
  initial: string;
  size?: number;
  /** Override the background color. Defaults to primaryLight with a cyan border. */
  color?: string;
  shape?: 'circle' | 'rounded';
}

export function Avatar({ initial, size = 44, color, shape = 'circle' }: AvatarProps) {
  const br = shape === 'circle' ? size / 2 : radius.md;
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: br,
          backgroundColor: color ?? colors.primaryLight,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initial.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary + '55',
  },
  text: { fontWeight: '800', color: colors.primary, lineHeight: undefined },
});
