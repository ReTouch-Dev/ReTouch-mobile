/**
 * Manual Jest mock for react-native-reanimated 4.x.
 *
 * The official mock.js in the package still imports from the real index which
 * pulls in react-native-worklets native code — crashing in Jest. This file
 * provides safe no-op equivalents of everything we use.
 */
const React = require('react');
const { View, Text, Image, ScrollView, FlatList } = require('react-native');

// Shared values are plain objects so hooks work without native code
const useSharedValue = (init) => {
  const ref = { value: init };
  return ref;
};

const useAnimatedStyle = (fn) => {
  try { return fn(); } catch { return {}; }
};

const useAnimatedProps = (fn) => {
  try { return fn(); } catch { return {}; }
};

// Timing/spring functions just return the target value (no-op in tests)
const withTiming  = (value) => value;
const withSpring  = (value) => value;
const withDelay   = (_delay, value) => value;
const withSequence = (...args) => args[args.length - 1];
const withRepeat  = (value) => value;
const cancelAnimation = () => {};
const runOnJS = (fn) => fn;
const runOnUI = (fn) => fn;

const Easing = {
  linear:  (t) => t,
  ease:    (t) => t,
  quad:    (t) => t,
  cubic:   (t) => t,
  bezier:  () => (t) => t,
  circle:  (t) => t,
  sin:     (t) => t,
  exp:     (t) => t,
  elastic: () => (t) => t,
  back:    () => (t) => t,
  bounce:  (t) => t,
  in:      (easing) => easing,
  out:     (easing) => easing,
  inOut:   (easing) => easing,
};

// Entering/exiting animation builders — fluent no-op API
function makeAnimationBuilder() {
  const builder = {
    duration:    () => builder,
    delay:       () => builder,
    springify:   () => builder,
    damping:     () => builder,
    mass:        () => builder,
    stiffness:   () => builder,
    overshootClamping: () => builder,
    restDisplacementThreshold: () => builder,
    restSpeedThreshold: () => builder,
    withInitialValues: () => builder,
    build:       () => () => ({ initialValues: {}, animations: {} }),
  };
  return builder;
}

const FadeIn       = makeAnimationBuilder();
const FadeInDown   = makeAnimationBuilder();
const FadeInUp     = makeAnimationBuilder();
const FadeInLeft   = makeAnimationBuilder();
const FadeInRight  = makeAnimationBuilder();
const FadeOut      = makeAnimationBuilder();
const FadeOutDown  = makeAnimationBuilder();
const ZoomIn       = makeAnimationBuilder();
const ZoomOut      = makeAnimationBuilder();
const SlideInRight = makeAnimationBuilder();
const SlideInLeft  = makeAnimationBuilder();
const SlideInDown  = makeAnimationBuilder();
const SlideInUp    = makeAnimationBuilder();
const BounceIn     = makeAnimationBuilder();
const LightSpeedIn = makeAnimationBuilder();

// Animated components just forward to their RN equivalents
const Animated = {
  View:       View,
  Text:       Text,
  Image:      Image,
  ScrollView: ScrollView,
  FlatList:   FlatList,
  createAnimatedComponent: (Component) => Component,
};

module.exports = {
  default: Animated,
  ...Animated,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  cancelAnimation,
  runOnJS,
  runOnUI,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  FadeOutDown,
  ZoomIn,
  ZoomOut,
  SlideInRight,
  SlideInLeft,
  SlideInDown,
  SlideInUp,
  BounceIn,
  LightSpeedIn,
  ReduceMotion: { Never: 'never', Always: 'always', System: 'system' },
  Extrapolation: { CLAMP: 'clamp', IDENTITY: 'identity', EXTEND: 'extend' },
  interpolate: (_value, _input, output) => output[0],
  interpolateColor: (_value, _input, output) => output[0],
  measure: () => null,
  scrollTo: () => null,
  setUpTests: () => {},
};
