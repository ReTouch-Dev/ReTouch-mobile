import { Image, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export function Logo({ size = 'md', iconOnly = false }: LogoProps) {
  const { isDark } = useTheme();
  const iconSize = size === 'lg' ? 48 : size === 'md' ? 36 : 26;

  if (iconOnly) {
    return (
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../../assets/icon.png')}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
      />
    );
  }

  // Horizontal lockup — light/dark variants
  const logoH = size === 'lg' ? 40 : size === 'md' ? 30 : 22;
  const logoW = logoH * 4.2; // ~4.2:1 aspect ratio of the horizontal logo

  return (
    <View>
      <Image
        source={
          isDark
            ? // eslint-disable-next-line @typescript-eslint/no-require-imports
              require('../../assets/logo-dark.png')
            : // eslint-disable-next-line @typescript-eslint/no-require-imports
              require('../../assets/logo-light.png')
        }
        style={{ width: logoW, height: logoH }}
        resizeMode="contain"
      />
    </View>
  );
}
