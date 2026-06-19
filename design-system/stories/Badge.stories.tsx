import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Badge } from '@ds/Badge';

const meta = {
  title: 'Data Display/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'select', options: ['default', 'primary', 'success', 'warning', 'danger', 'info'] },
    size: { control: 'select', options: ['sm', 'md'] },
    pulse: { control: 'boolean' },
  },
  args: { children: 'Badge', variant: 'primary', size: 'sm' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const AllVariants: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
    </View>
  ),
};
