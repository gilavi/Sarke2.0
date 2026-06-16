// Shared post-save success scaffold.
//
// The single owner of the "big check-mark + summary card + primary CTA +
// secondary action cards" screen reached after a document is saved
// (inspection acts, incidents, orders). Every per-domain success screen
// passes its title/subtitle, an optional summary card as `children`, a
// primary action, and a list of secondary actions — it never re-rolls the
// Screen / CelebrationBurst / AnimatedSuccessIcon / ActionCard / styles.
//
// This replaced ~6 byte-identical copies of the same scaffold (one per
// done.tsx + incident + order), each with its own ActionCard and StyleSheet.
import { useEffect, useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { Button, Screen } from '../ui';
import { AnimatedSuccessIcon, CelebrationBurst } from '../animations';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';

/** A tappable secondary action rendered as a full-width card with an icon. */
export type SuccessAction = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
};

/** The single primary CTA rendered as a large filled button. */
export type SuccessPrimaryAction = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
};

type Props = {
  /** Big headline under the check-mark, e.g. "შემოწმების აქტი შენახულია!". */
  title: string;
  subtitle?: string;
  /** Summary card (or any node) shown between the header and the CTA. */
  children?: ReactNode;
  primary?: SuccessPrimaryAction;
  actions?: SuccessAction[];
};

/**
 * Full success screen scaffold: edge-to-edge Screen, celebration burst,
 * animated check-mark, headline + subtitle, optional summary `children`,
 * a primary CTA, and a stack of secondary action cards. Fires the
 * completion haptic once on mount.
 */
export function SuccessScreen({ title, subtitle, children, primary, actions }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    const t = setTimeout(() => haptic.inspectionComplete(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <Screen edgeToEdge>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <CelebrationBurst />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <AnimatedSuccessIcon />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {children}

        {primary ? (
          <Button
            title={primary.title}
            onPress={primary.onPress}
            loading={primary.loading}
            size="xl"
            leftIcon={primary.icon}
            style={{ alignSelf: 'stretch', justifyContent: 'center', marginTop: 4 }}
          />
        ) : null}

        {actions && actions.length > 0 ? (
          <View style={styles.actionGroup}>
            {actions.map((a, i) => (
              <SuccessActionCard key={i} {...a} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** A single secondary action card (icon bubble + title/subtitle + chevron). */
export function SuccessActionCard({ icon, title, subtitle, onPress }: SuccessAction) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.actionSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.inkSoft} />
    </Pressable>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    scroll: { padding: 20, paddingTop: 40, paddingBottom: 32, gap: 16 },
    header: { alignItems: 'center', gap: 12, marginBottom: 4 },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.ink,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 10,
    },
    actionGroup: { gap: 10, marginTop: 4 },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accentSoft,
    },
    actionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.ink },
    actionSubtitle: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
  });
}
