import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { ActionSheet } from '@root/components/ActionSheet';
import { CustomDropdown } from '@root/components/ui/CustomDropdown';
import { useBottomSheet } from '@root/components/BottomSheet';
import { Button } from '@ds/Button';

// Interactive overlays. These need providers (BottomSheetProvider +
// GestureHandlerRootView), wired globally in .storybook/preview.tsx.

const meta: Meta = { title: 'Components/Overlays' };
export default meta;
type Story = StoryObj;

export const ActionSheetStory: Story = {
  name: 'Action Sheet',
  render: () => (
    <View style={{ width: 360 }}>
      <ActionSheet
        title="Inspection"
        items={[
          { label: 'Edit', onPress: () => {} },
          { label: 'Duplicate', onPress: () => {} },
          { label: 'Delete', variant: 'destructive', onPress: () => {} },
        ]}
        onClose={() => {}}
      />
    </View>
  ),
};

export const Dropdown: Story = {
  name: 'Custom Dropdown',
  render: () => {
    const [val, setVal] = useState<string | number | null>(null);
    return (
      <View style={{ width: 360 }}>
        <CustomDropdown
          label="Inspection type"
          placeholder="Select a type…"
          value={val}
          onChange={setVal}
          options={[
            { label: 'Tower crane', value: 'crane' },
            { label: 'Excavator', value: 'excavator' },
            { label: 'Fall protection harness', value: 'harness' },
          ]}
        />
      </View>
    );
  },
};

export const BottomSheetTrigger: Story = {
  name: 'Bottom Sheet',
  render: () => {
    const show = useBottomSheet();
    return (
      <Button
        title="Open bottom sheet"
        onPress={() =>
          show({ title: 'Choose an action', options: ['Edit', 'Duplicate', 'Delete'], destructiveButtonIndex: 2 })
        }
      />
    );
  },
};
