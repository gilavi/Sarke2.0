import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { haptic } from '../../lib/haptics';
import { theme } from '../../lib/theme';
import { useAccessibilitySettings, a11y } from '../../lib/accessibility';

interface ExitModalProps {
  visible: boolean;
  onStay: () => void;
  onExit: () => void;
}

export function ExitConfirmationModal({ visible, onStay, onExit }: ExitModalProps) {
  const { reduceMotion } = useAccessibilitySettings();

  const handleStay = () => {
    haptic.select();
    onStay();
  };

  const handleExit = () => {
    haptic.deleteConfirm();
    onExit();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay}>
      <View style={styles.overlay}>
        <Animated.View
          entering={reduceMotion ? undefined : FadeInUp.springify()}
          style={styles.card}
        >
          <Text style={styles.title}>გასვლა?</Text>
          <Text style={styles.subtitle}>
            თუ ახლა გახვალთ, მიმდინარე პასუხები შეინახება, მაგრამ ინსპექცია დასრულებულად არ ჩაითვლება.
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={handleStay}
              style={[styles.btn, styles.stayBtn]}
              {...a11y('გაგრძელება', 'შეეხეთ ინსპექციის გასაგრძელებლად', 'button')}
            >
              <Text style={[styles.btnText, { color: theme.colors.accent }]}>გაგრძელება</Text>
            </Pressable>
            <Pressable
              onPress={handleExit}
              style={[styles.btn, styles.exitBtn]}
              {...a11y('გასვლა', 'შეეხეთ ინსპექციიდან გასასვლელად', 'button')}
            >
              <Text style={[styles.btnText, { color: theme.colors.semantic.danger }]}>გასვლა</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.inkSoft,
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
  },
  stayBtn: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  exitBtn: {
    borderColor: theme.colors.semantic.danger,
    backgroundColor: theme.colors.semantic.dangerSoft,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
