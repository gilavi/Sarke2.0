import { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect } from 'expo-router';
import { Card, Screen } from '../components/ui';
import { templatesApi } from '../lib/services';
import { theme } from '../lib/theme';
import type { Template } from '../types/models';
import { SIGNER_ROLE_LABEL } from '../types/models';

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<Template[]>([]);

  useFocusEffect(
    useCallback(() => {
      void (async () => setTemplates(await templatesApi.list().catch(() => [])))();
    }, []),
  );

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'შაბლონები' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <FlatList
          data={templates}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
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
