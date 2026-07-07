// SuccessSignatureSection — the "Signatures" list on the FlowSuccessScreen.
//
// Two modes, matching the reference:
//  • edit (act / incident): shows the creator row (signed once a signature is
//    captured, otherwise awaiting) + one row per blank hand-sign slot + an
//    "Add person" row. Any row opens the EXISTING SignaturesScreen modal
//    (features/signatures) — we do NOT build a new sheet. The inline list is
//    just a live mirror of `useSignaturesState`; it re-renders when the modal
//    mutates that state. Per the regulatory rule, captured signatures live only
//    in that state (never persisted) and the extra rows hold no data — they
//    print as blank lines for wet hand-signing. See features/signatures/AGENTS.md.
//  • view (instruction): read-only list of the people who already signed during
//    the flow — an eye icon instead of a chevron and a "View only" tag, no add
//    row, rows are non-interactive.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Eye, Plus } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { Badge } from '../primitives/Badge';
import { useTheme, type Theme } from '../../lib/theme';
import { SignaturesScreen, type SignaturesState } from '../../features/signatures';
import { SuccessListRow, RowAvatar, RowEmptyAvatar, RowLead } from './SuccessListRow';

export interface SuccessParticipant {
  name: string;
  signed: boolean;
}

interface Props {
  mode: 'edit' | 'view';
  /** Editable signing state (edit mode). */
  signatures?: SignaturesState;
  /** Creator's full name shown on the creator row + passed to the modal. */
  creatorName?: string;
  /** People who signed during the flow (view mode). */
  participants?: SuccessParticipant[];
  /** Share/generate the document PDF (the host screen's existing footer
   *  action). When provided, the SignaturesScreen modal shows a "PDF"
   *  share pill in its header instead of the X close button; pressing it
   *  closes the modal and fires this. */
  onSharePdf?: () => void;
  /** True while the host's share flow runs — disables the modal's pill. */
  sharing?: boolean;
}

export function SuccessSignatureSection({ mode, signatures, creatorName, participants, onSharePdf, sharing }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [open, setOpen] = useState(false);

  // Pressing the modal's "PDF" pill must NOT fire onSharePdf in the same
  // commit that dismisses the fullscreen Modal: the hosts' handlers
  // synchronously present a sibling Modal (SubscriptionNotice) or a share
  // sheet, and iOS drops a present issued while the presenter is still
  // dismissing. On iOS we arm a flag and fire from the Modal's onDismiss
  // (post-animation); Android has no such race (and no onDismiss), so it
  // fires immediately. The flag also swallows double-taps on the pill.
  const pendingShare = useRef(false);
  useEffect(() => {
    if (open) pendingShare.current = false;
  }, [open]);

  const requestShare = () => {
    if (!onSharePdf || pendingShare.current) return;
    pendingShare.current = true;
    setOpen(false);
    if (Platform.OS !== 'ios') onSharePdf();
  };

  const handleModalDismiss = () => {
    if (pendingShare.current && Platform.OS === 'ios') onSharePdf?.();
    pendingShare.current = false;
  };

  const SignedPill = () => <Badge variant="success">{t('success.signatures.signed')}</Badge>;
  const AwaitingPill = () => <Badge variant="default">{t('success.signatures.awaiting')}</Badge>;
  const trailIcon =
    mode === 'view' ? (
      <Eye size={18} color={theme.colors.inkFaint} strokeWidth={1.8} />
    ) : (
      <ChevronRight size={18} color={theme.colors.inkFaint} strokeWidth={1.8} />
    );

  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{t('success.signatures.heading')}</Text>
        {mode === 'view' ? (
          <View style={styles.viewTag}>
            <Text style={styles.viewTagText}>{t('success.signatures.viewOnly')}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.list}>
        {mode === 'view'
          ? (participants ?? []).map((p, i) => (
              <SuccessListRow
                key={`${p.name}-${i}`}
                isFirst={i === 0}
                lead={p.signed ? <RowAvatar name={p.name} /> : <RowEmptyAvatar />}
                title={p.name}
                subtitle={t('success.signatures.participant')}
                trailing={
                  <>
                    {p.signed ? <SignedPill /> : <AwaitingPill />}
                    {trailIcon}
                  </>
                }
              />
            ))
          : null}

        {mode === 'edit' && signatures ? (
          <>
            <SuccessListRow
              isFirst
              lead={
                signatures.creatorSignature ? <RowAvatar name={creatorName ?? ''} /> : <RowEmptyAvatar />
              }
              title={creatorName || t('success.signatures.you')}
              subtitle={t('success.signatures.you')}
              onPress={() => setOpen(true)}
              a11yLabel={t('success.a11y.openSignatures')}
              trailing={
                <>
                  {signatures.creatorSignature ? <SignedPill /> : <AwaitingPill />}
                  {trailIcon}
                </>
              }
            />
            {signatures.additionalRows.map((row) => (
              <SuccessListRow
                key={row.id}
                lead={<RowEmptyAvatar />}
                title={t('success.signatures.blankLine')}
                subtitle={t('success.signatures.emptyField')}
                onPress={() => setOpen(true)}
                a11yLabel={t('success.a11y.openSignatures')}
                trailing={trailIcon}
              />
            ))}
            <SuccessListRow
              accent
              lead={<RowLead icon={Plus} dashed />}
              title={t('success.signatures.addPerson')}
              subtitle={t('success.signatures.addHint')}
              onPress={() => setOpen(true)}
              a11yLabel={t('success.signatures.addPerson')}
            />
          </>
        ) : null}
      </View>

      {mode === 'edit' && signatures ? (
        <SignaturesScreen
          visible={open}
          onClose={() => setOpen(false)}
          creatorName={creatorName ?? ''}
          state={signatures}
          onSharePdf={onSharePdf ? requestShare : undefined}
          sharing={sharing}
          onDismiss={handleModalDismiss}
        />
      ) : null}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    section: { marginTop: 24 },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 4 },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.inkFaint },
    viewTag: {
      backgroundColor: theme.colors.surfaceSecondary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: theme.radius.full,
    },
    viewTagText: { fontSize: 11, fontWeight: '600', color: theme.colors.inkFaint },
    list: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
      overflow: 'hidden',
    },
  });
}
