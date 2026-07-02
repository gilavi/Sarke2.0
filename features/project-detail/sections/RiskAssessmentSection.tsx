// Risk-assessment (რისკების შეფასება) section of the project detail screen.
// Two document types share one register: a full risk assessment and a
// PPE-by-position matrix. Tapping a "+ create" link inserts a draft (through
// the offline outbox — queued when there is no network) and routes to the
// editor, which opens off the seeded detail cache.

import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ShieldAlert, ChevronRight, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SectionEmptyState } from '../../../components/EmptyState';
import { SkeletonRow } from '../../../components/Skeleton';
import { useTheme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { a11y } from '../../../lib/accessibility';
import { saveRecordThroughOutbox } from '../../../lib/outbox';
import { queryClient } from '../../../lib/queryClient';
import { invalidateRecordLists, qk } from '../../../lib/apiHooks';
import { friendlyError } from '../../../lib/errorMap';
import { fmtDate } from '../../../lib/pdf/order/_shared';
import { type RiskAssessment, type RADocType } from '../../../types/riskAssessment';
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
  const session = useSession();
  const [creating, setCreating] = useState(false);

  const create = async (docType: RADocType) => {
    if (!id || creating) return;
    setCreating(true);
    try {
      // Client-generated id so an offline create can be queued and the editor
      // can open immediately off the seeded detail cache.
      const raId = Crypto.randomUUID();
      const now = new Date().toISOString();
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : '';
      const optimistic: RiskAssessment = {
        id: raId,
        projectId: id,
        userId,
        docType,
        header: {},
        entries: [],
        signatories: {},
        status: 'draft',
        pdfUrl: null,
        createdAt: now,
        updatedAt: now,
      };
      const res = await saveRecordThroughOutbox({
        entity: 'risk_assessment',
        mode: 'create',
        recordId: raId,
        payload: { projectId: id, docType, id: raId },
        displayTitle: 'რისკების შეფასება',
        projectId: id,
        detailKey: qk.riskAssessment.byId(raId),
        optimistic,
      });
      if (res.queued) toast.success(t('components.savedOffline'));
      invalidateRecordLists(queryClient);
      router.push(`/projects/${id}/risk-assessment/${raId}` as any);
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
          {riskAssessments.map((ra, i, arr) => {
            const title = ra.docType === 'ppe_determination' ? t('risk.ppeTitle') : t('risk.title');
            return (
              <Pressable
                key={ra.id}
                onPress={() => router.push(`/projects/${id}/risk-assessment/${ra.id}` as any)}
                style={[styles.listRow, i < arr.length - 1 && styles.listRowBorder]}
                {...a11y(title, undefined, 'button')}
              >
                <View style={[styles.statusIcon, { backgroundColor: theme.colors.subtleSurface }]}>
                  <ShieldAlert size={14} color={theme.colors.inkSoft} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowTitle}>{title}</Text>
                  <Text style={styles.listRowSubtitle}>
                    {fmtDate(ra.createdAt)} · {t('risk.entriesCount', { count: ra.entries.length })}
                    {ra.status === 'completed' ? ` · ${t('risk.statusCompleted')}` : ''}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
        <AddLink docType="risk_assessment" label={t('risk.addRiskAssessment')} />
        <AddLink docType="ppe_determination" label={t('risk.addPpe')} />
      </View>
    </>
  );
}
