// Qualifications list — the expert's professional credentials
// (xaracho_inspector etc.). Reached from the More tab.
//
// Previously lived at `app/(tabs)/certificates.tsx`. Moved here in 0006 so
// the Certificates tab can be repurposed for generated PDF certificates.
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { isExpiringSoon, qualificationsApi } from '../../lib/services';
import { useToast } from '../../lib/toast';
import { scheduleDelete } from '../../lib/pendingDeletes';
import { haptics } from '../../lib/haptics';
import { friendlyError } from '../../lib/errorMap';
import { theme } from '../../lib/theme';
import type { Qualification } from '../../types/models';

export default function QualificationsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [quals, setQuals] = useState<Qualification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    try {
      const q = await qualificationsApi.list();
      setQuals(q);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = (q: Qualification) => {
    haptics.warning();
    // Optimistically hide; restore on undo or failure.
    setQuals(curr => curr.filter(x => x.id !== q.id));
    scheduleDelete({
      message: 'სერტიფიკატი წაიშალა',
      toast,
      onUndo: () => setQuals(curr => [q, ...curr.filter(x => x.id !== q.id)]),
      onExecute: async () => {
        try {
          await qualificationsApi.remove(q.id);
          haptics.success();
          void load();
        } catch (e) {
          setQuals(curr => [q, ...curr.filter(x => x.id !== q.id)]);
          toast.error(friendlyError(e));
        }
      },
    });
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
          headerRight: () => (
            <Pressable onPress={() => router.push('/qualifications/new' as any)} hitSlop={10}>
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
                  <Card key={i} padding={14}>
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
            ) : error ? (
              <ErrorState
                error={error}
                onRetry={() => {
                  setError(null);
                  setLoaded(false);
                  void load();
                }}
              />
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
                <Ionicons name="ribbon" size={46} color={theme.colors.accent} style={{ opacity: 0.6 }} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink }}>
                  ცარიელია
                </Text>
                <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
                  დაამატე სერტიფიკატი, რომ PDF-ებს{'\n'}თან ერთოდეს.
                </Text>
              </View>
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
                    onPress={() => remove(item)}
                    hitSlop={10}
                    accessibilityLabel="remove"
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                  </Pressable>
                </View>
              </Card>
            );
          }}
        />
      </SafeAreaView>
    </Screen>
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

const styles = {
  badge: (bg: string) => ({
    backgroundColor: bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  }),
};
