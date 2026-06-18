import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { CircleCheck, CircleX } from 'lucide-react-native';
import { StepBar } from '@root/components/wizard/StepBar';
import { AnswerButtons } from '@root/components/wizard/AnswerButtons';
import { WizardNav } from '@root/components/wizard/WizardNav';
import { StatusChip } from '@root/components/wizard/StatusChip';

const meta: Meta = { title: 'Components/Wizard' };
export default meta;
type Story = StoryObj;

export const Steps: Story = {
  name: 'Step Bar',
  render: () => (
    <View style={{ width: 460, gap: 24 }}>
      <StepBar step={0} stepLabels={['Project', 'Checklist', 'Photos', 'Verdict']} />
      <StepBar step={2} stepLabels={['Project', 'Checklist', 'Photos', 'Verdict']} />
    </View>
  ),
};

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
  render: () => (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <StatusChip selected label="Pass" icon={CircleCheck} onPress={() => {}} fillSelectedIcon />
      <StatusChip selected={false} label="Fail" icon={CircleX} onPress={() => {}} />
    </View>
  ),
};

export const Nav: Story = {
  name: 'Wizard Nav',
  render: () => (
    <View style={{ width: 460 }}>
      <WizardNav isLast={false} canGoNext canGoPrev onNext={() => {}} onPrev={() => {}} />
    </View>
  ),
};
