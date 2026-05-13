import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Text as SvgText, Circle } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

interface DataPoint { label: string; value: number }

interface Props {
  data: DataPoint[];
  width: number;
  height?: number;
  color?: string;
  formatY?: (v: number) => string;
}

const PAD = { left: 40, right: 8, top: 14, bottom: 26 };

function fmtK(v: number): string {
  if (v === 0) return '0';
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(0);
}

export function AreaLineChart({ data, width, height = 140, color = '#1BC5E3', formatY = fmtK }: Props) {
  const { colors } = useTheme();

  const points = useMemo(() => {
    if (data.length < 2) return [];
    const cw = width - PAD.left - PAD.right;
    const ch = height - PAD.top - PAD.bottom;
    const values = data.map((d) => d.value);
    const maxV = Math.max(...values, 1) * 1.1;
    return data.map((d, i) => ({
      x: PAD.left + (i / (data.length - 1)) * cw,
      y: PAD.top + (1 - d.value / maxV) * ch,
      label: d.label,
      value: d.value,
    }));
  }, [data, width, height]);

  if (points.length < 2) return <View style={{ width, height }} />;

  const values = data.map((d) => d.value);
  const maxV = Math.max(...values, 1) * 1.1;
  const cw = width - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;
  const bottom = PAD.top + ch;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = linePath +
    ` L ${points[points.length - 1].x.toFixed(1)} ${bottom} L ${PAD.left} ${bottom} Z`;

  const yTicks = [0, 0.5, 1].map((t) => ({
    v: maxV * t,
    y: PAD.top + (1 - t) * ch,
  }));

  const xShow = data.length <= 10
    ? data.map((_, i) => i)
    : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    // Slides up gently from below on first render — feels like data arriving
    <Animated.View entering={FadeInDown.duration(500).delay(100)} style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <Line
            key={i}
            x1={PAD.left} y1={t.y.toFixed(1)} x2={PAD.left + cw} y2={t.y.toFixed(1)}
            stroke={colors.border} strokeWidth={0.5}
          />
        ))}

        {/* Y labels */}
        {yTicks.map((t, i) => (
          <SvgText key={i} x={PAD.left - 4} y={(t.y + 4).toFixed(1)} textAnchor="end"
            fill={colors.text3} fontSize={9}>
            {formatY(t.v)}
          </SvgText>
        ))}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <Path d={linePath} stroke={color} strokeWidth={2} fill="none"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* X labels */}
        {xShow.map((i) => (
          <SvgText key={i} x={points[i].x.toFixed(1)} y={(height - 6).toFixed(1)}
            textAnchor="middle" fill={colors.text3} fontSize={9}>
            {points[i].label}
          </SvgText>
        ))}

        {/* End-point dots */}
        <Circle cx={points[0].x} cy={points[0].y} r={3} fill={color} />
        <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={color} />
      </Svg>
    </Animated.View>
  );
}
