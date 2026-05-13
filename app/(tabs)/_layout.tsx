import { useEffect, useRef } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme, withOpacity } from '../../lib/theme';
import { useTranslation } from 'react-i18next';
import { useOverdueCount, qk } from '../../lib/apiHooks';

// ─── Tab Configuration ──────────────────────────────────────────
type TabConfig = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
};

const TAB_CONFIG: Record<string, TabConfig> = {
  home: { name: 'tabs.home', icon: 'home', iconOutline: 'home-outline' },
  projects: { name: 'tabs.projects', icon: 'folder', iconOutline: 'folder-open-outline' },
  regulations: { name: 'tabs.regulations', icon: 'book', iconOutline: 'book-outline' },
  calendar: { name: 'tabs.calendar', icon: 'calendar', iconOutline: 'calendar-outline' },
  more: { name: 'tabs.more', icon: 'ellipsis-horizontal-circle', iconOutline: 'ellipsis-horizontal-circle-outline' },
};

// ─── Animated Tab Icon ──────────────────────────────────────────
function TabIcon({
  focused,
  config,
  theme,
}: {
  focused: boolean;
  config: TabConfig;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const isDark = theme.colors.background === '#0F0F0F' || theme.colors.background === '#050A05';
  const activeColor = isDark ? '#00E676' : theme.colors.accent;
  const inactiveColor = isDark ? 'rgba(255,255,255,0.3)' : theme.colors.inkSoft;

  return (
    <View style={styles.iconContainer}>
      {/* Active background glow */}
      {focused && (
        <View
          style={[
            styles.activeGlow,
            { backgroundColor: isDark ? 'rgba(0,230,118,0.15)' : withOpacity(theme.colors.accent, 0.1) },
          ]}
        />
      )}
      {/* Icon */}
      <Ionicons
        name={focused ? config.icon : config.iconOutline}
        size={focused ? 22 : 22}
        color={focused ? activeColor : inactiveColor}
      />
    </View>
  );
}

// ─── Tab Label ──────────────────────────────────────────────────
function TabLabel({
  focused,
  titleKey,
  theme,
}: {
  focused: boolean;
  titleKey: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const { t } = useTranslation();
  const isDark = theme.colors.background === '#0F0F0F' || theme.colors.background === '#050A05';
  const activeColor = isDark ? '#00E676' : theme.colors.accent;
  const inactiveColor = isDark ? 'rgba(255,255,255,0.35)' : theme.colors.inkSoft;

  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="clip"
      style={[
        styles.tabLabel,
        {
          color: focused ? activeColor : inactiveColor,
          fontWeight: focused ? '700' : '500',
          fontSize: focused ? 10 : 9,
          letterSpacing: -0.2,
        },
      ]}
    >
      {t(titleKey)}
    </Text>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const overdueCount = useOverdueCount();
  const appState = useRef(AppState.currentState);

  const isDark = theme.colors.background === '#0F0F0F' || theme.colors.background === '#050A05';

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
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];
        return {
          headerShown: false,
          tabBarActiveTintColor: isDark ? '#00E676' : theme.colors.accent,
          tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.3)' : theme.colors.inkSoft,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 56 + bottomInset,
            paddingBottom: bottomInset,
            paddingTop: 6,
            backgroundColor: isDark ? '#0F0F0F' : theme.colors.card,
            borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : theme.colors.hairline,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderRadius: 0,
            marginHorizontal: 0,
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            marginTop: 2,
            fontWeight: '500',
          },
          tabBarIcon: config
            ? ({ focused }) => <TabIcon focused={focused} config={config} theme={theme} />
            : undefined,
          tabBarLabel: config
            ? ({ focused }) => <TabLabel focused={focused} titleKey={config.name} theme={theme} />
            : undefined,
        };
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarAccessibilityLabel: t('tabs.homeA11y'),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: t('tabs.projects'),
          tabBarAccessibilityLabel: t('tabs.projectsA11y'),
        }}
      />
      <Tabs.Screen
        name="regulations"
        options={{
          title: t('tabs.regulations'),
          tabBarAccessibilityLabel: t('tabs.regulationsA11y'),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendar'),
          tabBarAccessibilityLabel: t('tabs.calendarA11y'),
          tabBarBadge: overdueCount > 0 ? overdueCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#DC2626',
            fontSize: 10,
            fontWeight: '700',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            lineHeight: 18,
          },
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          tabBarAccessibilityLabel: t('tabs.moreA11y'),
        }}
      />
      {/* Hidden routes */}
      <Tabs.Screen name="certificates" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  iconContainer: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeGlow: {
    position: 'absolute',
    width: 44,
    height: 32,
    borderRadius: 10,
    borderWidth: 0,
  },
  tabLabel: {
    marginTop: 2,
  },
});
