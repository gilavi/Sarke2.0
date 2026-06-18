import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Input } from '@ds/Input';

const meta = {
  title: 'Universal/Input',
  component: Input,
  args: { label: 'Project name', placeholder: 'e.g. Tower crane site B' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <View style={{ width: 320 }}>
      <Input {...args} />
    </View>
  ),
};

export const States: Story = {
  render: () => (
    <View style={{ gap: 16, width: 320 }}>
      <Input label="Default" placeholder="Type here…" />
      <Input label="With value" defaultValue="Hubble inspection" />
      <Input label="Error" defaultValue="bad@" error="Invalid email address" />
    </View>
  ),
};
