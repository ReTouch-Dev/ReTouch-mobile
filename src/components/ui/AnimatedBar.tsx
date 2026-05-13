import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  /** 0–100 */
  percentage: number;
  color: string;
  /** stagger offset in ms */
  delay?: number;
  height?: number;
  borderRadius?: number;
  trackColor?: string;
}

/**
 * Bar that animates from 0 to its target percentage on mount.
 * Re-animates whenever `percentage` or `delay` changes (e.g. on range switch).
 */
export function AnimatedBar({
  percentage,
  color,
  delay = 0,
  height = 4,
  borderRadius = 2,
  trackColor = 'transparent',
}: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(percentage, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      }),
    );
  // percentage and delay changes should re-trigger the animation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage, delay]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <Animated.View style={[styles.track, { height, borderRadius, backgroundColor: trackColor }]}>
      <Animated.View
        style={[
          styles.fill,
          { height, borderRadius, backgroundColor: color },
          fillStyle,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill:  { position: 'absolute', left: 0, top: 0 },
});
