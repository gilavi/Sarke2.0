import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { X, Trash2, Pencil, Plus, MoreVertical, ChevronLeft } from 'lucide-react-native';
import { IconButton } from '@ds/IconButton';

// The canonical icon-only button — replaces hand-rolled Pressable + <Icon> for
// delete/close/overflow controls (e.g. photo & row deletes in inspections).

const meta = {
  title: 'Components/Icon Button',
  component: IconButton,
  argTypes: {
    variant: { control: 'select', options: ['plain', 'ghost', 'danger', 'overlay'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: { icon: X, a11yLabel: 'Close', variant: 'ghost', size: 'md' },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
      <IconButton icon={ChevronLeft} onPress={() => {}} a11yLabel="Back" variant="outline" />
      <IconButton icon={Pencil} onPress={() => {}} a11yLabel="Edit" variant="plain" />
      <IconButton icon={MoreVertical} onPress={() => {}} a11yLabel="More" variant="ghost" />
      <IconButton icon={Trash2} onPress={() => {}} a11yLabel="Delete" variant="danger" />
      <View style={{ padding: 12, backgroundColor: '#444', borderRadius: 12 }}>
        <IconButton icon={X} onPress={() => {}} a11yLabel="Remove" variant="overlay" />
      </View>
    </View>
  ),
};

export const Sizes: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
      <IconButton icon={Plus} onPress={() => {}} a11yLabel="Add" variant="ghost" size="sm" />
      <IconButton icon={Plus} onPress={() => {}} a11yLabel="Add" variant="ghost" size="md" />
      <IconButton icon={Plus} onPress={() => {}} a11yLabel="Add" variant="ghost" size="lg" />
    </View>
  ),
};
