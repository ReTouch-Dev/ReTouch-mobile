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
  Alert,
  ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { colors, spacing, radius } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/store/authStore';
import { ApiError } from '../../src/api/client';

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

export default function RegisterScreen() {
  const { register } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await register(data.email, data.password, data.full_name || undefined);
      router.replace('/(tabs)/receipts');
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message === 'User with this email already exists'
          ? 'An account with this email already exists. Try signing in instead.'
          : err.message
        : 'Registration failed. Please try again.';
      Alert.alert('Sign up failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Create account</Text>
        <Text style={styles.subtitle}>Join ReTouch to manage your receipts</Text>

        <View style={styles.form}>
          {(['full_name', 'email', 'password', 'confirm'] as const).map((name) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>
                    {name === 'full_name' ? 'Full name (optional)'
                      : name === 'confirm' ? 'Confirm password'
                      : name.charAt(0).toUpperCase() + name.slice(1)}
                  </Text>
                  <TextInput
                    style={[styles.input, errors[name] && styles.inputError]}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value ?? ''}
                    placeholder={
                      name === 'full_name' ? 'Jane Doe'
                        : name === 'email' ? 'you@example.com'
                        : '••••••••'
                    }
                    placeholderTextColor={colors.text3}
                    autoCapitalize={name === 'email' ? 'none' : 'words'}
                    keyboardType={name === 'email' ? 'email-address' : 'default'}
                    secureTextEntry={name === 'password' || name === 'confirm'}
                  />
                  {errors[name] && <Text style={styles.errorText}>{errors[name]?.message}</Text>}
                </View>
              )}
            />
          ))}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.btnText}>Create account</Text>
            }
          </TouchableOpacity>
        </View>

        <Link href="/auth/login" style={styles.link}>
          Already have an account? <Text style={styles.linkBold}>Sign in</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing['2xl'], paddingVertical: spacing['3xl'], gap: spacing.lg },
  logo: { fontSize: 28, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.text2, textAlign: 'center', marginTop: -spacing.sm },
  form: { gap: spacing.md },
  fieldGroup: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.text1,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.error },
  errorText: { fontSize: 12, color: colors.error },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  link: { textAlign: 'center', color: colors.text2, fontSize: 13, marginTop: spacing.lg },
  linkBold: { color: colors.primary, fontWeight: '700' },
});
