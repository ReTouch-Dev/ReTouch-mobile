import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { spacing } from '../../theme/tokens';

export interface DonutSlice {
  value: number;
  color: string;
  label: string;
}

interface Props {
  data: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerSub?: string;
  showLegend?: boolean;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function buildSlicePath(cx: number, cy: number, r: number, start: number, end: number) {
  const p1 = polarToCartesian(cx, cy, r, start);
  const p2 = polarToCartesian(cx, cy, r, end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
}

export function DonutChart({ data, size = 160, centerLabel, centerSub, showLegend = true }: Props) {
  const { colors } = useTheme();

  const total = data.reduce((s, d) => s + d.value, 0);

  const slices = useMemo(() => {
    if (total === 0) return [];
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.44;
    let angle = -Math.PI / 2;
    return data
      .filter((d) => d.value > 0)
      .map((d) => {
        const sweep = (d.value / total) * 2 * Math.PI;
        const path = buildSlicePath(cx, cy, r, angle, angle + sweep);
        angle += sweep;
        return { ...d, path };
      });
  }, [data, size, total]);

  if (total === 0 || slices.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const holeR = size * 0.25;

  return (
    <View style={styles.wrap}>
      {/* The whole chart pops in with a spring zoom — satisfying on data load */}
      <Animated.View entering={ZoomIn.springify().damping(14).mass(0.8)}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            {slices.map((s, i) => (
              <Path key={i} d={s.path} fill={s.color} />
            ))}
            <Circle cx={cx} cy={cy} r={holeR} fill={colors.surface} />
          </Svg>
          {(centerLabel || centerSub) && (
            <View style={[StyleSheet.absoluteFill, styles.center]}>
              {centerLabel ? (
                <Text style={[styles.centerLabel, { color: colors.text1 }]} numberOfLines={1}>
                  {centerLabel}
                </Text>
              ) : null}
              {centerSub ? (
                <Text style={[styles.centerSub, { color: colors.text3 }]}>{centerSub}</Text>
              ) : null}
            </View>
          )}
        </View>
      </Animated.View>

      {showLegend && (
        <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.legend}>
          {data
            .filter((d) => d.value > 0)
            .map((d, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                <Text style={[styles.legendLabel, { color: colors.text2 }]} numberOfLines={1}>
                  {d.label}
                </Text>
              </View>
            ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:        { alignItems: 'center', gap: spacing.md },
  center:      { alignItems: 'center', justifyContent: 'center' },
  centerLabel: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  centerSub:   { fontSize: 9, textAlign: 'center', marginTop: 1 },
  legend:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11 },
});
