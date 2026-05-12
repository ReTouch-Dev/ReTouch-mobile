import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Avatar, Card } from '../../src/components/ui';
import { useTheme, type Colors } from '../../src/hooks/useTheme';
import { radius, shadow, spacing } from '../../src/theme/tokens';
import { Logo } from '../../src/components/Logo';
import { getInitial } from '../../src/utils/format';
import { DEMO_MODE } from '../../src/lib/demo';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container:       { flex: 1, backgroundColor: colors.bg },
    header:          { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
    avatarCard:      { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginHorizontal: spacing.xl, marginBottom: spacing.sm, ...shadow.sm },
    userInfo:        { flex: 1, gap: 3 },
    displayName:     { fontSize: 18, fontWeight: '700', color: colors.text1 },
    email:           { fontSize: 13, color: colors.text2 },
    memberSince:     { fontSize: 11, color: colors.text3, marginTop: 2 },

    sectionLabel:    { fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: spacing.xl, marginBottom: spacing.xs, marginTop: spacing.lg },
    menu:            { marginHorizontal: spacing.xl, overflow: 'hidden', ...shadow.sm },
    menuItem:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2, gap: spacing.md },
    menuIcon:        { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    menuIconDanger:  { backgroundColor: colors.error + '18' },
    menuIconWarning: { backgroundColor: colors.warning + '18' },
    menuLabel:       { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text1 },
    menuLabelDanger: { color: colors.error },
    menuValue:       { fontSize: 12, color: colors.text3, maxWidth: 120 },
    menuDivider:     { height: 1, backgroundColor: colors.divider, marginLeft: spacing.lg + 34 + spacing.md },
    menuChevron:     {},

    confirmSheet:    { marginHorizontal: spacing.xl, marginTop: spacing.sm, borderColor: colors.error + '44', gap: spacing.sm, ...shadow.sm },
    confirmTitle:    { fontSize: 16, fontWeight: '700', color: colors.text1 },
    confirmSub:      { fontSize: 13, color: colors.text2 },
    confirmBtns:     { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    cancelBtn:       { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    cancelBtnText:   { color: colors.text1, fontWeight: '600', fontSize: 14 },
    signOutBtn:      { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.error, alignItems: 'center' },
    signOutBtnText:  { color: colors.white, fontWeight: '700', fontSize: 14 },

    version:         { textAlign: 'center', color: colors.text3, fontSize: 12 },
    versionWrap:     { alignItems: 'center', paddingTop: spacing['2xl'] },
  });
}

interface MenuItemProps {
  icon: IoniconName;
  label: string;
  value?: string;
  danger?: boolean;
  warning?: boolean;
  onPress?: () => void;
  loading?: boolean;
  right?: React.ReactNode;
}

function MenuItem({ icon, label, value, danger, warning, onPress, loading, right }: MenuItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={loading} activeOpacity={0.7}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger, warning && styles.menuIconWarning]}>
        <Ionicons name={icon} size={17} color={danger ? colors.error : warning ? colors.warning : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {value && <Text style={styles.menuValue} numberOfLines={1}>{value}</Text>}
      {right ?? (
        loading
          ? <ActivityIndicator size="small" color={colors.error} />
          : <Ionicons name="chevron-forward" size={15} color={colors.text3} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggle: toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [logoutLoading,  setLogoutLoading]  = useState(false);
  const [confirming,     setConfirming]     = useState(false);

  const initial = getInitial(user?.full_name ?? user?.email, '?');
  const memberSince = user?.id
    ? new Date(2026, 0, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const handleLogout = async () => {
    setLogoutLoading(true);
    setConfirming(false);
    try {
      await logout();
    } catch {
      setLogoutLoading(false);
    }
  };

  const handleExport = () => {
    if (DEMO_MODE) {
      Alert.alert('Demo Mode', 'Data export is not available in demo mode.');
    } else {
      Alert.alert('Export Receipts', 'This will export all your receipts as a CSV file.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => Alert.alert('Coming soon', 'Export feature is under development.') },
      ]);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing['4xl'] }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

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
          {memberSince ? <Text style={styles.memberSince}>Member since {memberSince}</Text> : null}
        </View>
      </Card>

      {/* Account */}
      <Text style={styles.sectionLabel}>Account</Text>
      <Card style={styles.menu} padding="none">
        <MenuItem
          icon="lock-closed-outline"
          label="Change Password"
          onPress={() => router.push('/change-password')}
        />
        <View style={styles.menuDivider} />
        <MenuItem icon="mail-outline" label="Email" value={user?.email ?? ''} />
      </Card>

      {/* Preferences */}
      <Text style={styles.sectionLabel}>Preferences</Text>
      <Card style={styles.menu} padding="none">
        <MenuItem
          icon={isDark ? 'moon' : 'sunny'}
          label="Dark Mode"
          right={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary + '88' }}
              thumbColor={isDark ? colors.primary : colors.text3}
            />
          }
        />
        <View style={styles.menuDivider} />
        <MenuItem icon="cash-outline" label="Currency" value="HKD" />
      </Card>

      {/* Data */}
      <Text style={styles.sectionLabel}>Data</Text>
      <Card style={styles.menu} padding="none">
        <MenuItem icon="download-outline" label="Export Receipts" onPress={handleExport} />
        <View style={styles.menuDivider} />
        <MenuItem icon="shield-checkmark-outline" label="Privacy Policy" />
      </Card>

      {/* Danger */}
      <Text style={styles.sectionLabel}>Session</Text>
      <Card style={styles.menu} padding="none">
        <MenuItem
          icon="log-out-outline"
          label="Sign out"
          danger
          onPress={() => setConfirming(true)}
          loading={logoutLoading}
        />
      </Card>

      {/* Sign-out confirmation */}
      {confirming && (
        <Card style={styles.confirmSheet}>
          <Text style={styles.confirmTitle}>Sign out?</Text>
          <Text style={styles.confirmSub}>You can sign back in at any time.</Text>
          <View style={styles.confirmBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirming(false)} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <Text style={styles.signOutBtnText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      <View style={styles.versionWrap}>
        <Text style={styles.version}>ReTouch v1.0.0{DEMO_MODE ? ' · Demo mode' : ''}</Text>
      </View>
    </ScrollView>
  );
}
