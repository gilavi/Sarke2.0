import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.inkSoft,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.hairline,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarAccessibilityLabel: t('tabs.homeA11y'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: t('tabs.projects'),
          tabBarAccessibilityLabel: t('tabs.projectsA11y'),
          tabBarIcon: ({ color, size }) => <Ionicons name="folder" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="regulations"
        options={{
          title: t('tabs.regulations'),
          tabBarAccessibilityLabel: t('tabs.regulationsA11y'),
          tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarAccessibilityLabel: t('tabs.moreA11y'),
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle" color={color} size={size} />,
        }}
      />
      {/* Hidden routes — accessible via code, not tab bar */}
      <Tabs.Screen name="calendar" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="certificates" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      {/* account-settings lives at app/account-settings.tsx (top-level),
          not under (tabs). Registering it here triggered an "extraneous
          route" warning every render. */}
    </Tabs>
  );
}
