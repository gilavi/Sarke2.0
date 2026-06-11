import { Pressable, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';

interface Props {
  onDetails: () => void;
}

/**
 * Inline amber banner shown at the top of screens when the user's PDF limit
 * is exhausted. Tapping the details button opens the SubscriptionNotice.
 * Deliberately contains no purchase wording (Apple guideline 3.1.1).
 */
export function PdfLockedBanner({ onDetails }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={s.banner}>
      <Text style={s.label}>{`🔒 ${t('components.pdfLockedBanner.label')}`}</Text>
      <Pressable
        onPress={onDetails}
        style={({ pressed }) => [s.btn, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t('components.pdfLockedBanner.details')}
        hitSlop={8}
      >
        <Text style={s.btnText}>{t('components.pdfLockedBanner.details')}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.warnSoft,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.warn,
      paddingHorizontal: 14,
      paddingVertical: 9,
      gap: 8,
    },
    label: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.ink,
      fontWeight: '500',
    },
    btn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: theme.colors.warn,
    },
    btnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.white,
    },
    pressed: {
      opacity: 0.75,
    },
  });
