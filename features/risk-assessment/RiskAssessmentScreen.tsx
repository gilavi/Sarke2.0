// Editor for one რისკების შეფასება document (risk assessment OR PPE matrix).
// Header form (config-driven) + a list of row editors + signatures, with
// debounced autosave and an on-demand "share PDF" that finalizes the document.

import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, FileText } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';

import { A11yText as Text } from '../../components/primitives/A11yText';
import { Pressable } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Button } from '../../components/ui';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import { SkeletonListCard } from '../../components/Skeleton';

import { useTheme } from '../../lib/theme';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { useRiskAssessment, useProject } from '../../lib/apiHooks';
import { riskAssessmentApi } from '../../lib/riskAssessmentService';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { generatePdfName } from '../../lib/pdfName';
import { hashPdf } from '../../lib/pdfSecurity';
import { storageApi } from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';
import { invalidateRecordLists } from '../../lib/apiHooks';
import { logError } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import {
  buildRiskAssessmentPdfHtml,
  buildPpeDeterminationPdfHtml,
} from '../../lib/riskAssessmentPdf';
import {
  emptyHazardEntry, emptyPpeEntry,
  type RAEntry, type RASignatory, type RiskHazardEntry, type PpeEntry,
} from '../../types/riskAssessment';

import { RA_HEADER_FIELDS } from './riskAssessmentSchema';
import { RiskHazardRowCard } from './RiskHazardRowCard';
import { PpeRowCard } from './PpeRowCard';
import { RiskSignatures } from './RiskSignatures';
import { makeStyles } from './styles';

export function RiskAssessmentScreen() {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { t } = useTranslation();
  const { id: projectId, raId } = useLocalSearchParams<{ id: string; raId: string }>();

  const raQ = useRiskAssessment(raId);
  const { data: project } = useProject(projectId);
  const ra = raQ.data;

  const [header, setHeader] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<RAEntry[]>([]);
  const [signatories, setSignatories] = useState<Record<string, RASignatory>>({});
  const [sharing, setSharing] = useState(false);
  const hydrated = useRef(false);

  // Hydrate local state once from the loaded record.
  useEffect(() => {
    if (ra && !hydrated.current) {
      hydrated.current = true;
      setHeader(ra.header ?? {});
      setEntries(ra.entries ?? []);
      setSignatories(ra.signatories ?? {});
    }
  }, [ra]);

  // Debounced autosave.
  useEffect(() => {
    if (!hydrated.current || !raId) return;
    const tmr = setTimeout(() => {
      riskAssessmentApi.patch(raId, { header, entries, signatories }).catch((e) => logError(e, 'riskAssessment.autosave'));
    }, 800);
    return () => clearTimeout(tmr);
  }, [header, entries, signatories, raId]);

  const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
  const isPpe = ra?.docType === 'ppe_determination';

  const addRow = () =>
    setEntries((es) => [...es, isPpe ? emptyPpeEntry(Crypto.randomUUID()) : emptyHazardEntry(Crypto.randomUUID())]);
  const patchRow = (id: string, patch: Partial<RAEntry>) =>
    setEntries((es) => es.map((e) => (e.id === id ? ({ ...e, ...patch } as RAEntry) : e)));
  const removeRow = (id: string) => setEntries((es) => es.filter((e) => e.id !== id));

  const onSharePdf = async () => {
    if (!ra) return;
    setSharing(true);
    try {
      await riskAssessmentApi.patch(raId, { header, entries, signatories });
      const projectName = project?.company_name || project?.name || '';
      const full = { ...ra, header, entries, signatories };
      const html = isPpe
        ? buildPpeDeterminationPdfHtml({ assessment: full, projectName })
        : buildRiskAssessmentPdfHtml({ assessment: full, projectName });
      const slug = isPpe ? 'ids_gansazgvra' : 'riskebis_shefaseba';
      const pdfName = generatePdfName(projectName, slug, new Date(ra.createdAt), raId);
      const pdfPath = `risk-assessments/${pdfName}`;
      const localUri = await generateAndSharePdf(html, pdfName, true, userId, {
        title: isPpe ? 'ინდ. დაცვის საშუალებების განსაზღვრა' : 'რისკების შეფასება',
        documentId: raId,
        subject: 'შრომის უსაფრთხოება',
      });
      const pdfHash = localUri ? await hashPdf(localUri).catch(() => undefined) : undefined;
      if (localUri) {
        (async () => {
          try {
            await storageApi.uploadFromUri(STORAGE_BUCKETS.pdfs, pdfPath, localUri, 'application/pdf');
            await riskAssessmentApi.patch(raId, { pdfUrl: pdfPath, status: 'completed' });
            invalidateRecordLists(queryClient);
            FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
          } catch (e) {
            logError(e, 'riskAssessment.upload');
          }
        })();
      }
      void pdfHash;
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { toast.error(t('orders.pdfGenerateFailed')); return; }
      toast.error(friendlyError(e, t('orders.pdfGenerateFailed')));
    } finally {
      setSharing(false);
    }
  };

  if (!ra) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title={t('risk.title')} />
        <View style={{ flex: 1, padding: 16 }}><SkeletonListCard rows={6} /></View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={isPpe ? t('risk.ppeTitle') : t('risk.title')} onBack={() => router.back()} />

      <KeyboardSafeArea headerHeight={44} contentStyle={{ padding: 16, gap: 12 }}>
        <Text style={s.sectionTitle}>{t('risk.generalInfo')}</Text>
        {RA_HEADER_FIELDS[ra.docType].map((f) =>
          f.kind === 'date' ? (
            <DateTimeField
              key={f.key}
              label={t(f.labelKey)}
              value={new Date(header[f.key] || ra.createdAt)}
              onChange={(d) => setHeader((h) => ({ ...h, [f.key]: d.toISOString() }))}
              mode="date"
            />
          ) : (
            <FloatingLabelInput
              key={f.key}
              label={t(f.labelKey)}
              value={header[f.key] ?? ''}
              onChangeText={(v) => setHeader((h) => ({ ...h, [f.key]: v }))}
              multiline={f.kind === 'multiline'}
            />
          ),
        )}

        <Text style={s.sectionTitle}>{isPpe ? t('risk.positions') : t('risk.hazards')}</Text>
        {entries.map((e, i) =>
          isPpe ? (
            <PpeRowCard key={e.id} entry={e as PpeEntry} index={i} s={s} theme={theme}
              onChange={(p) => patchRow(e.id, p)} onRemove={() => removeRow(e.id)} />
          ) : (
            <RiskHazardRowCard key={e.id} entry={e as RiskHazardEntry} index={i} s={s} theme={theme}
              onChange={(p) => patchRow(e.id, p)} onRemove={() => removeRow(e.id)} />
          ),
        )}
        <Pressable onPress={addRow} style={s.addBtn}>
          <Plus size={18} color={theme.colors.accent} strokeWidth={1.5} />
          <Text style={s.addBtnText}>{isPpe ? t('risk.addPosition') : t('risk.addHazard')}</Text>
        </Pressable>

        <RiskSignatures docType={ra.docType} signatories={signatories} setSignatories={setSignatories} s={s} theme={theme} />
      </KeyboardSafeArea>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <Button title={t('orders.generatePdf')} leftIcon={FileText} loading={sharing} onPress={onSharePdf} style={{ width: '100%' }} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
