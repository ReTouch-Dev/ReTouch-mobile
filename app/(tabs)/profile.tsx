import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, radius, shadow } from '../../src/theme/tokens';
import { Logo } from '../../src/components/Logo';

function MenuItem({
  icon,
  label,
  value,
  danger,
  onPress,
  loading,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? colors.error : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      {loading
        ? <ActivityIndicator size="small" color={colors.error} />
        : <Ionicons name="chevron-forward" size={16} color={colors.text3} />
      }
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const initial = (user?.full_name ?? user?.email ?? '?')[0].toUpperCase();

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
          router.replace('/auth/login');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <Logo size="sm" />
      </View>

      {/* Avatar card */}
      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{user?.full_name ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <MenuItem icon="person-outline" label="Account" value={user?.email ?? ''} />
        <View style={styles.menuDivider} />
        <MenuItem
          icon="log-out-outline"
          label="Sign out"
          danger
          onPress={handleLogout}
          loading={loading}
        />
      </View>

      <Text style={[styles.version, { paddingBottom: insets.bottom + spacing.lg }]}>
        ReTouch v1.0.0
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    ...shadow.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '44',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.primary },
  userInfo: { flex: 1, gap: 3 },
  displayName: { fontSize: 18, fontWeight: '700', color: colors.text1 },
  email: { fontSize: 13, color: colors.text2 },
  menu: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: colors.error + '18' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text1 },
  menuLabelDanger: { color: colors.error },
  menuValue: { fontSize: 12, color: colors.text3, maxWidth: 120 },
  menuDivider: { height: 1, backgroundColor: colors.divider, marginLeft: spacing.lg + 34 + spacing.md },
  version: { textAlign: 'center', color: colors.text3, fontSize: 12, marginTop: 'auto' },
});
