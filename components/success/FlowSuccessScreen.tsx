// FlowSuccessScreen — the unified post-completion success screen shared by the
// act, incident, report and instruction flows.
//
// One parameterized screen: the `flow` prop selects the title/subtitle, whether
// signatures show (and edit vs view), whether certificates show, and the hero
// status pill default. Everything else — the black check disc, the back/edit
// button, the Share-PDF pill, the quiet "Back to home" link — is identical
// across flows. It is PRESENTATIONAL: each route loads its own data and passes
// the signing state, certificate items, hero, and the share/back handlers in.
//
// Reuses DS primitives only (Button, IconButton, Badge, A11yText) and the
// existing SignaturesScreen modal + CertificatesManager screen (opened from the
// sections). No new design tokens. See components/success/AGENTS.md.
import { useEffect, useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { haptic } from '../../lib/haptics';
import type { SignaturesState } from '../../features/signatures';
import { SuccessCheckDisc } from './SuccessCheckDisc';
import { SuccessSignatureSection, type SuccessParticipant } from './SuccessSignatureSection';
import { SuccessCertificateSection, type SuccessCertificateItem } from './SuccessCertificateSection';

export type SuccessFlow = 'act' | 'incident' | 'report' | 'instruction';
export interface SuccessHero {
  tone: 'safe' | 'severe';
  label: string;
}

const FLOW_CONFIG: Record<
  SuccessFlow,
  { titleKey: string; subtitleKey: string; signatures: 'edit' | 'view' | false; certificates: boolean }
> = {
  act: { titleKey: 'success.act.title', subtitleKey: 'success.act.subtitle', signatures: 'edit', certificates: true },
  incident: { titleKey: 'success.incident.title', subtitleKey: 'success.incident.subtitle', signatures: 'edit', certificates: false },
  report: { titleKey: 'success.report.title', subtitleKey: 'success.report.subtitle', signatures: false, certificates: false },
  instruction: { titleKey: 'success.instruction.title', subtitleKey: 'success.instruction.subtitle', signatures: 'view', certificates: false },
};

export interface FlowSuccessScreenProps {
  flow: SuccessFlow;
  /** Override the flow's default title/subtitle. */
  title?: string;
  subtitle?: string;
  /** Hero status pill. Omit for the flow default (act→safe, incident→severe); pass `null` to hide. */
  hero?: SuccessHero | null;
  /** Editable signing state (act/incident). */
  signatures?: SignaturesState;
  creatorName?: string;
  /** People who signed during the flow (instruction, view-only). */
  participants?: SuccessParticipant[];
  /** Attached certificates (act). */
  certificates?: SuccessCertificateItem[];
  onAddCertificate?: () => void;
  onOpenCertificate?: (id: string) => void;
  /** Top-left back-to-edit control. Omit to hide. */
  onBackEdit?: () => void;
  onSharePdf: () => void;
  sharing?: boolean;
  pdfLocked?: boolean;
  onBackHome: () => void;
  /** Extra summary content rendered under the hero (e.g. report slide previews). */
  children?: ReactNode;
}

export function FlowSuccessScreen(props: FlowSuccessScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const cfg = FLOW_CONFIG[props.flow];

  useEffect(() => {
    const id = setTimeout(() => haptic.inspectionComplete(), 400);
    return () => clearTimeout(id);
  }, []);

  const title = props.title ?? t(cfg.titleKey);
  const subtitle = props.subtitle ?? t(cfg.subtitleKey);
  const hero =
    props.hero === undefined
      ? props.flow === 'act'
        ? { tone: 'safe' as const, label: t('success.status.safe') }
        : props.flow === 'incident'
          ? { tone: 'severe' as const, label: t('success.status.severe') }
          : null
      : props.hero;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {props.onBackEdit ? (
          <View style={styles.topbar}>
            <IconButton
              icon={ChevronLeft}
              variant="outline"
              size="md"
              onPress={props.onBackEdit}
              a11yLabel={t('success.a11y.back')}
            />
          </View>
        ) : null}

        <View style={styles.hero}>
          <SuccessCheckDisc />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {hero ? (
            <View style={styles.heroPill}>
              <Badge variant={hero.tone === 'severe' ? 'danger' : 'success'}>{hero.label}</Badge>
            </View>
          ) : null}
        </View>

        {props.children}

        {cfg.signatures ? (
          <SuccessSignatureSection
            mode={cfg.signatures}
            signatures={props.signatures}
            creatorName={props.creatorName}
            participants={props.participants}
          />
        ) : null}

        {cfg.certificates && props.certificates && props.onOpenCertificate && props.onAddCertificate ? (
          <SuccessCertificateSection
            items={props.certificates}
            onOpen={props.onOpenCertificate}
            onAdd={props.onAddCertificate}
          />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={props.pdfLocked ? t('success.actions.sharePdfLocked') : t('success.actions.sharePdf')}
          onPress={props.onSharePdf}
          loading={props.sharing}
          size="xl"
          leftIcon={Share2}
          style={{ alignSelf: 'stretch', justifyContent: 'center' }}
        />
        <Pressable
          onPress={props.onBackHome}
          style={styles.secondary}
          {...a11y(t('success.actions.backHome'), undefined, 'button')}
        >
          <Text style={styles.secondaryText}>{t('success.actions.backHome')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 24 },
    topbar: { flexDirection: 'row' },
    hero: { alignItems: 'center', textAlign: 'center', paddingVertical: 8 },
    title: { fontSize: 26, fontWeight: '700', color: theme.colors.ink, textAlign: 'center', marginTop: 24 },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      marginTop: 6,
      maxWidth: 290,
    },
    heroPill: { marginTop: 12 },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
    secondary: { alignItems: 'center', justifyContent: 'center', height: 46 },
    secondaryText: { fontSize: 15, fontWeight: '600', color: theme.colors.inkSoft },
  });
}
