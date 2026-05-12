import { Text, View } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';

function ReceiptIcon({ size = 32, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x="4" y="2" width="24" height="24" rx="3" fill={color} />
      <Rect x="8" y="7" width="10" height="2" rx="1" fill="white" opacity={0.9} />
      <Rect x="8" y="12" width="16" height="1.5" rx="0.75" fill="white" opacity={0.6} />
      <Rect x="8" y="16" width="16" height="1.5" rx="0.75" fill="white" opacity={0.6} />
      <Rect x="8" y="20" width="10" height="1.5" rx="0.75" fill="white" opacity={0.6} />
      <Path
        d="M4 26 L7 28.5 L10 26 L13 28.5 L16 26 L19 28.5 L22 26 L25 28.5 L28 26 L28 28 L4 28 Z"
        fill={color}
      />
    </Svg>
  );
}

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export function Logo({ size = 'md', iconOnly = false }: LogoProps) {
  const { colors } = useTheme();
  const iconSize = size === 'lg' ? 38 : size === 'md' ? 30 : 22;
  const textSize = size === 'lg' ? 30 : size === 'md' ? 24 : 18;
  const gap = size === 'lg' ? 12 : size === 'md' ? 10 : 8;

  if (iconOnly) return <ReceiptIcon size={iconSize} color={colors.primary} />;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      <ReceiptIcon size={iconSize} color={colors.primary} />
      <Text style={{ fontSize: textSize, fontWeight: '800', letterSpacing: -0.5, color: colors.text1 }}>
        <Text style={{ color: colors.primary }}>Re</Text>Touch
      </Text>
    </View>
  );
}
