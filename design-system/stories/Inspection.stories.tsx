import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { VerdictSelector } from '@root/components/inspection-steps/VerdictSelector';

const meta: Meta = { title: 'Components/Verdict Selector' };
export default meta;
type Story = StoryObj;

export const Default: Story = {
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
