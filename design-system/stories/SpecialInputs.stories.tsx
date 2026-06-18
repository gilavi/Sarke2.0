import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { PlateInput } from '@root/components/inputs/PlateInput';
import { QuantitySelector } from '@root/components/inputs/QuantitySelector';
import { SerialKeypad } from '@root/components/inputs/SerialKeypad';

// Specialized inputs used in equipment inspections.

const meta: Meta = { title: 'Components/Special Inputs' };
export default meta;
type Story = StoryObj;

export const Plate: Story = {
  name: 'Plate Input',
  render: () => {
    const [v, setV] = useState('');
    return (
      <View style={{ width: 320 }}>
        <PlateInput label="License plate" value={v} onChangeText={setV} />
      </View>
    );
  },
};

export const Quantity: Story = {
  name: 'Quantity Selector',
  render: () => {
    const [n, setN] = useState(2);
    return (
      <View style={{ width: 360 }}>
        <QuantitySelector value={n} onChange={setN} accessibilityLabelPrefix="Harness count" />
      </View>
    );
  },
};

export const Keypad: Story = {
  name: 'Serial Keypad',
  render: () => (
    <View style={{ gap: 24, width: 360 }}>
      <SerialKeypad slotKind="letter" onKey={() => {}} />
      <SerialKeypad slotKind="digit" onKey={() => {}} />
    </View>
  ),
};
