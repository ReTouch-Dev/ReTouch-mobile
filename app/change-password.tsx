import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../src/api/auth';
import { ApiError } from '../src/api/client';
import { Button, Input } from '../src/components/ui';
import { useTheme, type Colors } from '../src/hooks/useTheme';
import { radius, spacing } from '../src/theme/tokens';

const schema = z.object({
  current:  z.string().min(1, 'Current password is required'),
  next:     z.string().min(8, 'New password must be at least 8 characters'),
  confirm:  z.string(),
}).refine((d) => d.next === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
  .refine((d) => d.current !== d.next,  { message: 'New password must differ from current', path: ['next'] });

type FormData = z.infer<typeof schema>;

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: colors.bg },
    inner:        { padding: spacing.xl, gap: spacing.md },
    hint:         { fontSize: 13, color: colors.text2, marginBottom: spacing.sm },
    errorBanner:  { backgroundColor: colors.error + '22', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.error + '44' },
    errorText:    { color: colors.error, fontSize: 13, textAlign: 'center' },
    successBanner:{ backgroundColor: colors.success + '22', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.success + '44' },
    successText:  { color: colors.success, fontSize: 13, textAlign: 'center', fontWeight: '600' },
  });
}

export default function ChangePasswordScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading,   setLoading]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);

  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { current: '', next: '', confirm: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setFormError(null);
    try {
      await authApi.changePassword(data.current, data.next);
      setSuccess(true);
      reset();
      setTimeout(() => router.back(), 1500);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Failed to change password. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>Choose a strong password with at least 8 characters.</Text>

        <Controller control={control} name="current"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Current password" onChangeText={onChange} onBlur={onBlur} value={value}
              placeholder="••••••••" secureTextEntry leftIcon="lock-closed-outline" error={errors.current?.message} />
          )} />

        <Controller control={control} name="next"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="New password" onChangeText={onChange} onBlur={onBlur} value={value}
              placeholder="••••••••" secureTextEntry autoComplete="password-new"
              leftIcon="key-outline" error={errors.next?.message} />
          )} />

        <Controller control={control} name="confirm"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Confirm new password" onChangeText={onChange} onBlur={onBlur} value={value}
              placeholder="••••••••" secureTextEntry leftIcon="checkmark-circle-outline" error={errors.confirm?.message} />
          )} />

        {formError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>Password changed successfully!</Text>
          </View>
        ) : null}

        <Button label="Update Password" onPress={handleSubmit(onSubmit)} loading={loading}
          fullWidth size="lg" icon="checkmark" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
