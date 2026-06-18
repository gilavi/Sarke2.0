import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { DateTimeField } from '@root/components/DateTimeField';

// The OS spinner is native; the trigger field/chips render on web (the picker is
// stubbed). value is a Date; mode = 'date' | 'time' | 'datetime'.

const meta: Meta = { title: 'Components/Date & Time Field' };
export default meta;
type Story = StoryObj;

export const Variants: Story = {
  render: () => {
    const [d, setD] = useState(new Date('2026-06-19T10:30:00'));
    return (
      <View style={{ gap: 16, width: 340 }}>
        <DateTimeField value={d} onChange={setD} mode="date" />
        <DateTimeField value={d} onChange={setD} mode="time" />
        <DateTimeField value={d} onChange={setD} mode="datetime" />
      </View>
    );
  },
};
