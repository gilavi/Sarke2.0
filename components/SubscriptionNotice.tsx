import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';
import { usePdfUsage } from '../lib/usePdfUsage';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Neutral notice shown when the free PDF limit is reached.
 *
 * Deliberately contains NO price, NO URL, NO purchase wording, and no button
 * other than dismiss - Apple guideline 3.1.1 forbids in-app purchase flows or
 * copy directing users where to buy digital subscriptions; Google Play has the
 * same rule. Subscriptions activate server-side (`subscription_status` on the
 * users row) and the app unlocks automatically via `usePdfUsage`.
 */
export function SubscriptionNotice({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const usage = usePdfUsage().data;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Lock size={26} color={theme.colors.warn} strokeWidth={1.5} />
          </View>

          <Text style={s.title}>{t('components.subscriptionNotice.title')}</Text>
          <Text style={s.body}>{t('components.subscriptionNotice.body')}</Text>

          {usage ? (
            <Text style={s.usage}>
              {t('components.subscriptionNotice.usage', {
                used: usage.count,
                limit: usage.limit,
              })}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [s.btn, pressed && s.pressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Text style={s.btnText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.colors.background,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: 24,
      alignItems: 'center',
      gap: 10,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.warnSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.ink,
      textAlign: 'center',
    },
    body: {
      fontSize: 14,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      lineHeight: 21,
    },
    usage: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkFaint,
      marginTop: 2,
    },
    btn: {
      alignSelf: 'stretch',
      marginTop: 10,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceSecondary,
    },
    btnText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    pressed: {
      opacity: 0.7,
    },
  });
