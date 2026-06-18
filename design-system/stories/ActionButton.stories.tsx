import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { QuickActionButton } from '@root/components/QuickActionButton';

// The circular icon + label action used on the home screen quick-actions row.
// Reusable: pick a colorKey and the icon/tint follow. (components/QuickActions.tsx
// lays a row of these out.)

const meta = {
  title: 'Components/Action Button',
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

export const Single: Story = {
  render: (args) => (
    <View style={{ width: 96 }}>
      <QuickActionButton {...args} onPress={() => {}} />
    </View>
  ),
};

export const Row: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <QuickActionButton label="შემოწმება" colorKey="inspection" onPress={() => {}} fixedWidth={84} />
      <QuickActionButton label="ინციდენტი" colorKey="incident" onPress={() => {}} fixedWidth={84} />
      <QuickActionButton label="ინსტრუქტაჟი" colorKey="briefing" onPress={() => {}} fixedWidth={84} />
      <QuickActionButton label="რეპორტი" colorKey="report" onPress={() => {}} fixedWidth={84} />
    </View>
  ),
};
