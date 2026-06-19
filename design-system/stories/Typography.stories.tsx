import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { A11yText } from '@ds/A11yText';

const meta = {
  title: 'Foundations/Typography',
  component: A11yText,
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'base', 'lg', 'xl', '2xl'] },
    weight: { control: 'select', options: ['normal', 'medium', 'semibold', 'bold'] },
  },
  args: { size: 'base', weight: 'normal', children: 'The quick brown fox' },
} satisfies Meta<typeof A11yText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      {(['xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const).map((s) => (
        <A11yText key={s} size={s} weight="semibold">
          {s} — Hubble safety
        </A11yText>
      ))}
    </View>
  ),
};

export const Weights: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      {(['normal', 'medium', 'semibold', 'bold'] as const).map((w) => (
        <A11yText key={w} size="lg" weight={w}>
          {w}
        </A11yText>
      ))}
    </View>
  ),
};
