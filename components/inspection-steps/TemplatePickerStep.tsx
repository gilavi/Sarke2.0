// First step of the "start a შემოწმების აქტი" flow: pick the inspection
// template (type) from a 2-column grid of illustration cards. Replaces the old
// `CustomDropdown` action sheet that used to pop up from Home / a project.
//
// Tapping a card calls `onSelect` immediately — the flow advances on selection,
// so this step has no Next button (the parent hides the shell footer). Nothing
// is persisted here; the inspection row is only created once the flow reaches
// the wizard (see lib/inspection/startFlow.ts + app/inspections/new.tsx).
import { useMemo } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { InspectionTypeAvatar } from '../InspectionTypeAvatar';
import { Selector, type SelectorOption } from '../ui/Selector';
import { useTemplates } from '../../lib/apiHooks';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { useTheme } from '../../lib/theme';
import type { Template } from '../../types/models';

interface TemplatePickerStepProps {
  selectedId: string | null;
  onSelect: (template: Template) => void;
}

/** Responsive illustration size: fill the 2-column card on any phone width. */
function useIluSize() {
  const { width } = useWindowDimensions();
  // content padding 16*2, inter-card gap ~12, card padding 10*2 → inner width.
  const inner = (width - 32 - 12) / 2 - 20;
  return Math.max(84, Math.min(132, Math.round(inner)));
}

export function TemplatePickerStep({ selectedId, onSelect }: TemplatePickerStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const iluSize = useIluSize();
  const templatesQ = useTemplates();

  const system = useMemo(
    () => (templatesQ.data ?? []).filter((tpl) => tpl.is_system),
    [templatesQ.data],
  );

  // Canonical three-state guard (CLAUDE.md): skeleton until the query produces a
  // real answer, so a stale cached [] never flashes the empty state.
  const loading = (templatesQ.isFetching || !templatesQ.isFetched) && system.length === 0;

  const Caption = (
    <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 }}>
      <Text style={{ fontSize: 19, fontWeight: '700', color: theme.colors.ink, letterSpacing: -0.2 }}>
        {t('inspections.chooseTemplate')}
      </Text>
      <Text style={{ marginTop: 3, fontSize: 13, color: theme.colors.inkSoft }}>
        {t('inspections.chooseTemplateSubtitle')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        {Caption}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingHorizontal: 16, paddingTop: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={{ width: '48%', height: iluSize + 72, borderRadius: 18, backgroundColor: theme.colors.subtleSurface }}
            />
          ))}
        </View>
      </View>
    );
  }

  const options = system.map<SelectorOption>((tpl) => ({
    value: tpl.id,
    label: inspectionDisplayName(tpl.name),
    leading: <InspectionTypeAvatar category={tpl.category} size={iluSize} transparent />,
  }));

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {Caption}
      {system.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: theme.colors.inkFaint, textAlign: 'center' }}>
            {t('errors.notFoundTemplate')}
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Selector
            presentation="grid"
            indicator="check"
            value={selectedId}
            onChange={(id) => {
              const tpl = system.find((x) => x.id === id);
              if (tpl) onSelect(tpl);
            }}
            options={options}
          />
        </View>
      )}
    </ScrollView>
  );
}
