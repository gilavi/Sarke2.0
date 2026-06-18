import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { MapPreview } from '@root/components/MapPreview';
import { MapPicker, type LatLng } from '@root/components/MapPicker';

// These resolve to the .web.tsx variants (Storybook prefers .web.* — see
// .storybook/main.ts). On web the native MapKit/Google map isn't available, so
// the components fall back to a coordinate/address card — exactly what the
// dashboard shows. The native build uses react-native-maps.

const meta: Meta = { title: 'Components/Maps (web fallback)' };
export default meta;
type Story = StoryObj;

const TBILISI = { latitude: 41.7151, longitude: 44.8271 };

export const Preview: Story = {
  render: () => (
    <View style={{ width: 360 }}>
      <MapPreview latitude={TBILISI.latitude} longitude={TBILISI.longitude} style={{ height: 160, borderRadius: 12 }} />
    </View>
  ),
};

export const Picker: Story = {
  render: () => {
    const [value, setValue] = useState<LatLng | null>(TBILISI);
    const [address, setAddress] = useState('Tbilisi, Georgia');
    return (
      <View style={{ width: 360 }}>
        <MapPicker value={value} onChange={setValue} address={address} onAddressChange={setAddress} />
      </View>
    );
  },
};
