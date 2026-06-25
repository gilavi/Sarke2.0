// Dev preview for the unified FlowSuccessScreen.
//
// Renders the screen for each of the four flows behind a small switcher so the
// shared template (black check disc, signatures, certificates, share pill) can
// be reviewed in the running app without driving a real act/incident/report/
// instruction to completion. Not linked from anywhere in the product UI —
// open it directly at /success-preview. Safe to delete once the four flows are
// wired; kept as a living reference for the four configs.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { A11yText as Text } from '../components/primitives/A11yText';
import { FlowSuccessScreen, type SuccessFlow } from '../components/success';
import { useSignaturesState } from '../features/signatures';
import { useTheme } from '../lib/theme';

const FLOWS: { key: SuccessFlow; label: string }[] = [
  { key: 'act', label: 'აქტი' },
  { key: 'incident', label: 'ინციდენტი' },
  { key: 'report', label: 'რეპორტი' },
  { key: 'instruction', label: 'ინსტრუქტაჟი' },
];

const CREATOR = 'Giorgi Kheladze';

export default function SuccessPreviewScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [flow, setFlow] = useState<SuccessFlow>('act');

  // Two independent signing states so switching act↔incident keeps each list.
  const actSignatures = useSignaturesState();
  const incidentSignatures = useSignaturesState();

  const common = {
    onSharePdf: () => {},
    onBackHome: () => router.back(),
    onBackEdit: () => router.back(),
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {flow === 'act' ? (
        <FlowSuccessScreen
          {...common}
          flow="act"
          signatures={actSignatures}
          creatorName={CREATOR}
          certificates={[{ id: '1', title: 'ISO 45001', subtitle: 'შრომის უსაფრთხოება' }]}
          onAddCertificate={() => {}}
          onOpenCertificate={() => {}}
        />
      ) : null}
      {flow === 'incident' ? (
        <FlowSuccessScreen
          {...common}
          flow="incident"
          signatures={incidentSignatures}
          creatorName={CREATOR}
        />
      ) : null}
      {flow === 'report' ? <FlowSuccessScreen {...common} flow="report" /> : null}
      {flow === 'instruction' ? (
        <FlowSuccessScreen
          {...common}
          flow="instruction"
          participants={[
            { name: 'Giorgi Kheladze', signed: true },
            { name: 'Nino Beridze', signed: true },
            { name: 'Davit Lomidze', signed: true },
          ]}
        />
      ) : null}

      <View style={[styles.switcher, { top: insets.top + 8 }]}>
        {FLOWS.map((f) => {
          const active = f.key === flow;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFlow(f.key)}
              style={[styles.chip, active && { backgroundColor: theme.colors.ink }]}
            >
              <Text style={[styles.chipText, active && { color: theme.colors.white }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    switcher: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 12,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
  });
}
