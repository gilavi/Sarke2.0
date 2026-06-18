import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { HeaderBackButton } from '@root/components/HeaderBackButton';
import { HeaderBackPill } from '@root/components/HeaderBackPill';
import { FlowHeader } from '@root/components/FlowHeader';

const meta: Meta = { title: 'Components/Navigation' };
export default meta;
type Story = StoryObj;

export const BackControls: Story = {
  name: 'Back buttons',
  render: () => (
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
      <HeaderBackButton onPress={() => {}} />
      <HeaderBackButton onPress={() => {}} disabled />
      <HeaderBackPill onPress={() => {}} />
      <HeaderBackPill label="Back" onPress={() => {}} />
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
