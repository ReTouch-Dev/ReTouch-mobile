import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { radius } from '../../theme/tokens';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = radius.sm, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as never, height, borderRadius, backgroundColor: colors.surfaceHigh, opacity },
        style,
      ]}
    />
  );
}

export function ReceiptCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={44} height={44} borderRadius={radius.md} />
      <View style={styles.cardBody}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="35%" height={11} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={60} height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  base:     {},
  card:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  cardBody: { flex: 1 },
});
