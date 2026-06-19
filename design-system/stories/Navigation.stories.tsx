import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { HeaderBackButton } from '@root/components/HeaderBackButton';
import { FlowHeader } from '@root/components/FlowHeader';

const meta: Meta = { title: 'Navigation/Header & Back' };
export default meta;
type Story = StoryObj;

export const BackControls: Story = {
  name: 'Back button',
  render: () => (
    // The one canonical back control: a circular outline IconButton (ChevronLeft)
    // with the shared press bounce. The old text "< Back" pill was removed.
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
      <HeaderBackButton onPress={() => {}} />
      <HeaderBackButton onPress={() => {}} disabled />
    </View>
  ),
};

export const Flow: Story = {
  name: 'Flow Header',
  render: () => (
    <View style={{ width: 420, gap: 24 }}>
      <FlowHeader
        flowTitle="Inspection"
        project={{ name: 'Tower crane — site B' }}
        step={2}
        totalSteps={5}
        trailing="help"
        onBack={() => {}}
        onHelp={() => {}}
      />
      <FlowHeader
        flowTitle="Briefing"
        project={{ name: 'Warehouse 4' }}
        leading="none"
        trailing="close"
        onClose={() => {}}
      />
    </View>
  ),
};
