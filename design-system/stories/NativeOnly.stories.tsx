import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

// Components that genuinely cannot render in a web Storybook because they depend
// on native modules with no web implementation. Documented here so the design
// system is honest about its boundary — they live on the Expo app only.

const meta: Meta = { title: 'Components/Native only' };
export default meta;
type Story = StoryObj;

const NATIVE = [
  {
    name: 'SignatureCanvas',
    path: 'components/SignatureCanvas.tsx',
    why: 'Wraps react-native-signature-canvas (a WebView-backed signature pad). Native only; the tokenized web signing page (web/) has its own canvas.',
  },
  {
    name: 'ProjectAvatar',
    path: 'components/ProjectAvatar.tsx',
    why: 'Uses expo-image for the project photo. Renders initials + image on device; not wired for the web bundle here.',
  },
];

export const Overview: Story = {
  render: () => (
    <div style={{ fontFamily: 'Inter, Helvetica, Arial, sans-serif', maxWidth: 560 }}>
      <p style={{ opacity: 0.7, fontSize: 14, marginBottom: 16 }}>
        These components depend on native modules and are not rendered in the web showcase. They
        remain part of the mobile design system.
      </p>
      {NATIVE.map((c) => (
        <div
          key={c.name}
          style={{
            border: '1px solid rgba(128,128,128,0.3)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 15 }}>{c.name}</strong>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#FE7A43',
                border: '1px solid #FE7A43',
                borderRadius: 999,
                padding: '1px 8px',
              }}
            >
              NATIVE ONLY
            </span>
          </div>
          <code style={{ fontSize: 12, opacity: 0.6 }}>{c.path}</code>
          <p style={{ fontSize: 13, opacity: 0.85, marginTop: 8, marginBottom: 0 }}>{c.why}</p>
        </div>
      ))}
    </div>
  ),
};
