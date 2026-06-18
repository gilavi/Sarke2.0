import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Skeleton, SkeletonCard, SkeletonRow, SkeletonListCard } from '@root/components/Skeleton';
import EmptyState from '@root/components/EmptyState';
import { ErrorState } from '@root/components/ErrorState';
import { ErrorScreen } from '@root/components/ErrorScreen';
import { Plus } from 'lucide-react-native';

// Loading / empty / error states — the three-state UI rule (see CLAUDE.md).

const meta: Meta = { title: 'Components/Feedback' };
export default meta;
type Story = StoryObj;

export const Skeletons: Story = {
  render: () => (
    <View style={{ gap: 20, width: 360 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton width={48} height={48} radius={24} />
        <View style={{ gap: 8, flex: 1, justifyContent: 'center' }}>
          <Skeleton width="70%" />
          <Skeleton width="40%" />
        </View>
      </View>
      <SkeletonRow />
      <SkeletonCard />
      <SkeletonListCard rows={3} />
    </View>
  ),
};

export const Empty: Story = {
  render: () => (
    <View style={{ width: 360 }}>
      <EmptyState
        type="projects"
        title="No projects yet"
        subtitle="Create your first project to start running inspections."
        action={{ label: 'New project', icon: Plus, onPress: () => {} }}
      />
    </View>
  ),
};

export const Error: Story = {
  render: () => (
    <View style={{ gap: 24, width: 360 }}>
      <ErrorState title="Couldn't load" message="Check your connection and try again." onRetry={() => {}} />
      <ErrorState compact message="Something went wrong." onRetry={() => {}} />
    </View>
  ),
};

export const FullScreenError: Story = {
  name: 'Error Screen',
  render: () => (
    <View style={{ width: 420, height: 360, borderWidth: 1, borderColor: 'rgba(128,128,128,0.2)', borderRadius: 12, overflow: 'hidden' }}>
      <ErrorScreen title="Couldn't load projects" subtitle="Pull to retry or check your connection." onRetry={() => {}} />
    </View>
  ),
};
