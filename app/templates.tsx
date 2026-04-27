import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect } from 'expo-router';
import { Card, Screen } from '../components/ui';
import { A11yText } from '../components/primitives/A11yText';
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
    <Screen edgeToEdge>
      <Stack.Screen options={{ headerShown: true, title: 'შაბლონები', headerBackTitle: 'მეტი' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <FlatList
          data={templates}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            !loaded ? (
              <View style={{ gap: 12 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={`skeleton-${i}`} padding={14}>
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
          renderItem={({ item }) => (
            <Card padding={14}>
              <A11yText size="base" weight="bold">{item.name}</A11yText>
              <A11yText size="xs" color={theme.colors.inkSoft} style={{ marginTop: 4 }}>
                {item.is_system ? 'სისტემური' : 'ჩემი'} · {item.category ?? '—'}
              </A11yText>
              <A11yText size="xs" color={theme.colors.inkSoft} style={{ marginTop: 4 }}>
                საჭირო: {item.required_signer_roles.map(r => SIGNER_ROLE_LABEL[r]).join(', ')}
              </A11yText>
            </Card>
          )}
        />
      </SafeAreaView>
    </Screen>
  );
}
