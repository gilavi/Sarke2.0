// Qualifications list — the expert's professional credentials
// (xaracho_inspector etc.). Reached from the More tab.
//
// Previously lived at `app/(tabs)/certificates.tsx`. Moved here in 0006 so
// the Certificates tab can be repurposed for generated PDF certificates.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { haptic } from '../../lib/haptics';
import { isExpiringSoon, qualificationsApi } from '../../lib/services';
import { theme } from '../../lib/theme';
import { toErrorMessage } from '../../lib/logError';
import { a11y } from '../../lib/accessibility';
import type { Qualification } from '../../types/models';

export default function QualificationsScreen() {
  const router = useRouter();
  const [quals, setQuals] = useState<Qualification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Qualification | null>(null);

  const load = useCallback(async () => {
    const q = await qualificationsApi.list().catch(() => []);
    setQuals(q);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const confirmRemove = (q: Qualification) => {
    haptic.medium();
    setDeleteTarget(q);
    setDeleteModalVisible(true);
  };

  const doRemove = async () => {
    if (!deleteTarget) return;
    setDeleteModalVisible(false);
    try {
      await qualificationsApi.remove(deleteTarget.id);
      haptic.success();
      void load();
    } catch (e) {
      haptic.error();
      Alert.alert('წაშლა ვერ მოხერხდა', toErrorMessage(e, 'ქსელის შეცდომა'));
    }
    setDeleteTarget(null);
  };

  const statusOf = (q: Qualification): 'expired' | 'expiring' | 'ok' => {
    if (!q.expires_at) return 'ok';
    const exp = new Date(q.expires_at).getTime();
    if (exp < Date.now()) return 'expired';
    if (isExpiringSoon(q)) return 'expiring';
    return 'ok';
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'კვალიფიკაცია',
          headerBackTitle: 'მეტი',
          headerRight: () => (
            <Pressable onPress={() => router.push('/qualifications/new' as any)} hitSlop={10} {...a11y('ახალი სერტიფიკატი', 'სერტიფიკატის დამატება', 'button')}>
              <Ionicons name="add-circle" size={28} color={theme.colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <FlatList
          data={quals}
          keyExtractor={c => c.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            !loaded ? (
              <View style={{ gap: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={`skeleton-${i}`} padding={14}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1, gap: 8 }}>
                        <Skeleton width={'55%'} height={14} />
                        <Skeleton width={'35%'} height={11} />
                        <Skeleton width={'45%'} height={11} />
                      </View>
                      <Skeleton width={70} height={22} radius={999} />
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <EmptyState
                type="qualifications"
                title="სერტიფიკატები არ არის"
                subtitle="ატვირთეთ კვალიფიკაციის სერტიფიკატები PDF რეპორტისთვის"
                action={{
                  label: 'სერტიფიკატის ატვირთვა',
                  icon: 'cloud-upload-outline',
                  onPress: () => router.push('/qualifications/new' as any),
                }}
                backgroundPattern
              />
            )
          }
          renderItem={({ item }) => {
            const status = statusOf(item);
            return (
              <Card padding={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{item.type}</Text>
                    {item.number ? (
                      <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>№ {item.number}</Text>
                    ) : null}
                    {item.expires_at ? (
                      <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 }}>
                        ვადა: {new Date(item.expires_at).toLocaleDateString('ka')}
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge status={status} />
                  <Pressable
                    onPress={() => confirmRemove(item)}
                    hitSlop={10}
                    style={{ padding: 6 }}
                    {...a11y('წაშლა', 'სერტიფიკატის წაშლა', 'button')}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                  </Pressable>
                </View>
              </Card>
            );
          }}
        />
      </SafeAreaView>

      {/* Delete confirmation modal */}
      <DeleteModal
        visible={deleteModalVisible}
        onClose={() => { setDeleteModalVisible(false); setDeleteTarget(null); }}
        onConfirm={doRemove}
        title={deleteTarget?.number ?? deleteTarget?.type ?? ''}
      />
    </Screen>
  );
}

function DeleteModal({
  visible,
  onClose,
  onConfirm,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      fade.setValue(0);
      Animated.timing(fade, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fade]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFillObject}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} {...a11y('გაუქმება', 'დიალოგის დახურვა', 'button')} />
        </Animated.View>

        <View style={qStyles.modalWrap}>
          <View style={qStyles.modalCard}>
            <View style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={qStyles.iconCircle}>
                <Ionicons name="trash" size={28} color={theme.colors.danger} />
              </View>
              <Text style={qStyles.modalTitle}>წაშლა?</Text>
              <Text style={qStyles.modalBody}>{title}</Text>
            </View>
            <View style={{ gap: 10, marginTop: 8 }}>
              <Button title="გაუქმება" variant="secondary" onPress={onClose} {...a11y('გაუქმება', undefined, 'button')} />
              <Button title="წაშლა" variant="danger" onPress={onConfirm} iconLeft={<Ionicons name="trash-outline" size={18} color={theme.colors.danger} />} {...a11y('წაშლა', 'სერტიფიკატის წაშლა', 'button')} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StatusBadge({ status }: { status: 'expired' | 'expiring' | 'ok' }) {
  if (status === 'ok') return null;
  const label = status === 'expired' ? 'ვადა გასულია' : 'იწურება';
  const bg = status === 'expired' ? theme.colors.dangerSoft : theme.colors.warnSoft;
  const fg = status === 'expired' ? theme.colors.danger : theme.colors.warn;
  return (
    <View style={styles.badge(bg)}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: fg }}>{label}</Text>
    </View>
  );
}

const qStyles = StyleSheet.create({
  modalWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    gap: 4,
    ...theme.shadow.card,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  modalBody: {
    fontSize: 14,
    color: theme.colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
});

const styles = {
  badge: (bg: string) => ({
    backgroundColor: bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  }),
};
