import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen } from '../components/ui';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { templatesApi } from '../lib/services';
import { theme } from '../lib/theme';
import type { Template } from '../types/models';
import { SIGNER_ROLE_LABEL } from '../types/models';

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [retryTick, setRetryTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const list = await templatesApi.list();
          if (!cancelled) {
            setTemplates(list);
            setError(null);
          }
        } catch (e) {
          if (!cancelled) setError(e);
        } finally {
          if (!cancelled) setLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [retryTick]),
  );

  const retry = () => setRetryTick(t => t + 1);

  if (loaded && error && templates.length === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'შაბლონები' }} />
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <ErrorState error={error} onRetry={retry} />
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'შაბლონები' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <FlatList
          data={templates}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          ListEmptyComponent={
            !loaded ? (
              <View style={{ gap: 12 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} padding={14}>
                    <View style={{ gap: 8 }}>
                      <Skeleton width={'70%'} height={15} />
                      <Skeleton width={'40%'} height={11} />
                      <Skeleton width={'85%'} height={11} />
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 10 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: theme.colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="document-text-outline" size={28} color={theme.colors.accent} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.ink }}>
                  შაბლონები ჯერ არ არის
                </Text>
                <Text style={{ fontSize: 13, color: theme.colors.inkSoft, textAlign: 'center', maxWidth: 280 }}>
                  სისტემური შაბლონები ჩნდება ავტომატურად — გადაამოწმე ცოტა ხანში.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <Card padding={14}>
              <Text style={{ fontWeight: '700', color: theme.colors.ink }}>{item.name}</Text>
              <Text style={{ color: theme.colors.inkSoft, fontSize: 11, marginTop: 4 }}>
                {item.is_system ? 'სისტემური' : 'ჩემი'} · {item.category ?? '—'}
              </Text>
              <Text style={{ color: theme.colors.inkSoft, fontSize: 11, marginTop: 4 }}>
                საჭირო: {item.required_signer_roles.map(r => SIGNER_ROLE_LABEL[r]).join(', ')}
              </Text>
            </Card>
          )}
        />
      </SafeAreaView>
    </Screen>
  );
}
