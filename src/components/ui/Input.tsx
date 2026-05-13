import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Colors } from '../../hooks/useTheme';
import { radius, spacing } from '../../theme/tokens';

interface InputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ComponentProps<typeof Ionicons>['name'];
  rightIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
}

function createStyles(colors: Colors, focused: boolean, hasError: boolean) {
  const borderColor = hasError
    ? colors.error
    : focused
    ? colors.primary
    : colors.border;

  return StyleSheet.create({
    container:    { gap: 6 },
    label:        { fontSize: 13, fontWeight: '600', color: focused ? colors.primary : colors.text2 },
    inputWrap:    {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor,
      borderRadius: radius.lg,
      minHeight: 52,
    },
    input:        { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, fontSize: 15, color: colors.text1 },
    inputWithLeft:{ paddingLeft: spacing.sm },
    leftIcon:     { paddingLeft: spacing.md },
    rightIconBtn: { paddingRight: spacing.md },
    errorText:    { fontSize: 12, color: colors.error, marginTop: 2 },
    hintText:     { fontSize: 12, color: colors.text3, marginTop: 2 },
  });
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(secureTextEntry ?? false);
  const hasError = Boolean(error);
  const styles = useMemo(() => createStyles(colors, focused, hasError), [colors, focused, hasError]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrap}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={17}
            color={focused ? colors.primary : colors.text3}
            style={styles.leftIcon}
          />
        )}
        <RNTextInput
          style={[styles.input, leftIcon && styles.inputWithLeft]}
          placeholderTextColor={colors.text3}
          secureTextEntry={secure}
          autoCapitalize="none"
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setSecure((s) => !s)}
            style={styles.rightIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={secure ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={focused ? colors.primary : colors.text3}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconBtn}
            disabled={!onRightIconPress}
          >
            <Ionicons name={rightIcon} size={18} color={colors.text3} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}
