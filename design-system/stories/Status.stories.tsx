import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { RecordTypePill } from '@root/components/RecordTypePill';
import { StatusBadge } from '@root/components/StatusBadge';
import { InspectionListAvatar } from '@root/components/InspectionListAvatar';

const meta: Meta = { title: 'Components/Status' };
export default meta;
type Story = StoryObj;

export const RecordTypes: Story = {
  name: 'Record Type Pill',
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <RecordTypePill recordType="inspection" />
      <RecordTypePill recordType="incident" />
      <RecordTypePill recordType="briefing" />
      <RecordTypePill recordType="report" />
    </View>
  ),
};

const STATUSES = ['completed', 'due_soon', 'due_today', 'overdue', 'upcoming', 'draft'] as const;

export const StatusDots: Story = {
  name: 'Status Badge (corner dot)',
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
      {STATUSES.map((s) => (
        // StatusBadge is a corner dot — shown over an avatar, as in list rows.
        <View key={s} style={{ position: 'relative' }}>
          <InspectionListAvatar category="harness" size={44} />
          <StatusBadge status={s} />
        </View>
      ))}
    </View>
  ),
};
