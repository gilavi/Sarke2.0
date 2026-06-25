import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated as RNAnimated, AppState, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Card } from '../../components/ui';
import { useRecentInspections, useTemplates } from '../../lib/apiHooks';
import { deleteInspectionBySource } from '../../lib/inspectionDelete';
import { useTheme, withOpacity, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { routeForInspection } from '../../lib/inspectionRouting';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import { relativeTime } from '../../lib/homeUtils';

// Wizard AsyncStorage step-key + total-step maps. Ported verbatim from the old
// Home recent-activity block — the resume card is the only consumer now.
function stepKeyFor(category: string | null | undefined, id: string): string {
  const map: Record<string, string> = {
    xaracho: 'wizard', mobile_scaffold: 'wizard',
    harness: 'harness-wizard',
    bobcat: 'bobcat-wizard', excavator: 'excavator-wizard',
    general_equipment: 'ge-wizard', cargo_platform: 'cargo-platform-wizard',
    safety_net_inspection: 'safety-net-wizard',
    mobile_ladder_inspection: 'mobile-ladder-wizard',
    fall_protection_inspection: 'fall-protection-wizard-v2',
    lifting_accessories_inspection: 'lifting-accessories-wizard',
    forklift_inspection: 'forklift-wizard',
  };
  return `${map[category ?? ''] ?? 'wizard'}:${id}:step`;
}

const STEP_TOTALS: Record<string, number> = {
  harness: 3, bobcat: 4, excavator: 5, general_equipment: 3, cargo_platform: 6,
  safety_net_inspection: 6, mobile_ladder_inspection: 5, fall_protection_inspection: 4,
  lifting_accessories_inspection: 6, forklift_inspection: 3,
};

/**
 * The single most-recent inspection draft, pinned at the top of Home as an
 * orange "resume" card — the ONLY draft surface on Home. Every other draft
 * lives in the Drafts screen (More tab). Reads the wizard step from
 * AsyncStorage (refreshed on app-foreground) for the progress bar, and
 * supports swipe-to-delete. Renders nothing when there are no drafts.
 */
export function ResumeDraftCard() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const router = useRouter();
  const qc = useQueryClient();

  const draftQ = useRecentInspections({ status: 'draft', limit: 1 });
  const templatesQ = useTemplates();
  const draft = (draftQ.data ?? [])[0];
  const templates = templatesQ.data ?? [];
  const tpl = draft ? templates.find((x) => x.id === draft.template_id) : undefined;

  const [step, setStep] = useState(0);
  const loadStep = useCallback(async () => {
    if (!draft) return;
    const raw = await AsyncStorage.getItem(stepKeyFor(tpl?.category, draft.id));
    setStep(raw ? parseInt(raw, 10) : 0);
  }, [draft, tpl?.category]);

  useEffect(() => { void loadStep(); }, [loadStep]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void loadStep(); });
    return () => sub.remove();
  }, [loadStep]);

  const [isDeleted, setIsDeleted] = useState(false);
  const swipeableRef = useRef<Swipeable>(null);
  const deleteOpacity = useRef(new RNAnimated.Value(1)).current;
  const deleteScale = useRef(new RNAnimated.Value(1)).current;

  const handleDelete = useCallback(async () => {
    if (!draft) return;
    swipeableRef.current?.close();
    await new Promise<void>((resolve) => {
      RNAnimated.parallel([
        RNAnimated.timing(deleteOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        RNAnimated.timing(deleteScale, { toValue: 0.94, duration: 160, useNativeDriver: true }),
      ]).start(() => resolve());
    });
    setIsDeleted(true);
    try {
      await deleteInspectionBySource(tpl?.category ?? undefined, draft.id);
      await qc.invalidateQueries({ queryKey: ['inspections', 'recent'] });
    } catch {
      Alert.alert(t('common.error'), t('common.deleteFailed'));
      setIsDeleted(false);
      deleteOpacity.setValue(1);
      deleteScale.setValue(1);
    }
  }, [draft, tpl?.category, qc, t, deleteOpacity, deleteScale]);

  if (isDeleted || !draft) return null;

  const totalSteps = STEP_TOTALS[tpl?.category ?? ''] ?? 0;

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
      <RNAnimated.View style={{ opacity: deleteOpacity, transform: [{ scale: deleteScale }] }}>
        <Swipeable
          ref={swipeableRef}
          friction={2}
          rightThreshold={40}
          overshootRight={false}
          renderRightActions={() => (
            <Pressable onPress={handleDelete} style={styles.deleteAction} {...a11y(t('common.delete'), undefined, 'button')}>
              <Trash2 size={22} color={theme.colors.white} strokeWidth={1.5} />
              <Text style={styles.deleteActionText}>{t('common.delete')}</Text>
            </Pressable>
          )}
        >
          <Card
            onPress={() => router.push(routeForInspection(tpl?.category, draft.id, false) as never)}
            a11y={a11y(t('a11y.resumeDraft'), t('home.resumeDraftHint'), 'button')}
            style={styles.resumeCard}
            padding="none"
          >
            {/* Orange accent rail + content column — the original resume-card
                identity (restored after the History/Drafts extraction flattened
                it). */}
            <View style={styles.resumeAccent} />
            <View style={styles.resumeContent}>
              <View style={styles.resumeTopRow}>
                <Text style={styles.resumeTitle} numberOfLines={1}>{inspectionDisplayName(tpl?.name)}</Text>
                <View style={styles.resumePill}><Text style={styles.resumePillText}>{t('home.lastDraft')}</Text></View>
              </View>
              {totalSteps > 0 ? (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min((step / totalSteps) * 100, 100)}%` as `${number}%` }]} />
                </View>
              ) : null}
              <View style={styles.resumeBottomRow}>
                {step > 0 ? (
                  <Text style={styles.resumeStepLabel}>{t('home.stepLabel', { step })}</Text>
                ) : (
                  <View />
                )}
                <Text style={styles.resumeMeta}>{relativeTime(draft.created_at, t, i18n.language)}</Text>
              </View>
            </View>
          </Card>
        </Swipeable>
      </RNAnimated.View>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    // Row layout: a 4px orange rail on the left, content column on the right.
    resumeCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.hairline,
      overflow: 'hidden',
    },
    resumeAccent: { width: 4, backgroundColor: '#FF6D2E' },
    resumeContent: { flex: 1, padding: 14, gap: 8 },
    resumeTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    resumeTitle: { flex: 1, color: theme.colors.ink, fontSize: 15, fontWeight: '800' },
    resumePill: { backgroundColor: theme.colors.neutral[900], borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
    resumePillText: {
      color: theme.colors.highlight, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
    },
    resumeBottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
    resumeStepLabel: { color: theme.colors.inkSoft, fontSize: 11, fontWeight: '600' },
    resumeMeta: { color: theme.colors.inkSoft, fontSize: 11 },
    progressTrack: {
      height: 2, borderRadius: 1, backgroundColor: withOpacity(theme.colors.ink, 0.1), overflow: 'hidden',
    },
    progressFill: { height: 2, borderRadius: 1, backgroundColor: withOpacity(theme.colors.ink, 0.35) },
    deleteAction: {
      backgroundColor: theme.colors.danger, justifyContent: 'center', alignItems: 'center',
      width: 72, borderRadius: 14, marginLeft: 8, marginRight: 20, marginVertical: 2, gap: 4,
    },
    deleteActionText: { color: theme.colors.white, fontSize: 11, fontWeight: '700' },
  });
}
