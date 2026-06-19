import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { PressBounce } from '../animations/PressBounce';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { ReportSlideLayout } from '../../types/models';

interface SlideLayoutPickerProps {
  /** Valid layouts for the slide's current photo count (from `layoutsForCount`). */
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

/**
 * Layout chooser shown under the photo strip in the slide editor. Only the
 * layouts valid for the current photo count are passed in, and the picker hides
 * itself entirely when there's no real choice (≤1 option) — see the editor. Each
 * chip is a small glyph mirroring how the slide renders in the PDF.
 */
export function SlideLayoutPicker({ layouts, value, onChange }: SlideLayoutPickerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>განლაგება</Text>
      <View style={styles.row}>
        {layouts.map(l => {
          const active = l === value;
          return (
            <PressBounce
              key={l}
              scaleTo={0.96}
              hapticOnPress="light"
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(l)}
              {...a11y(LABELS[l], active ? 'არჩეული განლაგება' : 'განლაგების არჩევა', 'button')}
            >
              <View style={styles.glyphBox}>
                <LayoutGlyph layout={l} theme={theme} />
              </View>
              <Text style={[styles.chipLabel, active && { color: theme.colors.accent }]} numberOfLines={1}>
                {LABELS[l]}
              </Text>
            </PressBounce>
          );
        })}
      </View>
    </View>
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
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ gap: 2 }}>
          <View style={bar('85%')} />
          <View style={bar('65%')} />
        </View>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          <View style={photo} />
          <View style={photo} />
        </View>
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

function makeStyles(theme: any) {
  return StyleSheet.create({
    label: { fontSize: 12, color: theme.colors.inkFaint, fontWeight: '700' },
    row: { flexDirection: 'row', gap: 8 },
    chip: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.surface,
      padding: 8,
      gap: 6,
      alignItems: 'center',
    },
    chipActive: {
      borderColor: theme.colors.accent,
      borderWidth: 1.5,
      backgroundColor: theme.colors.accentSoft,
    },
    glyphBox: { width: '100%', height: 38, padding: 4, justifyContent: 'center' },
    chipLabel: { fontSize: 11, color: theme.colors.inkSoft, fontWeight: '600' },
  });
}
