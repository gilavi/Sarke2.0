import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen } from '../components/ui';
import { certificatesApi, isExpiringSoon } from '../lib/services';
import { theme } from '../lib/theme';
import type { Certificate } from '../types/models';

export default function CertificatesScreen() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certificate[]>([]);

  const load = useCallback(async () => {
    setCerts(await certificatesApi.list().catch(() => []));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = (c: Certificate) => {
    Alert.alert('წაშლა?', c.number ?? c.type, [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა',
        style: 'destructive',
        onPress: async () => {
          await certificatesApi.remove(c.id);
          void load();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'სერტიფიკატები',
          headerRight: () => (
            <Pressable onPress={() => router.push('/certificates/new')} hitSlop={10}>
              <Ionicons name="add" size={26} color={theme.colors.accent} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <FlatList
          data={certs}
          keyExtractor={c => c.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
              <Ionicons name="ribbon" size={46} color={theme.colors.accent} style={{ opacity: 0.6 }} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink }}>
                ცარიელია
              </Text>
              <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
                დაამატე სერტიფიკატი, რომ PDF-ებს{'\n'}თან ერთოდეს.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onLongPress={() => remove(item)}>
              <Card padding={14}>
                <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{item.type}</Text>
                {item.number ? (
                  <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>№ {item.number}</Text>
                ) : null}
                {item.expires_at ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: isExpiringSoon(item) ? theme.colors.warn : theme.colors.inkSoft,
                      marginTop: 2,
                    }}
                  >
                    ვადა: {new Date(item.expires_at).toLocaleDateString('ka')}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Screen>
  );
}
