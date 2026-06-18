import type { Meta, StoryObj } from '@storybook/react-vite';
import { View } from 'react-native';
import { ArrowRight, Plus } from 'lucide-react-native';
import { Button } from '@ds/Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'outline', 'danger', 'link'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { title: 'Continue', variant: 'primary', size: 'md' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const WithIcon: Story = {
  args: { title: 'Add item', leftIcon: Plus },
};

export const AllVariants: Story = {
  render: () => (
    <View style={{ gap: 12, alignItems: 'flex-start' }}>
      <Button title="Primary" variant="primary" rightIcon={ArrowRight} />
      <Button title="Secondary" variant="secondary" />
      <Button title="Ghost" variant="ghost" />
      <Button title="Outline" variant="outline" />
      <Button title="Danger" variant="danger" />
      <Button title="Link" variant="link" />
    </View>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <View style={{ gap: 12, alignItems: 'flex-start' }}>
      <Button title="Small" size="sm" />
      <Button title="Medium" size="md" />
      <Button title="Large" size="lg" />
      <Button title="Extra large" size="xl" />
    </View>
  ),
};
