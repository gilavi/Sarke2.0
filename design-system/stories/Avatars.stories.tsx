import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { InspectionTypeAvatar } from '@root/components/InspectionTypeAvatar';
import { InspectionListAvatar } from '@root/components/InspectionListAvatar';
import { QuestionAvatar } from '@root/components/QuestionAvatar';

const meta: Meta = { title: 'Data Display/Avatars' };
export default meta;
type Story = StoryObj;

const CATS = ['harness', 'excavator', 'bobcat', 'cargo_platform', 'forklift_inspection'];

export const TypeAvatars: Story = {
  name: 'Inspection Type',
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {CATS.map((c) => (
        <InspectionTypeAvatar key={c} category={c} size={48} />
      ))}
      <InspectionTypeAvatar category="harness" size={48} circle />
      <InspectionTypeAvatar category="excavator" size={48} status="completed" />
    </View>
  ),
};

export const ListAvatars: Story = {
  name: 'List avatars',
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {CATS.map((c) => (
        <InspectionListAvatar key={c} category={c} size={44} />
      ))}
      <InspectionListAvatar category="harness" size={44} status="overdue" />
    </View>
  ),
};

export const Illustration: Story = {
  name: 'Question illustration',
  render: () => (
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
      <QuestionAvatar illustrationKey="certificate" size={112} />
      <QuestionAvatar illustrationKey="levelSurface" size={112} />
    </View>
  ),
};
