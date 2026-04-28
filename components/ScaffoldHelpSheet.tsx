import { useCallback, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useBottomSheet } from './BottomSheet';
import { QuestionAvatar } from './QuestionAvatar';
import { helpForRow } from '../lib/scaffoldHelp';
import { TourGuide, type TourStep } from './TourGuide';
import { useTheme } from '../lib/theme';

const BRAND = '#1D9E75';

export function useScaffoldHelpSheet() {
  const show = useBottomSheet();
  return useCallback(
    (rowLabel: string) => {
      const entry = helpForRow(rowLabel);
      show({
        dismissable: true,
        content: ({ dismiss }) => <HelpSheetBody entry={entry} dismiss={dismiss} />,
      });
    },
    [show],
  );
}

function HelpSheetBody({
  entry,
  dismiss,
}: {
  entry: ReturnType<typeof helpForRow>;
  dismiss: () => void;
}) {
  const illustrationRef = useRef<View>(null);
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        targetRef: illustrationRef,
        title: 'კომპონენტის სურათი',
        body: 'ეს გვიჩვენებს სად ზუსტად არის ეს ნაწილი',
        position: 'bottom',
      },
    ],
    [],
  );
  return (
    <TourGuide tourId="haraco_help_icon_v1" steps={tourSteps}>
      <View style={styles.body}>
        <Text style={styles.title}>{entry.name}</Text>
        {entry.key && entry.name ? (
          <View ref={illustrationRef} collapsable={false} style={styles.illustration}>
            <QuestionAvatar illustrationKey={entry.key} size={160} />
          </View>
        ) : null}
        <Text style={styles.copy}>{entry.oneLiner}</Text>
        <Pressable
          onPress={dismiss}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.btnText}>დახურვა</Text>
        </Pressable>
      </View>
    </TourGuide>
  );
}

export function HelpIcon({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityLabel="დახმარება"
      style={({ pressed }) => [styles.icon, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.iconText}>?</Text>
    </Pressable>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    body: {
      alignItems: 'center',
      paddingVertical: 8,
      gap: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: BRAND,
      textAlign: 'center',
    },
    illustration: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: {
      fontSize: 15,
      color: theme.colors.ink,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 8,
    },
    btn: {
      marginTop: 8,
      alignSelf: 'stretch',
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: BRAND,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnText: {
      fontSize: 15,
      fontWeight: '700',
      color: BRAND,
    },
    icon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: BRAND,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    iconText: {
      fontSize: 15,
      fontWeight: '800',
      color: BRAND,
      lineHeight: 18,
    },
  });
}
