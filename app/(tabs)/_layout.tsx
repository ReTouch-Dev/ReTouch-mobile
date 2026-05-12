import { Platform, View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { spacing } from '../../src/theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  receipts:  { active: 'receipt',    inactive: 'receipt-outline'    },
  capture:   { active: 'scan',       inactive: 'scan-outline'       },
  analytics: { active: 'bar-chart',  inactive: 'bar-chart-outline'  },
  profile:   { active: 'person',     inactive: 'person-outline'     },
};

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.text3,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 90 : 66,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
        tabBarIcon: ({ focused, color, size: _ }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons?.active : icons?.inactive;
          return (
            <View style={styles.iconWrap}>
              <Ionicons name={iconName ?? 'ellipse-outline'} size={22} color={color} />
              {focused && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="receipts"  options={{ title: 'Receipts'  }} />
      <Tabs.Screen name="capture"   options={{ title: 'Scan'      }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="profile"   options={{ title: 'Profile'   }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', gap: 3 },
  dot:      { width: 4, height: 4, borderRadius: 2 },
});
