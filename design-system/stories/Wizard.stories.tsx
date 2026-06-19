import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { CircleCheck, CircleX } from 'lucide-react-native';
import { AnswerButtons } from '@root/components/wizard/AnswerButtons';
import { StatusChip } from '@root/components/wizard/StatusChip';

// Answer-chip selection controls: the binary AnswerButtons and the underlying
// StatusChip. Grouped under Selection/* with Selector + Verdict. (The wizard step
// indicator is FlowHeader's progress bar — see Navigation → Header & Back;
// WizardNav.tsx is legacy/unused and not showcased.)

const meta: Meta = { title: 'Selection/Answer Chips' };
export default meta;
type Story = StoryObj;

export const Answers: Story = {
  name: 'Answer Buttons',
  render: () => {
    const [v, setV] = useState<boolean | null>(null);
    return (
      <View style={{ width: 360 }}>
        <AnswerButtons value={v} onChange={setV} />
      </View>
    );
  },
};

export const Chips: Story = {
  name: 'Status Chip',
  render: () => {
    const [sel, setSel] = useState<'pass' | 'fail' | null>(null);
    return (
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatusChip selected={sel === 'pass'} label="Pass" icon={CircleCheck} onPress={() => setSel('pass')} fillSelectedIcon />
        <StatusChip selected={sel === 'fail'} label="Fail" icon={CircleX} onPress={() => setSel('fail')} />
      </View>
    );
  },
};
