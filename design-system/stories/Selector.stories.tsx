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

const Dot = ({ c }: { c: string }) => (
  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c }} />
);

const SmallDot = ({ c }: { c: string }) => (
  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />
);

export const TypeCards: Story = {
  name: 'Type cards (dot + check)',
  render: () => {
    const [v, setV] = useState<string | null>('severe');
    return (
      <View style={{ width: 420 }}>
        <Selector
          presentation="rows"
          indicator="check"
          value={v}
          onChange={setV}
          options={[
            { value: 'minor', label: 'მსუბუქი დაშავება', leading: <SmallDot c="#F59E0B" /> },
            { value: 'severe', label: 'მძიმე უბედური შემთხვევა', leading: <SmallDot c="#FE7A43" /> },
            { value: 'fatal', label: 'ფატალური შემთხვევა', leading: <SmallDot c="#EF4444" /> },
            { value: 'nearmiss', label: 'კინაღამ შემთხვევა', leading: <SmallDot c="#3B82F6" /> },
          ]}
        />
      </View>
    );
  },
};

export const ListWithLeading: Story = {
  name: 'List · with leading + subtitle',
  render: () => {
    const [v, setV] = useState<string | null>('p2');
    return (
      <View style={{ width: 420 }}>
        <Selector
          presentation="list"
          value={v}
          onChange={setV}
          options={[
            { value: 'p1', label: 'Hubble Construction', subtitle: 'Tbilisi, Georgia', leading: <Dot c="#E6FF4D" /> },
            { value: 'p2', label: 'Site B — Tower crane', subtitle: 'Batumi', leading: <Dot c="#FE7A43" /> },
            { value: 'p3', label: 'Warehouse 4', subtitle: 'Kutaisi', leading: <Dot c="#3B82F6" /> },
          ]}
        />
      </View>
    );
  },
};
