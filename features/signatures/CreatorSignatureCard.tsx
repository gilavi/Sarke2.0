// features/signatures/CreatorSignatureCard.tsx
//
// Top-section card on the SignaturesScreen showing the inspection creator's
// signature slot. Two visual states: untouched (placeholder) and captured
// (renders the base64 PNG + creator name + date with a "შეცვლა" button).
//
// The creator's name is pulled from the user profile by the parent screen
// and is NOT editable here - by design this single signature represents the
// inspector who is conducting the act, identified by their account.

import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Pencil } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { SignatureData } from './types';
import { KA_MONTH_FULL } from '../../lib/homeUtils';

function formatGeorgianDate(d: Date): string {
  return `${d.getDate()} ${KA_MONTH_FULL[d.getMonth()]}`;
}

interface Props {
  creatorName: string;
  signature: SignatureData | null;
  onTap: () => void;
}

export function CreatorSignatureCard({ creatorName, signature, onTap }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (signature) {
    return (
      <View style={styles.card}>
        <View style={styles.signedRow}>
          <View style={styles.signedImgBox}>
            <Image
              source={{ uri: `data:image/png;base64,${signature.pngBase64}` }}
              style={styles.signedImg}
              resizeMode="contain"
            />
          </View>
          <View style={styles.signedMeta}>
            <Text style={styles.creatorName} numberOfLines={1}>{creatorName}</Text>
            <Text style={styles.captureDate} numberOfLines={1}>
              {formatGeorgianDate(signature.capturedAt)}
            </Text>
          </View>
          <Pressable
            onPress={onTap}
            hitSlop={10}
            style={({ pressed }) => [styles.changeBtn, pressed && styles.pressed]}
            {...a11y(t('certificates.changeAction'), t('signature.changeBtnA11y'), 'button')}
          >
            <Text style={styles.changeBtnText}>{t('certificates.changeAction')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
      {...a11y(`${t('signature.eyebrow')} - ${creatorName}`, t('signature.tapToSignA11y'), 'button')}
    >
      <View style={styles.emptyRow}>
        <View style={styles.placeholderImgBox}>
          <Pencil size={28} color={theme.colors.inkFaint} strokeWidth={1.5} />
        </View>
        <View style={styles.signedMeta}>
          <Text style={styles.creatorName} numberOfLines={1}>{creatorName}</Text>
          <Text style={styles.captionText}>{t('signature.tapToSign')}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      padding: 14,
    },
    cardPressable: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      padding: 14,
    },
    pressed: { opacity: 0.7 },
    emptyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    signedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    placeholderImgBox: {
      width: 64,
      height: 64,
      borderRadius: 12,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signedImgBox: {
      width: 96,
      height: 64,
      borderRadius: 10,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: 4,
    },
    signedImg: { width: '100%', height: '100%' },
    signedMeta: {
      flex: 1,
      gap: 2,
    },
    creatorName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    captureDate: {
      fontSize: 13,
      color: theme.colors.inkSoft,
    },
    captionText: {
      fontSize: 12,
      color: theme.colors.inkFaint,
    },
    changeBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.subtleSurface,
    },
    changeBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.ink,
    },
  });
}
