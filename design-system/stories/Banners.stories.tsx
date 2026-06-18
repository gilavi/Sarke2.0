import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { PdfLockedBanner } from '@root/components/PdfLockedBanner';

// Uses react-i18next (initialized in preview.tsx) to render real strings.
// (SubscriptionNotice is omitted — it needs a Supabase session via usePdfUsage.)

const meta: Meta = { title: 'Components/Banners' };
export default meta;
type Story = StoryObj;

export const PdfLocked: Story = {
  name: 'PDF Locked Banner',
  render: () => (
    <View style={{ width: 380 }}>
      <PdfLockedBanner onDetails={() => {}} />
    </View>
  ),
};
