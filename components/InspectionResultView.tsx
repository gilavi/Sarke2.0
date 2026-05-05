// Shared post-completion result view for inspection flows.
//
// Renders a full-screen WebView PDF preview plus a bottom bar with three
// buttons: Certificates, Signatures, Download. The caller is responsible
// for building the preview HTML (each flow has its own PDF builder) and
// for the download action — this component only owns the UI shell, the
// action sheets, and the paywall modal.

import { createElement, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { A11yText as Text } from './primitives/A11yText';
import { Screen } from './ui';
import { CertificatesActionSheet } from './CertificatesActionSheet';
import { SignaturesActionSheet } from './SignaturesActionSheet';
import { useBottomSheet } from './BottomSheet';
import { PaywallModal } from './PaywallModal';
import { useTheme } from '../lib/theme';
import type { SignerRole } from '../types/models';

type Props = {
  inspectionId: string;
  templateName?: string;
  /** Empty array is fine for equipment flows (no required roles). */
  requiredSignerRoles: SignerRole[];
  previewHtml: string | null;
  previewBusy: boolean;
  previewError: string | null;
  /** Number of signed signatures, used for the badge label. */
  signedCount: number;
  /** Total signature slots (max of required roles + existing rows). */
  totalSlots: number;
  /** Number of certificate attachments, used for the badge label. */
  attachmentCount: number;
  /** Disables the download button + shows lock icon when true. */
  pdfLocked?: boolean;
  /**
   * Hide the Certificates + Signatures action-sheet buttons. Used by
   * equipment flows (bobcat/excavator) whose rows live outside the
   * `inspections` table and so don't satisfy the FKs those sheets write.
   */
  hideSheets?: boolean;
  downloading?: boolean;
  paywallVisible: boolean;
  onPaywallClose: () => void;
  onDownloadPdf: () => void;
  /** Called after either action sheet saves a change so caller can rebuild preview. */
  onSheetSaved: () => void;
};

export function InspectionResultView(props: Props) {
  const {
    inspectionId,
    templateName,
    requiredSignerRoles,
    previewHtml,
    previewBusy,
    previewError,
    signedCount,
    totalSlots,
    attachmentCount,
    pdfLocked,
    hideSheets,
    downloading,
    paywallVisible,
    onPaywallClose,
    onDownloadPdf,
    onSheetSaved,
  } = props;

  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const showSheet = useBottomSheet();

  const openCertificatesSheet = () => {
    showSheet({
      content: ({ dismiss }) => (
        <CertificatesActionSheet
          inspectionId={inspectionId}
          onClose={dismiss}
          onChanged={onSheetSaved}
        />
      ),
    });
  };

  const openSignaturesSheet = () => {
    showSheet({
      content: ({ dismiss }) => (
        <SignaturesActionSheet
          inspectionId={inspectionId}
          requiredRoles={requiredSignerRoles}
          onClose={dismiss}
          onChanged={onSheetSaved}
        />
      ),
    });
  };

  const certBadge = attachmentCount > 0 ? `(${attachmentCount})` : '';
  const sigBadge = totalSlots > 0 ? `(${signedCount}/${totalSlots})` : '';

  return (
    <Screen edgeToEdge>
      <Stack.Screen
        options={{
          headerShown: true,
          title: templateName ?? 'შემოწმების აქტი',
          headerBackTitle: 'უკან',
        }}
      />
      <View style={styles.previewWrap}>
        {previewBusy && !previewHtml ? (
          <View style={styles.previewState}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={{ color: theme.colors.inkSoft, marginTop: 12 }}>პრევიუ იტვირთება…</Text>
          </View>
        ) : previewError && !previewHtml ? (
          <View style={styles.previewState}>
            <Ionicons name="alert-circle" size={36} color={theme.colors.danger} />
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

      <SafeAreaView edges={['bottom']} style={styles.bottomBarSafe}>
        <View style={styles.bottomBar}>
          {!hideSheets && (
            <View style={styles.bottomBarRow}>
              <Pressable
                onPress={openCertificatesSheet}
                style={({ pressed }) => [styles.bottomBtn, styles.bottomBtnGhost, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="document-attach-outline" size={18} color={theme.colors.ink} />
                <Text style={styles.bottomBtnText} numberOfLines={1}>
                  სერტ. {certBadge}
                </Text>
              </Pressable>
              <Pressable
                onPress={openSignaturesSheet}
                style={({ pressed }) => [styles.bottomBtn, styles.bottomBtnGhost, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="create-outline" size={18} color={theme.colors.ink} />
                <Text style={styles.bottomBtnText} numberOfLines={1}>
                  ხელმ. {sigBadge}
                </Text>
              </Pressable>
            </View>
          )}
          <Pressable
            onPress={onDownloadPdf}
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
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={pdfLocked ? 'lock-closed-outline' : 'share-outline'} size={18} color="#fff" />
                <Text style={[styles.bottomBtnText, { color: '#fff' }]} numberOfLines={1}>
                  {pdfLocked ? '🔒 გადმოწერა' : 'გადმოწერა'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
      <PaywallModal visible={paywallVisible} onClose={onPaywallClose} />
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
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 8,
    },
    bottomBarRow: {
      flexDirection: 'row',
      gap: 8,
    },
    bottomBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 44,
      borderRadius: 10,
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
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.ink,
    },
  });
}
