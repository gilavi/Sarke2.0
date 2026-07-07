import { useEffect, useRef } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { House, Folder, BookOpen } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme, withOpacity } from '../../lib/theme';
import { useTranslation } from 'react-i18next';
import { qk } from '../../lib/apiHooks';
import { OfflineBanner } from '../../components/OfflineBanner';
import { UserAvatar } from '../../components/UserAvatar';
import { useSession } from '../../lib/session';
import { useOffline } from '../../lib/offline';

// ─── Tab Configuration ──────────────────────────────────────────
type TabConfig = {
  name: string;
  Icon: LucideIcon;
};

const TAB_CONFIG: Record<string, TabConfig> = {
  home: { name: 'tabs.home', Icon: House },
  projects: { name: 'tabs.projects', Icon: Folder },
  regulations: { name: 'tabs.regulations', Icon: BookOpen },
};

// ─── Tab Icon ───────────────────────────────────────────────────
function TabIcon({
  focused,
  isDark,
  config,
  theme,
}: {
  focused: boolean;
  isDark: boolean;
  config: TabConfig;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={styles.iconContainer}>
      {focused && (
        <View
          style={[
            styles.activeGlow,
            { backgroundColor: withOpacity(theme.colors.ink, isDark ? 0.08 : 0.06) },
          ]}
        />
      )}
      <config.Icon
        size={22}
        color={focused ? theme.colors.ink : theme.colors.inkSoft}
        fill={focused ? theme.colors.ink : 'transparent'}
        strokeWidth={focused ? 2 : 1.5}
      />
    </View>
  );
}

// ─── Tab Label ──────────────────────────────────────────────────
function TabLabel({
  focused,
  isDark: _isDark,
  titleKey,
  theme,
}: {
  focused: boolean;
  isDark: boolean;
  titleKey: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const { t } = useTranslation();

  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="clip"
      style={[
        styles.tabLabel,
        {
          color: focused ? theme.colors.ink : theme.colors.inkSoft,
          fontWeight: focused ? '700' : '500',
          // 2xs type-scale floor (lib/design-tokens.ts) — Georgian is not
          // legible at 9px. Fixed size so the label doesn't jiggle on tab
          // change; focus is carried by weight + color only.
          fontSize: 10,
          letterSpacing: -0.2,
        },
      ]}
    >
      {t(titleKey)}
    </Text>
  );
}

// ─── More Tab Avatar ────────────────────────────────────────────
function MoreTabAvatar({
  focused,
  isDark,
  theme,
}: {
  focused: boolean;
  isDark: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const { state } = useSession();
  const user = state.status === 'signedIn' ? state.user : null;
  // Profile may still be loading/unavailable — fall back to the auth email so
  // the disc shows a letter instead of a dash.
  const email = state.status === 'signedIn' ? (state.session.user.email ?? null) : null;

  return (
    <View style={styles.iconContainer}>
      {focused && (
        <View
          style={[
            styles.activeGlow,
            { backgroundColor: withOpacity(theme.colors.ink, isDark ? 0.15 : 0.1) },
          ]}
        />
      )}
      <UserAvatar
        user={user ?? { email }}
        size={26}
        borderWidth={focused ? 2 : 1.5}
        borderColor={focused ? theme.colors.ink : theme.colors.inkSoft}
      />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const { theme, isDark } = useTheme();
  const { isOnline, netReady } = useOffline();
  const bannerVisible = netReady && !isOnline;
  const adjustedInsets = bannerVisible ? { ...insets, top: 0 } : insets;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const appState = useRef(AppState.currentState);

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
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <SafeAreaInsetsContext.Provider value={adjustedInsets}>
      <Tabs
        screenOptions={({ route }) => {
          const config = TAB_CONFIG[route.name as keyof typeof TAB_CONFIG];
          return {
            headerShown: false,
            tabBarActiveTintColor: theme.colors.ink,
            tabBarInactiveTintColor: theme.colors.inkSoft,
            tabBarStyle: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 56 + bottomInset,
              paddingBottom: bottomInset,
              paddingTop: 6,
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.hairline,
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
              ? ({ focused }) => <TabIcon focused={focused} isDark={isDark} config={config} theme={theme} />
              : undefined,
            tabBarLabel: config
              ? ({ focused }) => <TabLabel focused={focused} isDark={isDark} titleKey={config.name} theme={theme} />
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
          name="more"
          options={{
            title: t('tabs.more'),
            tabBarAccessibilityLabel: t('tabs.moreA11y'),
            tabBarIcon: ({ focused }) => (
              <MoreTabAvatar focused={focused} isDark={isDark} theme={theme} />
            ),
            tabBarLabel: ({ focused }) => (
              <TabLabel focused={focused} isDark={isDark} titleKey="tabs.more" theme={theme} />
            ),
          }}
        />
        {/* Hidden routes — reachable via router.push, not shown in the bar.
            Calendar moved into the More tab (overdue surfaces on its hub tile). */}
        <Tabs.Screen name="calendar" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      </Tabs>
      </SafeAreaInsetsContext.Provider>
    </View>
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
