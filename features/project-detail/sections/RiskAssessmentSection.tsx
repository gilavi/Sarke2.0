// Risk-assessment (რისკების შეფასება) section of the project detail screen.
// Two document types share one register: a full risk assessment and a
// PPE-by-position matrix. Tapping a "+ create" link inserts a draft and routes
// to the editor.

import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ShieldAlert, ChevronRight, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SectionEmptyState } from '../../../components/EmptyState';
import { ViewMoreRow } from '../../../components/projects/ProjectRowHelpers';
import { SkeletonRow } from '../../../components/Skeleton';
import { useTheme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { a11y } from '../../../lib/accessibility';
import { riskAssessmentApi } from '../../../lib/riskAssessmentService';
import { queryClient } from '../../../lib/queryClient';
import { invalidateRecordLists } from '../../../lib/apiHooks';
import { friendlyError } from '../../../lib/errorMap';
import { fmtDate } from '../../../lib/pdfShared';
import { RA_DOC_TITLE, type RiskAssessment, type RADocType } from '../../../types/riskAssessment';
import { getStyles } from '../styles';

export function RiskAssessmentSection({
  id,
  riskAssessments,
  loading = false,
}: {
  id: string | undefined;
  riskAssessments: RiskAssessment[];
  loading?: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const toast = useToast();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const create = async (docType: RADocType) => {
    if (!id || creating) return;
    setCreating(true);
    try {
      const ra = await riskAssessmentApi.create({ projectId: id, docType });
      invalidateRecordLists(queryClient);
      router.push(`/projects/${id}/risk-assessment/${ra.id}` as any);
    } catch (e) {
      toast.error(friendlyError(e, t('risk.createFailed')));
    } finally {
      setCreating(false);
    }
  };

  const AddLink = ({ docType, label }: { docType: RADocType; label: string }) => (
    <Pressable
      onPress={() => create(docType)}
      disabled={creating}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, opacity: creating ? 0.5 : 1 }}
      {...a11y(label, undefined, 'button')}
    >
      <Plus size={16} color={theme.colors.accent} strokeWidth={1.6} />
      <Text style={styles.sectionAddLink}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={16} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={styles.sectionTitle}>{t('risk.sectionTitle')}</Text>
          <Text style={styles.sectionCount}>{riskAssessments.length}</Text>
        </View>
      </View>

      {loading && riskAssessments.length === 0 ? (
        <View style={{ gap: 8, marginTop: 10 }}><SkeletonRow /><SkeletonRow /></View>
      ) : riskAssessments.length === 0 ? (
        <SectionEmptyState type="documents" subtitle={t('risk.emptySubtitle')} />
      ) : (
        <View style={{ marginTop: 4 }}>
          {riskAssessments.slice(0, 3).map((ra, i, arr) => {
            const showBorder = i < arr.length - 1 || riskAssessments.length > 3;
            return (
              <Pressable
                key={ra.id}
                onPress={() => router.push(`/projects/${id}/risk-assessment/${ra.id}` as any)}
                style={[styles.listRow, showBorder && styles.listRowBorder]}
                {...a11y(RA_DOC_TITLE[ra.docType], undefined, 'button')}
              >
                <View style={[styles.statusIcon, { backgroundColor: theme.colors.subtleSurface }]}>
                  <ShieldAlert size={14} color={theme.colors.inkSoft} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle}>{RA_DOC_TITLE[ra.docType]}</Text>
                  <Text style={styles.listRowSubtitle}>
                    {fmtDate(ra.createdAt)} · {t('risk.entriesCount', { count: ra.entries.length })}
                    {ra.status === 'completed' ? ` · ${t('risk.statusCompleted')}` : ''}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
              </Pressable>
            );
          })}
          {riskAssessments.length > 3 ? (
            <ViewMoreRow
              items={riskAssessments.slice(3).map(() => ({ category: null }))}
              total={riskAssessments.length - 3}
              onPress={() => router.push(`/projects/${id}/risk-assessment/${riskAssessments[0].id}` as any)}
            />
          ) : null}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
        <AddLink docType="risk_assessment" label={t('risk.addRiskAssessment')} />
        <AddLink docType="ppe_determination" label={t('risk.addPpe')} />
      </View>
    </>
  );
}
