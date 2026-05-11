import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, radius, shadow } from '../../src/theme/tokens';
import { useState } from 'react';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await logout();
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.full_name ?? user?.email ?? '?')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.full_name ?? 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.dangerBtn, loading && styles.disabled]}
          onPress={handleLogout}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.error} />
            : <Text style={styles.dangerBtnText}>Sign out</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>ReTouch v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing['2xl'], paddingBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', color: colors.text1 },
  card: { alignItems: 'center', paddingVertical: spacing['2xl'], backgroundColor: colors.white, marginHorizontal: spacing.xl, borderRadius: radius.xl, ...shadow.sm, gap: spacing.sm },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.primary },
  name: { fontSize: 18, fontWeight: '700', color: colors.text1 },
  email: { fontSize: 13, color: colors.text2 },
  actions: { paddingHorizontal: spacing.xl, marginTop: spacing['2xl'] },
  btn: { borderRadius: radius.md, paddingVertical: spacing.md + 2, alignItems: 'center' },
  dangerBtn: { borderWidth: 1.5, borderColor: colors.error },
  dangerBtnText: { color: colors.error, fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.6 },
  version: { textAlign: 'center', color: colors.text3, fontSize: 12, marginTop: 'auto', paddingBottom: spacing.xl },
});
