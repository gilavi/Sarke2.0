import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect } from 'expo-router';
import { Card, Screen } from '../components/ui';
import { Skeleton } from '../components/Skeleton';
import { templatesApi } from '../lib/services';
import { theme } from '../lib/theme';
import type { Template } from '../types/models';
import { SIGNER_ROLE_LABEL } from '../types/models';

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setTemplates(await templatesApi.list().catch(() => []));
        setLoaded(true);
      })();
    }, []),
  );

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'შაბლონები' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <FlashList<Template> estimatedItemSize={120}
          data={templates}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
            ) : null
          }
          renderItem={({ item }: { item: typeof templates[0] }) => (
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
