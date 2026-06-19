import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Pencil, Trash2, Share2 } from 'lucide-react-native';
import { AnimatedSuccessIcon } from '@root/components/animations/AnimatedSuccessIcon';
import { PressBounce } from '@root/components/animations/PressBounce';
import { CelebrationBurst } from '@root/components/animations/CelebrationBurst';
import { NumberPop } from '@root/components/animations/NumberPop';
import { Selector } from '@root/components/ui/Selector';
import { QuantitySelector } from '@root/components/inputs/QuantitySelector';
import { VerdictSelector } from '@root/components/inspection-steps/VerdictSelector';
import { SerialKeypad } from '@root/components/inputs/SerialKeypad';
import { PlateInput } from '@root/components/inputs/PlateInput';
import { Card } from '@ds/Card';
import { Button } from '@ds/Button';
import { ActionSheetItem } from '@ds/ActionSheetItem';
import { A11yText } from '@ds/A11yText';

const meta: Meta = { title: 'Foundations/Motion' };
export default meta;
type Story = StoryObj;

export const SuccessIcon: Story = {
  name: 'Animated Success Icon',
  render: () => (
    <View style={{ flexDirection: 'row', gap: 32, alignItems: 'center' }}>
      <AnimatedSuccessIcon size={88} />
      <AnimatedSuccessIcon size={64} />
    </View>
  ),
};

export const PressScale: Story = {
  name: 'Press Bounce',
  render: () => (
    <View style={{ width: 320 }}>
      <PressBounce onPress={() => {}} scaleTo={0.98}>
        <Card variant="elevated" padding="lg">
          <A11yText weight="semibold">Press me</A11yText>
          <A11yText size="sm" style={{ marginTop: 4 }}>
            Squish to 0.94 → bouncy spring back (usePressBounce). The whole card scales as one.
          </A11yText>
        </Card>
      </PressBounce>
    </View>
  ),
};

export const Numbers: Story = {
  name: 'Number Pop',
  render: () => (
    <View style={{ flexDirection: 'row', gap: 32 }}>
      <NumberPop value={42} style={{ fontSize: 40, fontWeight: '800' }} />
      <NumberPop value="98%" style={{ fontSize: 40, fontWeight: '800' }} />
    </View>
  ),
};

export const Celebration: Story = {
  name: 'Celebration Burst',
  render: () => (
    <View style={{ width: 320, height: 220, alignItems: 'center', justifyContent: 'center' }}>
      <CelebrationBurst />
      <AnimatedSuccessIcon size={72} />
    </View>
  ),
};

// ── Interactions playground ──────────────────────────────────────────────────
// Tap anything: every tappable surface shares ONE squish-to-0.94 + bouncy spring
// (usePressBounce); a chosen option settles with a spring-in (useSelectionPop) and
// a 150ms fill. This is the "give them life" showcase.

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <A11yText size="xs" weight="semibold" style={{ opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>
      {children}
    </A11yText>
  );
}

function InteractionsDemo() {
  const [chip, setChip] = useState<string | null>('good');
  const [row, setRow] = useState<string | null>('crane');
  const [qty, setQty] = useState(2);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [plate, setPlate] = useState('');
  const [sheetSel, setSheetSel] = useState(0);

  const CONDITION = [
    { value: 'good', label: 'ვარგისია' },
    { value: 'deficient', label: 'ხარვეზი' },
    { value: 'unusable', label: 'გამოუსადეგარია' },
  ];

  return (
    <View style={{ gap: 28, width: 420 }}>
      <View style={{ gap: 8 }}>
        <Caption>Reference feel — buttons</Caption>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Button title="Primary" onPress={() => {}} />
          <Button title="Outline" variant="outline" onPress={() => {}} />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Caption>Selector — chips (press + selection fill)</Caption>
        <Selector options={CONDITION} value={chip} onChange={setChip} />
      </View>

      <View style={{ gap: 8 }}>
        <Caption>Selector — rows (radio springs in)</Caption>
        <Selector
          presentation="rows"
          value={row}
          onChange={setRow}
          options={[
            { value: 'crane', label: 'Tower crane', subtitle: 'Fixed / climbing' },
            { value: 'excavator', label: 'Excavator' },
            { value: 'forklift', label: 'Forklift' },
          ]}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Caption>Quantity — preset chips</Caption>
        <QuantitySelector value={qty} onChange={setQty} accessibilityLabelPrefix="Count" />
      </View>

      <View style={{ gap: 8 }}>
        <Caption>Verdict — big cards</Caption>
        <VerdictSelector
          value={verdict}
          onChange={setVerdict}
          options={[
            { value: 'pass', label: 'ვარგისია', tone: 'success' },
            { value: 'watch', label: 'ხარვეზი', tone: 'caution' },
            { value: 'fail', label: 'გამოუსადეგარია', tone: 'danger' },
          ]}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Caption>Action sheet items — press + selection circle</Caption>
        <View style={{ borderRadius: 14, overflow: 'hidden' }}>
          {[
            { label: 'Edit', icon: Pencil },
            { label: 'Share', icon: Share2 },
            { label: 'Delete', icon: Trash2, variant: 'destructive' as const },
          ].map((it, i, arr) => (
            <ActionSheetItem
              key={it.label}
              label={it.label}
              icon={it.icon}
              variant={it.variant}
              isSelected={sheetSel === i}
              isLast={i === arr.length - 1}
              onPress={() => setSheetSel(i)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Caption>Serial keypad — punchy key squish</Caption>
        <SerialKeypad slotKind="letter" onKey={() => {}} />
      </View>

      <View style={{ gap: 8 }}>
        <Caption>Plate input — active cell border fades in</Caption>
        <PlateInput label="License plate" value={plate} onChangeText={setPlate} />
      </View>
    </View>
  );
}

export const Interactions: Story = {
  name: 'Interactions (press + selection)',
  parameters: {
    docs: {
      description: {
        story:
          'Tap any control — every tappable DS surface now shares one squish-to-0.94 + bouncy spring-back (usePressBounce); a chosen option settles with a spring-in (useSelectionPop) and a 150ms fill. Hover is intentionally ignored (mobile-first).',
      },
    },
  },
  render: () => <InteractionsDemo />,
};
