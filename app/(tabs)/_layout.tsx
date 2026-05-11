import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { colors, radius } from '../../src/theme/tokens';

function TabIcon({ focused, children }: { focused: boolean; children: string }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconActive]}>
      {/* Simple text icons — replace with SVG/vector icons in production */}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text3,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="receipts"
        options={{ title: 'Receipts', tabBarIcon: ({ color }) => null }}
      />
      <Tabs.Screen
        name="capture"
        options={{ title: 'Scan', tabBarIcon: ({ color }) => null }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: 'Analytics', tabBarIcon: ({ color }) => null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: colors.primaryLight },
});
