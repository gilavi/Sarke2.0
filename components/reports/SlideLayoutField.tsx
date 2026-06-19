import { useMemo } from 'react';
import { View } from 'react-native';
import { Selector, type SelectorOption } from '../ui/Selector';
import { useTheme } from '../../lib/theme';
import type { ReportSlideLayout } from '../../types/models';

interface Props {
  /** Valid layouts for the current photo count (from `layoutsForCount`). */
  layouts: ReportSlideLayout[];
  value: ReportSlideLayout;
  onChange: (layout: ReportSlideLayout) => void;
}

const LABELS: Record<ReportSlideLayout, string> = {
  'text-photo': 'ტექსტი + ფოტო',
  'photo-full': 'დიდი ფოტო',
  'two-side': 'გვერდიგვერდ',
  'two-stacked': 'დაწყობილი',
};

const SUBTITLES: Record<ReportSlideLayout, string> = {
  'text-photo': 'აღწერა გვერდით, ფოტო მარჯვნივ',
  'photo-full': 'დიდი ფოტო, სათაური ქვემოთ',
  'two-side': 'ორი ფოტო გვერდიგვერდ',
  'two-stacked': 'ორი ფოტო ერთმანეთის ქვემოთ',
};

/**
 * Layout chooser for the slide editor, built on the canonical {@link Selector}
 * (the same monochrome form picker used across the inspection flow) — each row
 * is a layout with a little schematic glyph + label + one-line hint. Only the
 * layouts valid for the current photo count are passed in; the editor hides the
 * field entirely when there's no real choice.
 */
export function SlideLayoutField({ layouts, value, onChange }: Props) {
  const { theme } = useTheme();

  const options: SelectorOption[] = useMemo(
    () =>
      layouts.map(l => ({
        value: l,
        label: LABELS[l],
        subtitle: SUBTITLES[l],
        leading: (
          <View style={{ width: 40, height: 30, justifyContent: 'center' }}>
            <LayoutGlyph layout={l} theme={theme} />
          </View>
        ),
      })),
    [layouts, theme],
  );

  return (
    <Selector
      label="განლაგება"
      presentation="rows"
      indicator="check"
      options={options}
      value={value}
      onChange={v => onChange(v as ReportSlideLayout)}
    />
  );
}

/** Tiny schematic of each layout, built from neutral blocks (photo) + bars (text). */
function LayoutGlyph({ layout, theme }: { layout: ReportSlideLayout; theme: any }) {
  const photo = { flex: 1, backgroundColor: theme.colors.inkFaint, borderRadius: 2 };
  const bar = (w: any) => ({ height: 3, width: w, backgroundColor: theme.colors.borderStrong, borderRadius: 1 });

  if (layout === 'text-photo') {
    return (
      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
        <View style={{ flex: 1.2, justifyContent: 'center', gap: 3 }}>
          <View style={bar('90%')} />
          <View style={bar('70%')} />
          <View style={bar('80%')} />
        </View>
        <View style={[photo, { flex: 1 }]} />
      </View>
    );
  }
  if (layout === 'photo-full') {
    return (
      <View style={{ flex: 1, gap: 3 }}>
        <View style={photo} />
        <View style={[bar('50%'), { alignSelf: 'center' }]} />
      </View>
    );
  }
  if (layout === 'two-side') {
    return (
      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
        <View style={photo} />
        <View style={photo} />
      </View>
    );
  }
  // two-stacked
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={photo} />
      <View style={photo} />
    </View>
  );
}
