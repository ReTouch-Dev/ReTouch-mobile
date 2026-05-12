import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { ApiError } from '../../src/api/client';
import { Button, Input } from '../../src/components/ui';
import { Logo } from '../../src/components/Logo';
import { colors, radius, spacing } from '../../src/theme/tokens';

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
  email:     z.string().email('Enter a valid email'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
  confirm:   z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { register } = useAuthStore();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [loading,   setLoading]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '', confirm: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setFormError(null);
    try {
      await register(data.email, data.password, data.full_name || undefined);
      router.replace('/(tabs)/receipts');
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message === 'User with this email already exists'
          ? 'An account with this email already exists. Try signing in instead.'
          : err.message
        : 'Registration failed. Please try again.';
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoArea}>
          <Logo size="md" />
          <Text style={styles.headingText}>Create account</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full name (optional)"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ?? ''}
                placeholder="Jane Doe"
                autoCapitalize="words"
                leftIcon="person-outline"
                error={errors.full_name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ?? ''}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon="mail-outline"
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ?? ''}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="password-new"
                leftIcon="lock-closed-outline"
                error={errors.password?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="confirm"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm password"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ?? ''}
                placeholder="••••••••"
                secureTextEntry
                leftIcon="lock-closed-outline"
                error={errors.confirm?.message}
              />
            )}
          />

          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          ) : null}

          <Button
            label="Create account"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            fullWidth
            size="lg"
            icon="arrow-forward"
            iconPosition="right"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'],
    gap: spacing.xl,
  },
  logoArea: { alignItems: 'center', gap: spacing.sm },
  headingText: { fontSize: 18, fontWeight: '700', color: colors.text1, marginTop: spacing.xs },
  form: { gap: spacing.md },
  errorBanner: {
    backgroundColor: colors.error + '22',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '44',
  },
  errorBannerText: { color: colors.error, fontSize: 13, textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: colors.text2, fontSize: 14 },
  footerLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
