// Skeleton placeholder rendered while the project + queries are
// hydrating (project detail screen). Rendered when `!loaded && !project`.

import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton, SkeletonCard, SkeletonListCard } from '../../components/Skeleton';
import { useTheme } from '../../lib/theme';

export function LoadingSkeletonScreen() {
  const { theme } = useTheme();
  // This screen disables the automatic content inset (to mirror the loaded
  // ProjectDetail, whose first element is a full-bleed map hero), so it must
  // add the safe-area top inset manually - otherwise the first skeleton card
  // clips under the status bar / Dynamic Island.
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentInset={{ top: 0, bottom: 0, left: 0, right: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 12,
          paddingBottom: 32,
          gap: 14,
        }}
      >
        <SkeletonCard>
          <Skeleton width={80} height={10} />
          <View style={{ height: 8 }} />
          <Skeleton width={'70%'} height={22} />
          <View style={{ height: 10 }} />
          <Skeleton width={'45%'} height={13} />
          <View style={{ height: 4 }} />
          <Skeleton width={'55%'} height={13} />
        </SkeletonCard>
        <SkeletonListCard rows={2} />
        <SkeletonListCard rows={3} />
      </ScrollView>
    </View>
  );
}
