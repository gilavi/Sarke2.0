import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { AnimatedSuccessIcon } from '@root/components/animations/AnimatedSuccessIcon';
import { PressableScale } from '@root/components/animations/PressableScale';
import { CelebrationBurst } from '@root/components/animations/CelebrationBurst';
import { NumberPop } from '@root/components/animations/NumberPop';
import { Card } from '@ds/Card';
import { A11yText } from '@ds/A11yText';

const meta: Meta = { title: 'Components/Motion' };
export default meta;
type Story = StoryObj;

export const SuccessIcon: Story = {
  name: 'Animated Success Icon',
  render: () => (
    <View style={{ flexDirection: 'row', gap: 32, alignItems: 'center' }}>
      <AnimatedSuccessIcon size={88} />
      <AnimatedSuccessIcon size={64} />
    </View>
  ),
};

export const PressScale: Story = {
  name: 'Pressable Scale',
  render: () => (
    <View style={{ width: 320 }}>
      <PressableScale onPress={() => {}}>
        <Card variant="elevated" padding="lg">
          <A11yText weight="semibold">Press me</A11yText>
          <A11yText size="sm" style={{ marginTop: 4 }}>Scales down on press (reanimated)</A11yText>
        </Card>
      </PressableScale>
    </View>
  ),
};

export const Numbers: Story = {
  name: 'Number Pop',
  render: () => (
    <View style={{ flexDirection: 'row', gap: 32 }}>
      <NumberPop value={42} style={{ fontSize: 40, fontWeight: '800' }} />
      <NumberPop value="98%" style={{ fontSize: 40, fontWeight: '800' }} />
    </View>
  ),
};

export const Celebration: Story = {
  name: 'Celebration Burst',
  render: () => (
    <View style={{ width: 320, height: 220, alignItems: 'center', justifyContent: 'center' }}>
      <CelebrationBurst />
      <AnimatedSuccessIcon size={72} />
    </View>
  ),
};
