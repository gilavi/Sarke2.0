import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen } from '../../../components/ui';
import { AnimatedSuccessIcon, CelebrationBurst } from '../../../components/animations';
import { useTheme } from '../../../lib/theme';
import { haptic } from '../../../lib/haptics';
import { ordersApi } from '../../../lib/ordersApi';
import { ORDER_DOCUMENT_TYPE_LABEL, type Order, type OrderDocumentType } from '../../../types/models';

const ORDER_SUCCESS_TITLE: Partial<Record<OrderDocumentType, string>> = {
  labor_safety_specialist: 'სპეციალისტი დანიშნულია!',
  alcohol_control: 'ალკოჰოლის კონტროლი დანიშნულია!',
  fire_safety_order: 'სახანძრო უსაფრთხოების პასუხისმგებელი პირი დანიშნულია!',
  fire_safety_order_enterprise: 'საწარმოს სახანძრო უსაფრთხოების პასუხისმგებელი პირი დანიშნულია!',
  crane_operator_order: 'კოშკურა ამწის ოპერატორი დანიშნულია!',
  crane_technical_order: 'ამწის ტექნიკური შემოწმება დანიშნულია!',
};

export default function OrderSuccessScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const t = setTimeout(() => haptic.inspectionComplete(), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (id) ordersApi.getById(id).then(setOrder).catch(() => {});
  }, [id]);

  return (
    <Screen edgeToEdge>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <CelebrationBurst />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <AnimatedSuccessIcon />
          <Text style={styles.title}>
            {order ? (ORDER_SUCCESS_TITLE[order.documentType] ?? 'ბრძანება შეიქმნა!') : 'ბრძანება შეიქმნა!'}
          </Text>
          <Text style={styles.subtitle}>
            PDF ბრძანება გაიზიარა. ასლი ავტომატურად ატვირთება.
          </Text>
        </View>

        <Card>
          <Text style={styles.eyebrow}>
            {order ? ORDER_DOCUMENT_TYPE_LABEL[order.documentType] : 'ბრძანება'}
          </Text>
          <Text style={[styles.eyebrow, { marginTop: 6, color: theme.colors.accent }]}>
            ბრძანება №{order?.formData.orderNumber ?? id?.slice(0, 4).toUpperCase()}
          </Text>
        </Card>

        <Button
          title="მთავარ გვერდზე"
          onPress={() => router.replace('/(tabs)/home' as any)}
          size="xl"
          leftIcon="home"
          style={{ alignSelf: 'stretch', justifyContent: 'center', marginTop: 4 }}
        />

        <View style={styles.actionGroup}>
          <ActionCard
            icon="folder-outline"
            title="პროექტებზე დაბრუნება"
            subtitle="ნახე ყველა პროექტი"
            onPress={() => router.replace('/(tabs)/projects' as any)}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
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
    eyebrow: {
      fontSize: 11,
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '700',
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
