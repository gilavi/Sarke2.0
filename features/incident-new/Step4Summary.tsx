import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Check, Pencil, TriangleAlert } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { incidentColors } from '../../lib/statusColors';
import { imageForDisplay } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { formatShortDateTime } from '../../lib/formatDate';
import { INCIDENT_TYPE_FULL_LABEL } from '../../types/models';
import type { Project } from '../../types/models';
import type { FormData } from './incidentFormSchema';
import type { IncidentStyles } from './styles';

// ─── Step 4 - summary + sign ──────────────────────────────────────────────────

export const Step4Summary = React.memo(function Step4Summary({
  form, inspectorName, sigPath, project, theme, isDark, s, t,
}: {
  form: FormData;
  inspectorName: string;
  sigPath: string | null;
  project: Project | null;
  theme: any;
  isDark: boolean;
  s: IncidentStyles;
  t: (key: string) => string;
}) {
  const [sigDisplayUrl, setSigDisplayUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sigPath) return;
    imageForDisplay(STORAGE_BUCKETS.signatures, sigPath)
      .then(setSigDisplayUrl)
      .catch(() => null);
  }, [sigPath]);

  const badge = form.type ? incidentColors(isDark)[form.type] : null;

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('incidents.step4Title')}</Text>

      {/* Summary card */}
      <View style={s.summaryCard}>
        {form.type && badge && (
          <View style={s.summaryBadge}>
            <View style={[s.summaryBadgeDot, { backgroundColor: badge.border }]} />
            <Text style={s.summaryBadgeText}>
              {INCIDENT_TYPE_FULL_LABEL[form.type]}
            </Text>
          </View>
        )}

        <SummaryRow
          label={t('common.project')}
          value={project?.name ?? '-'}
          theme={theme}
          s={s}
        />
        {form.type !== 'nearmiss' && form.injuredName ? (
          <SummaryRow
            label={t('incidents.summaryInjured')}
            value={`${form.injuredName}${form.injuredRole ? ` - ${form.injuredRole}` : ''}`}
            theme={theme}
            s={s}
          />
        ) : null}
        <SummaryRow
          label={t('common.date')}
          value={formatShortDateTime(form.dateTime.toISOString())}
          theme={theme}
          s={s}
        />
        <SummaryRow
          label={t('incidents.fieldLocation')}
          value={form.location || '-'}
          theme={theme}
          s={s}
        />
        {form.witnesses.length > 0 && (
          <SummaryRow
            label={t('incidents.sectionWitnesses')}
            value={form.witnesses.join(', ')}
            theme={theme}
            s={s}
          />
        )}
        {form.photos.length > 0 && (
          <SummaryRow
            label={t('incidents.summaryPhotos')}
            value={`${form.photos.length} ${t('incidents.photosUnit')}`}
            theme={theme}
            s={s}
          />
        )}
      </View>

      {/* Inspector signed row */}
      <View style={s.inspectorRow}>
        <View style={s.inspectorSigBox}>
          {sigDisplayUrl ? (
            <Image
              source={{ uri: sigDisplayUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
            />
          ) : (
            <Pencil size={20} color={theme.colors.inkFaint} strokeWidth={1.5} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.inspectorName}>{inspectorName || t('incidents.specialistFallback')}</Text>
          <Text style={s.inspectorRole}>{t('incidents.inspectorRole')}</Text>
        </View>
        <View style={s.signedChip}>
          <Check size={13} color={theme.colors.semantic.success} strokeWidth={1.5} />
          <Text style={s.signedChipText}>{t('incidents.signedChip')}</Text>
        </View>
      </View>

      {(form.type === 'severe' || form.type === 'fatal') && (
        <View style={s.warningBanner}>
          <TriangleAlert size={18} color={theme.colors.danger} strokeWidth={1.5} />
          <Text style={s.warningBannerText}>
            {t('incidents.labourNoticeWarning')}
          </Text>
        </View>
      )}
    </View>
  );
});

function SummaryRow({
  label, value, theme, s,
}: {
  label: string;
  value: string;
  theme: any;
  s: IncidentStyles;
}) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}
