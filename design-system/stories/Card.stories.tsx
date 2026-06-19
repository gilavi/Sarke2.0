import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Card } from '@ds/Card';
import { A11yText } from '@ds/A11yText';

const meta = {
  title: 'Data Display/Card',
  component: Card,
  argTypes: {
    variant: { control: 'select', options: ['default', 'elevated', 'outlined', 'ghost'] },
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg', 'xl'] },
  },
  args: { variant: 'default', padding: 'lg' },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <View style={{ width: 320 }}>
      <Card {...args}>
        <A11yText size="lg" weight="bold">Inspection complete</A11yText>
        <A11yText size="sm" style={{ marginTop: 6 }}>3 checklists passed · 0 defects</A11yText>
      </Card>
    </View>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 16, width: 320 }}>
      {(['default', 'elevated', 'outlined', 'ghost'] as const).map((v) => (
        <Card key={v} variant={v} padding="lg">
          <A11yText size="base" weight="semibold">{v}</A11yText>
        </Card>
      ))}
    </View>
  ),
};
