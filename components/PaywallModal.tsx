import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';
import { useToast } from '../lib/toast';
import { PDF_FREE_LIMIT } from '../lib/pdfGate';
import { createBogOrder } from '../lib/bogPayment';
import { useInvalidatePdfUsage } from '../lib/usePdfUsage';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const FEATURES = [
  'შეუზღუდავი PDF გენერაცია',
  'ყველა შაბლონი',
  'ისტორია და არქივი',
  'პრიორიტეტული მხარდაჭერა',
];

/**
 * Full-screen paywall shown when the user exhausts their free-tier PDF limit.
 * Opens the BOG payment page in an in-app browser and activates the subscription
 * once the user completes payment.
 */
export function PaywallModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const toast = useToast();
  const invalidatePdfUsage = useInvalidatePdfUsage();
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const { redirectUrl } = await createBogOrder();
      const result = await WebBrowser.openAuthSessionAsync(redirectUrl, 'sarke://payment');

      if (result.type === 'success') {
        const url = result.url ?? '';
        if (url.includes('sarke://payment/success')) {
          invalidatePdfUsage();
          toast.success('გამოწერა გააქტიურდა!');
          onClose();
        } else {
          // sarke://payment/fail or unknown redirect
          toast.error('გადახდა გაუქმდა');
        }
      }
      // result.type === 'cancel' means user closed browser — no toast needed
    } catch (e) {
      console.error('BOG payment error:', e);
      toast.error('გადახდა ვერ მოხერხდა');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        {/* Close */}
        <Pressable
          style={({ pressed }) => [s.closeBtn, pressed && s.pressed]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="დახურვა"
          hitSlop={12}
          disabled={subscribing}
        >
          <Ionicons name="close" size={24} color={theme.colors.ink} />
        </Pressable>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo + Pro badge */}
          <View style={s.logoWrap}>
            <Image
              source={require('../assets/icon.png')}
              style={s.logo}
              resizeMode="cover"
            />
            <View style={s.proBadge}>
              <Text style={s.proBadgeText}>პრო</Text>
            </View>
          </View>

          {/* Headline */}
          <Text style={s.headline}>{`${PDF_FREE_LIMIT} უფასო PDF ამოიწურა`}</Text>
          <Text style={s.subline}>
            განაგრძეთ შეუზღუდავი შემოწმებებით და PDF რეპორტებით
          </Text>

          {/* Features */}
          <View style={s.featuresCard}>
            {FEATURES.map((f) => (
              <View key={f} style={s.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Price */}
          <View style={s.priceBlock}>
            <Text style={s.price}>₾19 / თვეში</Text>
            <Text style={s.priceNote}>გამოწერის გაუქმება ნებისმიერ დროს</Text>
          </View>
        </ScrollView>

        {/* Footer buttons */}
        <View style={s.footer}>
          <Pressable
            style={({ pressed }) => [s.btnPrimary, (pressed || subscribing) && s.pressed]}
            onPress={handleSubscribe}
            disabled={subscribing}
            accessibilityRole="button"
            accessibilityLabel="გამოწერის გააქტიურება"
          >
            {subscribing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.btnPrimaryText}>გამოწერის გააქტიურება</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.btnSecondary, pressed && s.pressed]}
            onPress={onClose}
            disabled={subscribing}
            accessibilityRole="button"
            accessibilityLabel="მოგვიანებით"
          >
            <Text style={s.btnSecondaryText}>მოგვიანებით</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    closeBtn: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 10,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 56,
      paddingBottom: 16,
      gap: 16,
    },
    logoWrap: {
      marginBottom: 8,
    },
    logo: {
      width: 80,
      height: 80,
      borderRadius: 20,
    },
    proBadge: {
      position: 'absolute',
      bottom: -6,
      right: -10,
      backgroundColor: '#C8922A',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    proBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    headline: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.ink,
      textAlign: 'center',
      lineHeight: 30,
    },
    subline: {
      fontSize: 15,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 4,
    },
    featuresCard: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 16,
      gap: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    featureText: {
      fontSize: 15,
      color: theme.colors.ink,
      fontWeight: '500',
    },
    priceBlock: {
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
    },
    price: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.colors.ink,
    },
    priceNote: {
      fontSize: 13,
      color: theme.colors.inkFaint,
    },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    btnPrimary: {
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
    },
    btnPrimaryText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    btnSecondary: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnSecondaryText: {
      color: theme.colors.inkSoft,
      fontSize: 15,
      fontWeight: '500',
    },
    pressed: {
      opacity: 0.7,
    },
  });
