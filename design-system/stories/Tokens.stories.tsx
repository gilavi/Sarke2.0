import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  primary,
  neutral,
  semantic,
  highlight,
  typeScale,
  radii,
  shadowSpec,
  spaceUnit,
} from '@tokens';

// Token galleries are pure DOM visualizations sourced from the canonical
// lib/design-tokens.ts — the same data mobile and web-app consume. If a value
// changes there, these update automatically.

const meta: Meta = { title: 'Tokens/Overview' };
export default meta;
type Story = StoryObj;

const card: React.CSSProperties = {
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  color: 'var(--sb-ink, #888)',
};
const label: React.CSSProperties = { fontSize: 12, opacity: 0.7, marginTop: 6 };
const h2: React.CSSProperties = { fontSize: 18, fontWeight: 700, margin: '28px 0 12px' };

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div style={{ width: 96 }}>
      <div style={{ height: 56, borderRadius: 10, background: value, border: '1px solid rgba(128,128,128,0.25)' }} />
      <div style={label}>{name}</div>
      <div style={{ ...label, marginTop: 0, opacity: 0.5 }}>{value}</div>
    </div>
  );
}

function Scale({ title, scale }: { title: string; scale: Record<string, string> }) {
  return (
    <>
      <h2 style={h2}>{title}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {Object.entries(scale).map(([k, v]) => (
          <Swatch key={k} name={k} value={v} />
        ))}
      </div>
    </>
  );
}

export const Colors: Story = {
  render: () => (
    <div style={card}>
      <Scale title="Brand (primary)" scale={primary as unknown as Record<string, string>} />
      <Scale title="Neutral" scale={neutral as unknown as Record<string, string>} />
      <Scale title="Semantic" scale={semantic as unknown as Record<string, string>} />
      <Scale title="Highlight" scale={{ highlight }} />
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div style={card}>
      <h2 style={h2}>Type scale</h2>
      {Object.entries(typeScale).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 8 }}>
          <span style={{ width: 48, fontSize: 12, opacity: 0.6 }}>{k}</span>
          <span style={{ fontSize: v.size, lineHeight: `${v.lineHeight}px`, letterSpacing: v.letterSpacing }}>
            Hubble — {v.size}px
          </span>
        </div>
      ))}
    </div>
  ),
};

export const Spacing: Story = {
  render: () => (
    <div style={card}>
      <h2 style={h2}>Spacing — base unit {spaceUnit}px</h2>
      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ width: 64, fontSize: 12, opacity: 0.6 }}>space({n})</span>
          <div style={{ height: 16, width: n * spaceUnit, background: primary[500], borderRadius: 4 }} />
          <span style={{ fontSize: 12, opacity: 0.5 }}>{n * spaceUnit}px</span>
        </div>
      ))}
    </div>
  ),
};

export const Radii: Story = {
  render: () => (
    <div style={card}>
      <h2 style={h2}>Radii</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {Object.entries(radii).map(([k, v]) => (
          <div key={k} style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: Math.min(Number(v), 36),
                background: primary[100],
                border: `2px solid ${primary[500]}`,
              }}
            />
            <div style={label}>
              {k} ({v})
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const Shadows: Story = {
  render: () => {
    const toCss = (s: (typeof shadowSpec)[keyof typeof shadowSpec]) => {
      if (s.color === 'transparent' || s.opacity === 0) return 'none';
      const hex = s.color.replace('#', '');
      const f = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
      const r = parseInt(f.slice(0, 2), 16);
      const g = parseInt(f.slice(2, 4), 16);
      const b = parseInt(f.slice(4, 6), 16);
      return `${s.x}px ${s.y}px ${s.blur}px rgba(${r},${g},${b},${s.opacity})`;
    };
    return (
      <div style={card}>
        <h2 style={h2}>Elevation / shadows</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, padding: 20 }}>
          {Object.entries(shadowSpec).map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ width: 96, height: 64, borderRadius: 12, background: '#fff', boxShadow: toCss(v) }} />
              <div style={label}>{k}</div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
