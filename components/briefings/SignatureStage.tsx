/**
 * Signature capture stage for the briefing (ინსტრუქტაჟი) signing step. A signer
 * name/prompt header block above a full-bleed signature canvas (with baseline +
 * "sign here" hint). Shared by the worker and inspector phases so the two
 * near-identical canvas blocks stay in sync.
 *
 * Side effects: none of its own - the canvas ref, stroke tracking and the
 * read/clear lifecycle are owned by the caller (the signing route).
 */
import { useMemo, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme } from '../../lib/theme';

// WebView canvas styles - same pattern as SignatureCanvas.tsx
const WEB_STYLE = `
  html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #fff; overflow: hidden; }
  .m-signature-pad { position: fixed; top: 0; left: 0; right: 0; bottom: 0; box-shadow: none; border: none; background: #fff; margin: 0; }
  .m-signature-pad--body { border: none; height: 100%; }
  .m-signature-pad--body canvas { width: 100% !important; height: 100% !important; background: #fff; }
  .m-signature-pad--footer { display: none; }
`;

export interface SignatureStageProps {
  /** Small uppercase eyebrow above the name, e.g. "ხელს აწერს". */
  eyebrow: string;
  /** The signer's display name. */
  name: string;
  /** Optional caption under the name, e.g. "2 / 3" or a prompt. */
  caption?: string;
  /** Re-mount key so the canvas resets between signers. */
  canvasKey: string | number;
  canvasRef: Ref<SignatureViewRef>;
  hasStroke: boolean;
  onBegin: () => void;
  onEnd: () => void;
  onOK: (signature: string) => void;
}

export function SignatureStage({
  eyebrow,
  name,
  caption,
  canvasKey,
  canvasRef,
  hasStroke,
  onBegin,
  onEnd,
  onOK,
}: SignatureStageProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>

      <View style={styles.canvasWrap}>
        <SignatureScreen
          key={canvasKey}
          ref={canvasRef}
          onOK={onOK}
          onBegin={onBegin}
          onEnd={onEnd}
          webStyle={WEB_STYLE}
          descriptionText=""
          autoClear={false}
          imageType="image/png"
          backgroundColor="rgba(255,255,255,1)"
          penColor="#000000"
          minWidth={1.2}
          maxWidth={3}
          style={{ flex: 1 }}
          webviewContainerStyle={{ flex: 1 }}
        />
        <View pointerEvents="none" style={styles.baseline} />
        {!hasStroke && (
          <View pointerEvents="none" style={styles.hintWrap}>
            <Text style={styles.hintText}>{t('briefings.signHereHint')}</Text>
          </View>
        )}
      </View>
    </>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 12,
      gap: 2,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      textAlign: 'center',
    },
    name: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.ink,
      textAlign: 'center',
      marginTop: 2,
    },
    caption: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      textAlign: 'center',
    },
    canvasWrap: {
      flex: 1,
      marginHorizontal: 12,
      backgroundColor: theme.colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      overflow: 'hidden',
    },
    baseline: {
      position: 'absolute',
      bottom: 32,
      left: 24,
      right: 24,
      height: 1,
      borderBottomWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.hairline,
    },
    hintWrap: {
      position: 'absolute',
      bottom: 10,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    hintText: {
      fontSize: 12,
      color: theme.colors.inkFaint,
    },
  });
}
