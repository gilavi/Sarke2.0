import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../lib/theme';
import { useTranslation } from 'react-i18next';
import { useOverdueCount, qk } from '../../lib/apiHooks';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const overdueCount = useOverdueCount();
  const appState = useRef(AppState.currentState);

  // Recompute overdue badge whenever the app returns to foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        void queryClient.invalidateQueries({ queryKey: qk.calendar.schedules });
        void queryClient.invalidateQueries({ queryKey: qk.calendar.allInspections });
        void queryClient.invalidateQueries({ queryKey: qk.calendar.allBriefings });
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [queryClient]);

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
        name="calendar"
        options={{
          title: t('tabs.calendar'),
          tabBarAccessibilityLabel: t('tabs.calendarA11y'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          tabBarBadge: overdueCount > 0 ? overdueCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#DC2626' },
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
      <Tabs.Screen name="certificates" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      {/* account-settings lives at app/account-settings.tsx (top-level),
          not under (tabs). Registering it here triggered an "extraneous
          route" warning every render. */}
    </Tabs>
  );
}
