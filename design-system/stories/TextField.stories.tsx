import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Eye } from 'lucide-react-native';
import { FloatingLabelInput } from '@root/components/inputs/FloatingLabelInput';

// FloatingLabelInput is the PRIMARY text input used across the app (auth, forms,
// wizards, inspections) — ~46 imports. (components/primitives/Input.tsx is a
// legacy artifact and is intentionally not showcased.)

const meta = {
  title: 'Components/Text Field',
  component: FloatingLabelInput,
} satisfies Meta<typeof FloatingLabelInput>;

export default meta;
type Story = StoryObj<typeof meta>;

function Controlled(props: { label: string; initial?: string; error?: string; helper?: string; required?: boolean; secureTextEntry?: boolean; rightIcon?: any }) {
  const [v, setV] = useState(props.initial ?? '');
  return (
    <View style={{ width: 340 }}>
      <FloatingLabelInput {...props} value={v} onChangeText={setV} />
    </View>
  );
}

export const Default: Story = {
  render: () => <Controlled label="Project name" />,
};

export const States: Story = {
  render: () => (
    <View style={{ gap: 20, width: 340 }}>
      <Controlled label="Empty" />
      <Controlled label="With value" initial="Tower crane — site B" />
      <Controlled label="Required" required helper="We'll show this on the report" />
      <Controlled label="Error" initial="bad@" error="Invalid email address" />
      <Controlled label="Password" secureTextEntry rightIcon={Eye} />
    </View>
  ),
};
