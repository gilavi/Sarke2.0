import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { VerdictSelector } from '@root/components/inspection-steps/VerdictSelector';

// The canonical "გადაწყვეტილება" picker for inspection conclusions — a selection
// control like Selector, but rendered as big icon+label cards. Icon resolves from
// an explicit `icon`, else a semantic `tone` (success/caution/danger), else by
// position. Grouped here under Selection/* alongside Selector and Answer Chips.

const meta: Meta = { title: 'Selection/Verdict' };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: 'Pass / Conditional / Fail',
  render: () => {
    const [v, setV] = useState<string | null>(null);
    return (
      <View style={{ width: 380 }}>
        <VerdictSelector
          value={v}
          onChange={setV}
          options={[
            { value: 'pass', label: 'Pass' },
            { value: 'conditional', label: 'Conditional' },
            { value: 'fail', label: 'Fail' },
          ]}
        />
      </View>
    );
  },
};

export const Tones: Story = {
  name: 'Explicit tones',
  render: () => {
    const [v, setV] = useState<string | null>('good');
    return (
      <View style={{ width: 380 }}>
        <VerdictSelector
          value={v}
          onChange={setV}
          options={[
            { value: 'good', label: 'ვარგისია', tone: 'success' },
            { value: 'watch', label: 'ხარვეზი', tone: 'caution' },
            { value: 'bad', label: 'გამოუსადეგარია', tone: 'danger' },
          ]}
        />
      </View>
    );
  },
};
