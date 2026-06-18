// Shared post-completion result view for inspection flows.
//
// Renders a full-screen WebView PDF preview plus a bottom bar with two
// outline buttons (Certificates · Signatures) side by side above the
// full-width accent (orange) Share button. The caller is responsible for
// building the preview HTML (each flow has its own PDF builder) and for the
// actual share action - this component only owns the UI shell, navigating to the
// certificates screen, the signatures modal + state, and the limit-notice
// modal.
//
// Signatures are owned here, not by the wizard. `useSignaturesState` lives
// in this component so the captured PNG dies the moment the result view
// unmounts. The snapshot is passed UP to the parent through `onDownloadPdf`
// when the user taps download, so each per-type screen can feed it into
// its own PDF builder without a global state hop.
//
// REGULATORY: the captured base64 PNG returned from the canvas is held in
// component state only. No persistence path lives in this file. See
// features/signatures/AGENTS.md.

import { createElement, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { CircleAlert, Paperclip, Pencil, Lock, Share2 } from 'lucide-react-native';
import WebView from 'react-native-webview';
import { A11yText as Text } from './primitives/A11yText';
import { Screen } from './ui';
import { consumeCertsDirty } from '../lib/certDirty';
import { SubscriptionNotice } from './SubscriptionNotice';
import { HeaderBackButton } from './HeaderBackButton';
import { useTheme } from '../lib/theme';
import { SkeletonPreview } from './Skeleton';
import {
  SignaturesScreen,
  useSignaturesState,
  type SignaturesSnapshot,
} from '../features/signatures';

export type { SignaturesSnapshot };

type Props = {
  inspectionId: string;
  templateName?: string;
  previewHtml: string | null;
  previewBusy: boolean;
  previewError: string | null;
  /** Number of certificate attachments, used for the badge label. */
  attachmentCount: number;
  /** Disables the download button + shows lock icon when true. */
  pdfLocked?: boolean;
  /**
   * Hide the Certificates + Signatures action-sheet buttons. Used by
   * equipment flows whose rows live outside the `inspections` table and so
   * don't satisfy the FK the certificates sheet writes (currently no
   * equipment flow passes this - it's preserved as an escape hatch).
   */
  hideSheets?: boolean;
  downloading?: boolean;
  limitNoticeVisible: boolean;
  /** Inspection creator's full name, pulled from the user profile by the
   *  parent. Shown above the signature canvas; never editable here. */
  creatorName: string;
  onLimitNoticeClose: () => void;
  /** Tap handler for the accent (orange) share button. Receives the current
   *  signatures snapshot; the parent passes it into its PDF builder. */
  onDownloadPdf: (signatures: SignaturesSnapshot) => void;
  /** Called after the certificates sheet saves a change so the caller can
   *  rebuild the preview. */
  onSheetSaved: () => void;
};

export function InspectionResultView(props: Props) {
  const {
    inspectionId,
    templateName,
    previewHtml,
    previewBusy,
    previewError,
    attachmentCount,
    pdfLocked,
    hideSheets,
    downloading,
    limitNoticeVisible,
    creatorName,
    onLimitNoticeClose,
    onDownloadPdf,
    onSheetSaved,
  } = props;

  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  // Signatures state - local to this result view. Lost when it unmounts.
  const signatures = useSignaturesState();
  const [signaturesOpen, setSignaturesOpen] = useState(false);

  const buildSnapshot = useCallback(
    (): SignaturesSnapshot => ({
      creatorSignature: signatures.creatorSignature,
      additionalRowsCount: signatures.additionalRows.length,
    }),
    [signatures.creatorSignature, signatures.additionalRows.length],
  );

  const openCertificatesSheet = () => {
    router.push(`/inspections/${inspectionId}/certificates` as never);
  };

  // Certificates is now a pushed screen. On return, rebuild the preview only if
  // a cert was actually saved/deleted (skips the first focus on mount).
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (consumeCertsDirty(inspectionId)) onSheetSaved();
    }, [inspectionId, onSheetSaved]),
  );

  const certBadge = attachmentCount > 0 ? `(${attachmentCount})` : '';

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: templateName ?? 'შემოწმების აქტი',
          headerBackVisible: false,
          headerLeft: () => <HeaderBackButton />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.ink },
        }}
      />
      <View style={styles.previewWrap}>
        {previewBusy && !previewHtml ? (
          <SkeletonPreview />
        ) : previewError && !previewHtml ? (
          <View style={styles.previewState}>
            <CircleAlert size={36} color={theme.colors.danger} strokeWidth={1.5} />
            <Text style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 12 }}>
              {previewError}
            </Text>
          </View>
        ) : previewHtml ? (
          Platform.OS === 'web'
            ? createElement('iframe', {
                srcDoc: previewHtml,
                style: { flex: 1, width: '100%', height: '100%', border: 'none' },
              })
            : (
              <WebView
                key={previewHtml.length}
                originWhitelist={['*']}
                source={{ html: previewHtml }}
                style={styles.webview}
                scalesPageToFit
                javaScriptEnabled={false}
                domStorageEnabled={false}
              />
            )
        ) : null}
      </View>

      <View style={styles.bottomBarSafe}>
        <View style={styles.bottomBar}>
          {!hideSheets && (
            <View style={styles.bottomBarRow}>
              <Pressable
                onPress={openCertificatesSheet}
                style={({ pressed }) => [styles.bottomBtn, styles.bottomBtnGhost, pressed && { opacity: 0.7 }]}
              >
                <Paperclip size={18} color={theme.colors.ink} strokeWidth={1.5} />
                <Text style={styles.bottomBtnText} numberOfLines={1}>
                  სერტიფიკატები {certBadge}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSignaturesOpen(true)}
                style={({ pressed }) => [styles.bottomBtn, styles.bottomBtnGhost, pressed && { opacity: 0.7 }]}
              >
                <Pencil size={18} color={theme.colors.ink} strokeWidth={1.5} />
                <Text style={styles.bottomBtnText} numberOfLines={1}>
                  ხელმოწერები
                </Text>
              </Pressable>
            </View>
          )}
          <Pressable
            onPress={() => onDownloadPdf(buildSnapshot())}
            disabled={downloading}
            style={({ pressed }) => [
              styles.bottomBtn,
              styles.bottomBtnPrimary,
              styles.bottomBtnFull,
              pressed && { opacity: 0.85 },
              downloading && { opacity: 0.6 },
            ]}
          >
            {downloading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <>
                {pdfLocked ? <Lock size={18} color={theme.colors.white} strokeWidth={1.5} /> : <Share2 size={18} color={theme.colors.white} strokeWidth={1.5} />}
                <Text style={[styles.bottomBtnText, { color: theme.colors.white }]} numberOfLines={1}>
                  {pdfLocked ? '🔒 გაზიარება' : 'გაზიარება'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <SubscriptionNotice visible={limitNoticeVisible} onClose={onLimitNoticeClose} />

      <SignaturesScreen
        visible={signaturesOpen}
        onClose={() => setSignaturesOpen(false)}
        creatorName={creatorName}
        state={signatures}
      />
    </Screen>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    previewWrap: {
      flex: 1,
      backgroundColor: theme.colors.subtleSurface,
    },
    previewState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    webview: {
      flex: 1,
      backgroundColor: '#fff',
    },
    bottomBarSafe: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
    },
    bottomBar: {
      flexDirection: 'column',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
    },
    bottomBarRow: {
      flexDirection: 'row',
      gap: 10,
    },
    bottomBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 48,
      borderRadius: 12,
    },
    bottomBtnGhost: {
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.surface,
    },
    bottomBtnPrimary: {
      backgroundColor: theme.colors.accent,
    },
    bottomBtnFull: {
      flex: 0,
    },
    bottomBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.ink,
    },
  });
}
