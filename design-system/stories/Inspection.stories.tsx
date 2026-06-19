import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { VerdictSuggestionBanner } from '@root/components/inspection-steps/VerdictSuggestionBanner';
import { ChecklistRow, CHECKLIST_LEGEND, type ChecklistItemState } from '@root/components/inspection-steps/ChecklistRow';
import { ChecklistLegend } from '@root/components/inspection-parts/ChecklistLegend';
import { ChipNavStrip } from '@root/components/inspection-parts/ChipNavStrip';

// Inspection-specific parts. The verdict picker moved to Selection/Verdict; the
// answer chips live at Selection/Answer Chips.

const meta: Meta = { title: 'Inspection/Parts' };
export default meta;
type Story = StoryObj;

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
      <View style={{ width: 380, gap: 16 }}>
        <ChecklistRow
          item={{ id: '1', description: 'Webbing free of cuts, frays and abrasion' }}
          state={state}
          onStateChange={(patch) => setState((s) => ({ ...s, ...patch }))}
        />
        <ChecklistLegend items={CHECKLIST_LEGEND} />
      </View>
    );
  },
};

export const Nav: Story = {
  name: 'Chip Nav Strip',
  render: () => (
    <View style={{ width: 420 }}>
      <ChipNavStrip
        activeIndex={1}
        onSelect={() => {}}
        items={[
          { key: 'a', label: 'Webbing', state: 'done' },
          { key: 'b', label: 'Stitching', state: 'active' },
          { key: 'c', label: 'Buckles', state: 'problem' },
          { key: 'd', label: 'D-rings', state: 'pending' },
        ]}
      />
    </View>
  ),
};
