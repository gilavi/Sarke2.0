import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { VerdictSelector } from '@root/components/inspection-steps/VerdictSelector';
import { VerdictSuggestionBanner } from '@root/components/inspection-steps/VerdictSuggestionBanner';
import { ChecklistRow, type ChecklistItemState } from '@root/components/inspection-steps/ChecklistRow';

const meta: Meta = { title: 'Components/Inspection' };
export default meta;
type Story = StoryObj;

export const Verdict: Story = {
  name: 'Verdict Selector',
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

export const Suggestion: Story = {
  name: 'Verdict Suggestion Banner',
  render: () => (
    <View style={{ width: 380 }}>
      <VerdictSuggestionBanner text="Suggestion: Pass" onApply={() => {}} />
    </View>
  ),
};

export const Checklist: Story = {
  name: 'Checklist Row',
  render: () => {
    const [state, setState] = useState<ChecklistItemState>({
      id: '1',
      result: null as any,
      comment: null,
      photo_paths: [],
    });
    return (
      <View style={{ width: 380 }}>
        <ChecklistRow
          item={{ id: '1', description: 'Webbing free of cuts, frays and abrasion' }}
          state={state}
          onStateChange={(patch) => setState((s) => ({ ...s, ...patch }))}
        />
      </View>
    );
  },
};
