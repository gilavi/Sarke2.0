import { useMemo } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Selector, type SelectorOption } from '../ui/Selector';
import { useTheme } from '../../lib/theme';
import type { ReportSlideLayout } from '../../types/models';

interface Props {
  /** Valid layouts for the current photo count (from `layoutsForCount`). */
  layouts: ReportSlideLayout[];
  value: ReportSlideLayout;
  onChange: (layout: ReportSlideLayout) => void;
}


/**
 * Layout chooser for the slide editor, built on the canonical {@link Selector}
 * (the same monochrome form picker used across the inspection flow) — each row
 * is a layout with a little schematic glyph + label + one-line hint. Only the
 * layouts valid for the current photo count are passed in; the editor hides the
 * field entirely when there's no real choice.
 */
export function SlideLayoutField({ layouts, value, onChange }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const LABELS: Record<ReportSlideLayout, string> = {
    'text-photo': t('reports.layoutTextPhoto'),
    'photo-full': t('reports.layoutPhotoFull'),
    'two-side': t('reports.layoutTwoSide'),
    'two-stacked': t('reports.layoutTwoStacked'),
  };

  const SUBTITLES: Record<ReportSlideLayout, string> = {
    'text-photo': t('reports.subtitleTextPhoto'),
    'photo-full': t('reports.subtitlePhotoFull'),
    'two-side': t('reports.subtitleTwoSide'),
    'two-stacked': t('reports.subtitleTwoStacked'),
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layouts, theme, t],
  );

  return (
    <Selector
      label={t('reports.layout')}
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
