import { memo, useCallback, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Card, Screen } from '../components/ui';
import { A11yText } from '../components/primitives/A11yText';
import { Skeleton } from '../components/Skeleton';
import { ScaffoldTour } from '../components/ScaffoldTour';
import { useTemplates } from '../lib/apiHooks';
import { useTheme } from '../lib/theme';

import type { Template } from '../types/models';
import { SIGNER_ROLE_LABEL } from '../types/models';

const MemoizedTemplateItem = memo(function TemplateItem({ item, onHelpPress }: { item: Template; onHelpPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Card padding={14}>
      <A11yText size="base" weight="bold">{item.name}</A11yText>
      <A11yText size="xs" color={theme.colors.inkSoft} style={{ marginTop: 4 }}>
        {item.is_system ? 'სისტემური' : 'ჩემი'} · {item.category ?? '—'}
      </A11yText>
      <A11yText size="xs" color={theme.colors.inkSoft} style={{ marginTop: 4 }}>
        საჭირო: {item.required_signer_roles.map(r => SIGNER_ROLE_LABEL[r]).join(', ')}
      </A11yText>
      {item.category !== 'harness' ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
          <Pressable
            onPress={onHelpPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="დახმარება"
          >
            {({ pressed }) => (
              <A11yText
                size="sm"
                weight="semibold"
                color={theme.colors.regsTint}
                style={{ opacity: pressed ? 0.6 : 1 }}
              >
                დახმარება
              </A11yText>
            )}
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
});

export default function TemplatesScreen() {
  const { theme } = useTheme();
  const templatesQ = useTemplates();
  const templates = templatesQ.data ?? [];
  const loaded = !templatesQ.isLoading;
  const [tourVisible, setTourVisible] = useState(false);

  const handleHelpPress = useCallback(() => setTourVisible(true), []);
  const renderItem = useCallback(({ item }: { item: Template }) => (
    <MemoizedTemplateItem item={item} onHelpPress={handleHelpPress} />
  ), [handleHelpPress]);

  return (
    <Screen edgeToEdge>
      <Stack.Screen options={{ headerShown: true, title: 'შაბლონები' }} />
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
          renderItem={renderItem}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
        />
        <ScaffoldTour visible={tourVisible} onClose={() => setTourVisible(false)} />
      </SafeAreaView>
    </Screen>
  );
}
