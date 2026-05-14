import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { A11yText } from '../primitives/A11yText';
import { useBottomSheet } from '../BottomSheet';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../lib/theme';

interface ExitModalProps {
  visible: boolean;
  onStay: () => void;
  onExit: () => void;
}

export function ExitConfirmationModal({ visible, onStay, onExit }: ExitModalProps) {
  const showBottomSheet = useBottomSheet();
  const sheetRef = useRef<{ dismiss: () => void } | null>(null);
  const actionRef = useRef<'stay' | 'exit' | null>(null);
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    if (!visible) {
      // Parent closed us — dismiss any open sheet
      sheetRef.current?.dismiss();
      sheetRef.current = null;
      return;
    }

    const sheet = showBottomSheet(
      {
        content: () => (
          <View style={styles.content}>
            <A11yText size="xl" weight="bold" color={theme.colors.ink} style={styles.title}>
              გასვლა?
            </A11yText>
            <A11yText size="sm" color={theme.colors.inkFaint} style={styles.subtitle}>
              თუ ახლა გახვალთ, მიმდინარე პასუხები შეინახება, მაგრამ შემოწმების აქტი დასრულებულად არ ჩაითვლება.
            </A11yText>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => {
                  haptic.light();
                  actionRef.current = 'stay';
                  sheetRef.current?.dismiss();
                }}
                style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.8 }]}
              >
                <A11yText size="base" weight="semibold" color={theme.colors.white}>
                  გაგრძელება
                </A11yText>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptic.medium();
                  actionRef.current = 'exit';
                  sheetRef.current?.dismiss();
                }}
                style={({ pressed }) => [styles.exitBtn, pressed && { opacity: 0.7 }]}
              >
                <A11yText size="base" weight="semibold" color={theme.colors.danger}>
                  გასვლა
                </A11yText>
              </Pressable>
            </View>
          </View>
        ),
        dismissable: true,
      },
      () => {
        // Fires after dismiss animation (backdrop tap, swipe down, or button press)
        const action = actionRef.current;
        actionRef.current = null;
        sheetRef.current = null;
        if (action === 'exit') onExit();
        else onStay();
      },
    );

    sheetRef.current = sheet;

    return () => {
      sheetRef.current?.dismiss();
      sheetRef.current = null;
      actionRef.current = null;
    };
  }, [visible, onStay, onExit, showBottomSheet]);

  return null;
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    content: {
      paddingTop: 4,
      paddingBottom: 24,
      gap: 16,
    },
    title: {
      textAlign: 'center',
    },
    subtitle: {
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    continueBtn: {
      flex: 1,
      height: 52,
      borderRadius: 14,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exitBtn: {
      flex: 1,
      height: 52,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.dangerBorder,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
