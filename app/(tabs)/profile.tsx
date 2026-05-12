import { useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Avatar, Card } from '../../src/components/ui';
import { colors, radius, shadow, spacing } from '../../src/theme/tokens';
import { Logo } from '../../src/components/Logo';
import { getInitial } from '../../src/utils/format';

// ---------------------------------------------------------------------------
// Menu item
// ---------------------------------------------------------------------------

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
        <Ionicons name={icon} size={17} color={danger ? colors.error : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {value && <Text style={styles.menuValue} numberOfLines={1}>{value}</Text>}
      {loading
        ? <ActivityIndicator size="small" color={colors.error} />
        : <Ionicons name="chevron-forward" size={15} color={colors.text3} />
      }
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [loading, setLoading]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const insets = useSafeAreaInsets();

  const initial = getInitial(user?.full_name ?? user?.email, '?');

  const handleLogout = async () => {
    setLoading(true);
    setConfirming(false);
    try {
      await logout();
      // Navigation handled declaratively by _layout.tsx <Redirect>
    } catch {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Logo size="sm" />
      </View>

      {/* Avatar card */}
      <Card style={styles.avatarCard}>
        <Avatar initial={initial} size={60} shape="circle" />
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{user?.full_name ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </Card>

      {/* Menu */}
      <Card style={styles.menu} padding="none">
        <MenuItem icon="person-outline" label="Account" value={user?.email ?? ''} />
        <View style={styles.menuDivider} />
        <MenuItem
          icon="log-out-outline"
          label="Sign out"
          danger
          onPress={() => setConfirming(true)}
          loading={loading}
        />
      </Card>

      {/* Inline sign-out confirmation */}
      {confirming && (
        <Card style={styles.confirmSheet}>
          <Text style={styles.confirmTitle}>Sign out?</Text>
          <Text style={styles.confirmSub}>You can sign back in at any time.</Text>
          <View style={styles.confirmBtns}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setConfirming(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.signOutBtnText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      <Text style={[styles.version, { paddingBottom: insets.bottom + spacing.lg }]}>
        ReTouch v1.0.0
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    ...shadow.sm,
  },
  userInfo: { flex: 1, gap: 3 },
  displayName: { fontSize: 18, fontWeight: '700', color: colors.text1 },
  email: { fontSize: 13, color: colors.text2 },

  menu: {
    marginHorizontal: spacing.xl,
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

  confirmSheet: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    borderColor: colors.error + '44',
    gap: spacing.sm,
    ...shadow.sm,
  },
  confirmTitle: { fontSize: 16, fontWeight: '700', color: colors.text1 },
  confirmSub: { fontSize: 13, color: colors.text2 },
  confirmBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.text1, fontWeight: '600', fontSize: 14 },
  signOutBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  signOutBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },

  version: { textAlign: 'center', color: colors.text3, fontSize: 12, marginTop: 'auto' },
});
