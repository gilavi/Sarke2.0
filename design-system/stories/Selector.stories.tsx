import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Selector } from '@root/components/ui/Selector';

// The ONE canonical form selector — replaces the hand-rolled option lists/chip
// rows scattered across the app (IdentificationGrid's three selectors now use it).
// Single or multi select, rendered as rows or chips. (For a dropdown/sheet, see
// Components/Overlays → Custom Dropdown, which shares the option shape.)

const meta: Meta = { title: 'Components/Selector' };
export default meta;
type Story = StoryObj;

const CONDITION = [
  { value: 'good', label: 'ვარგისია' },
  { value: 'deficient', label: 'ხარვეზი' },
  { value: 'unusable', label: 'გამოუსადეგარია' },
];

export const SingleChips: Story = {
  name: 'Single · chips',
  render: () => {
    const [v, setV] = useState<string | null>('good');
    return (
      <View style={{ width: 380 }}>
        <Selector label="Condition" options={CONDITION} value={v} onChange={setV} />
      </View>
    );
  },
};

export const SingleRows: Story = {
  name: 'Single · rows',
  render: () => {
    const [v, setV] = useState<string | null>(null);
    return (
      <View style={{ width: 380 }}>
        <Selector
          label="Equipment type"
          presentation="rows"
          value={v}
          onChange={setV}
          options={[
            { value: 'crane', label: 'Tower crane', subtitle: 'Fixed / climbing' },
            { value: 'excavator', label: 'Excavator' },
            { value: 'forklift', label: 'Forklift' },
          ]}
        />
      </View>
    );
  },
};

export const MultiChips: Story = {
  name: 'Multi · chips',
  render: () => {
    const [vals, setVals] = useState<string[]>(['steel']);
    return (
      <View style={{ width: 380 }}>
        <Selector
          mode="multi"
          label="Sling material"
          options={[
            { value: 'steel', label: 'Steel wire' },
            { value: 'chain', label: 'Chain' },
            { value: 'synthetic', label: 'Synthetic web' },
            { value: 'rope', label: 'Fibre rope' },
          ]}
          values={vals}
          onValuesChange={setVals}
        />
      </View>
    );
  },
};
