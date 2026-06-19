import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { QuickActionButton } from '@root/components/QuickActionButton';

// A single circular icon + label action (home quick-actions). Reusable: pick a
// colorKey and the icon/tint follow. Use the Controls panel to switch colorKey/label.

const meta = {
  title: 'Actions/Action Button',
  component: QuickActionButton,
  argTypes: {
    colorKey: {
      control: 'select',
      options: ['inspection', 'incident', 'briefing', 'report', 'participant', 'file'],
    },
  },
  args: { label: 'შემოწმება', colorKey: 'inspection' },
} satisfies Meta<typeof QuickActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <View style={{ width: 96 }}>
      <QuickActionButton {...args} onPress={() => {}} />
    </View>
  ),
};
