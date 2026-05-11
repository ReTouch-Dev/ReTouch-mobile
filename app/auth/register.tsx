import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/store/authStore';
import { ApiError } from '../../src/api/client';
import { Logo } from '../../src/components/Logo';

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

type FormData = z.infer<typeof schema>;

const FIELD_CONFIG = [
  { name: 'full_name' as const, label: 'Full name (optional)', placeholder: 'Jane Doe', secure: false, keyboard: 'default' as const },
  { name: 'email' as const, label: 'Email', placeholder: 'you@example.com', secure: false, keyboard: 'email-address' as const },
  { name: 'password' as const, label: 'Password', placeholder: '••••••••', secure: true, keyboard: 'default' as const },
  { name: 'confirm' as const, label: 'Confirm password', placeholder: '••••••••', secure: true, keyboard: 'default' as const },
];

export default function RegisterScreen() {
  const { register } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
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
          ? 'An account with this email already exists. Try signing in.'
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
          <Text style={styles.headingText}>Create your account</Text>
        </View>

        <View style={styles.form}>
          {FIELD_CONFIG.map(({ name, label, placeholder, secure, keyboard }) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.field}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    style={[styles.input, errors[name] && styles.inputError]}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value ?? ''}
                    placeholder={placeholder}
                    placeholderTextColor={colors.text3}
                    autoCapitalize={name === 'email' ? 'none' : name === 'full_name' ? 'words' : 'none'}
                    keyboardType={keyboard}
                    secureTextEntry={secure}
                    autoComplete={name === 'email' ? 'email' : name === 'password' ? 'password-new' : 'off'}
                  />
                  {errors[name] && <Text style={styles.errorText}>{errors[name]?.message}</Text>}
                </View>
              )}
            />
          ))}

          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={styles.btnText}>Create account</Text>
            }
          </TouchableOpacity>
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
  inner: { flexGrow: 1, paddingHorizontal: spacing['2xl'], paddingTop: spacing['2xl'], gap: spacing.xl },
  logoArea: { alignItems: 'center', gap: spacing.sm },
  headingText: { fontSize: 18, fontWeight: '700', color: colors.text1, marginTop: spacing.xs },
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { fontSize: 12, fontWeight: '600', color: colors.text2, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.text1,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontSize: 12, color: colors.error },
  errorBanner: {
    backgroundColor: colors.error + '22',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '44',
  },
  errorBannerText: { color: colors.error, fontSize: 13, textAlign: 'center' },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.bg, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: colors.text2, fontSize: 14 },
  footerLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
