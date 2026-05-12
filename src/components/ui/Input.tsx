import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';

interface InputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ComponentProps<typeof Ionicons>['name'];
  rightIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  ...rest
}: InputProps) {
  const [secure, setSecure] = useState(secureTextEntry ?? false);
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrap, hasError && styles.inputWrapError]}>
        {leftIcon && (
          <Ionicons name={leftIcon} size={16} color={colors.text3} style={styles.leftIcon} />
        )}
        <RNTextInput
          style={[styles.input, leftIcon && styles.inputWithLeft]}
          placeholderTextColor={colors.text3}
          secureTextEntry={secure}
          autoCapitalize="none"
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
              color={colors.text3}
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

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
  },
  inputWrapError: { borderColor: colors.error },
  input: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.text1,
  },
  inputWithLeft: { paddingLeft: spacing.xs },
  leftIcon: { paddingLeft: spacing.md },
  rightIconBtn: { paddingRight: spacing.md },
  errorText: { fontSize: 12, color: colors.error },
  hintText: { fontSize: 12, color: colors.text3 },
});
