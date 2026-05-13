import { useMemo, useState } from 'react';
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
import { useTheme, type Colors } from '../../src/hooks/useTheme';
import { radius, spacing } from '../../src/theme/tokens';

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container:       { flex: 1, backgroundColor: colors.bg },
    inner:           { flexGrow: 1, paddingHorizontal: spacing['2xl'], justifyContent: 'center', gap: spacing.xl },
    logoArea:        { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    tagline:         { fontSize: 14, color: colors.text2, letterSpacing: 0.2 },
    form:            { gap: spacing.lg },
    errorBanner:     { backgroundColor: colors.error + '22', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.error + '44' },
    errorBannerText: { color: colors.error, fontSize: 13, textAlign: 'center' },
    footer:          { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    footerText:      { color: colors.text2, fontSize: 14 },
    footerLink:      { color: colors.primary, fontSize: 14, fontWeight: '700' },
  });
}

export default function LoginScreen() {
  const { login } = useAuthStore();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading,   setLoading]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setFormError(null);
    try {
      await login(data.email, data.password);
      router.replace('/(tabs)/receipts');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoArea}>
          <Logo size="lg" />
          <Text style={styles.tagline}>Your smart receipt wallet</Text>
        </View>
        <View style={styles.form}>
          <Controller control={control} name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Email" onChangeText={onChange} onBlur={onBlur} value={value ?? ''}
                placeholder="you@example.com" keyboardType="email-address" autoComplete="email"
                leftIcon="mail-outline" error={errors.email?.message} />
            )} />
          <Controller control={control} name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Password" onChangeText={onChange} onBlur={onBlur} value={value ?? ''}
                placeholder="••••••••" secureTextEntry autoComplete="password"
                leftIcon="lock-closed-outline" error={errors.password?.message} />
            )} />
          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          ) : null}
          <Button label="Sign in" onPress={handleSubmit(onSubmit)} loading={loading}
            fullWidth size="lg" icon="arrow-forward" iconPosition="right" />
        </View>
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.footerText}>{"Don't have an account? "}</Text>
          <Link href="/auth/register" asChild>
            <TouchableOpacity><Text style={styles.footerLink}>Sign up</Text></TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
