import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Button, Card, Screen } from '../../../components/ui';
import { useToast } from '../../../lib/toast';
import {
  answersApi,
  certificatesApi,
  projectsApi,
  questionnairesApi,
  signaturesApi,
  storageApi,
  templatesApi,
} from '../../../lib/services';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import { theme } from '../../../lib/theme';
import type {
  Answer,
  Certificate,
  Project,
  ProjectSigner,
  Question,
  Questionnaire,
  SignatureRecord,
  SignerRole,
  Template,
} from '../../../types/models';
import { SIGNER_ROLE_LABEL } from '../../../types/models';
import { buildPdfHtml } from '../../../lib/pdf';

export default function SigningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [signers, setSigners] = useState<ProjectSigner[]>([]);
  const [existingSigs, setExistingSigs] = useState<SignatureRecord[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [allQ, allT] = await Promise.all([
      questionnairesApi.recent(500),
      templatesApi.list(),
    ]);
    const q = allQ.find(x => x.id === id) ?? null;
    setQuestionnaire(q);
    if (!q) return;
    const t = allT.find(x => x.id === q.template_id) ?? null;
    setTemplate(t);
    const [allP, qs, ans, ps, sigs, cs] = await Promise.all([
      projectsApi.list().catch(() => []),
      t ? templatesApi.questions(t.id) : Promise.resolve([] as Question[]),
      answersApi.list(q.id).catch(() => []),
      projectsApi.signers(q.project_id).catch(() => []),
      signaturesApi.list(q.id).catch(() => []),
      certificatesApi.list().catch(() => []),
    ]);
    setProject(allP.find(p => p.id === q.project_id) ?? null);
    setQuestions(qs);
    setAnswers(ans);
    setSigners(ps);
    setExistingSigs(sigs);
    setCerts(cs);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const requiredRoles = template?.required_signer_roles ?? [];
  const signedRoles = new Set(existingSigs.map(s => s.signer_role));
  const missingCerts = (template?.required_cert_types ?? []).filter(
    ct => !certs.some(c => c.type === ct),
  );
  const allSigned = requiredRoles.every(r => signedRoles.has(r));
  const readyToGenerate = allSigned && missingCerts.length === 0;

  const signForRole = async (role: SignerRole) => {
    if (!questionnaire) return;
    const matches = signers.filter(s => s.role === role);
    if (matches.length === 0) {
      Alert.alert(
        'ხელმომწერი არ არის',
        `${SIGNER_ROLE_LABEL[role]} როლისთვის პროექტში არცერთი ხელმომწერი არ არის. დაამატე ჯერ პროექტის გვერდზე.`,
        [
          { text: 'გაუქმება', style: 'cancel' },
          {
            text: 'დამატება',
            onPress: () =>
              router.push(`/projects/${questionnaire.project_id}/signer` as any),
          },
        ],
      );
      return;
    }
    const pick = async (signer: ProjectSigner) => {
      try {
        const saved = await signaturesApi.upsert({
          questionnaire_id: questionnaire.id,
          signer_role: role,
          full_name: signer.full_name,
          phone: signer.phone,
          position: signer.position,
          signature_png_url: signer.signature_png_url ?? '',
        });
        setExistingSigs(prev => [
          ...prev.filter(s => s.signer_role !== role),
          saved as unknown as SignatureRecord,
        ]);
        toast.success('ხელმოწერა დაემატა');
      } catch (e: any) {
        toast.error(e?.message ?? 'შეცდომა');
      }
    };
    if (matches.length === 1) {
      await pick(matches[0]);
    } else {
      Alert.alert('აირჩიე ხელმომწერი', '', [
        ...matches.map(s => ({ text: s.full_name, onPress: () => void pick(s) })),
        { text: 'გაუქმება', style: 'cancel' as const },
      ]);
    }
  };

  const removeSignature = async (role: SignerRole) => {
    if (!questionnaire) return;
    const existing = existingSigs.find(s => s.signer_role === role);
    if (!existing) return;
    // Supabase has no exposed delete here; just drop from local state + reinsert blank on next pick.
    setExistingSigs(prev => prev.filter(s => s.signer_role !== role));
  };

  const generate = async () => {
    if (!questionnaire || !template || !project) return;
    if (!readyToGenerate) {
      toast.error('ჯერ დაასრულე ხელმოწერები და სერტიფიკატები');
      return;
    }
    setBusy(true);
    try {
      const html = buildPdfHtml({
        questionnaire,
        template,
        project,
        questions,
        answers,
        signatures: existingSigs,
      });
      const { uri } = await Print.printToFileAsync({ html });
      const fileName = `${questionnaire.id}.pdf`;
      const blob = await (await fetch(uri)).blob();
      await storageApi.upload(STORAGE_BUCKETS.pdfs, fileName, blob, 'application/pdf');
      await questionnairesApi.complete(questionnaire.id, fileName);
      toast.success('PDF შეიქმნა');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
      router.back();
    } catch (e: any) {
      toast.error(e?.message ?? 'შეცდომა');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'ხელმოწერა' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Card>
            <Text style={{ fontSize: 11, color: theme.colors.inkSoft, textTransform: 'uppercase' }}>
              საჭირო ხელმოწერები
            </Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              {requiredRoles.map(r => {
                const signed = signedRoles.has(r);
                const sig = existingSigs.find(s => s.signer_role === r);
                return (
                  <View key={r} style={styles.roleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
                        {SIGNER_ROLE_LABEL[r]}
                      </Text>
                      {signed && sig ? (
                        <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 2 }}>
                          {sig.full_name}
                        </Text>
                      ) : null}
                    </View>
                    {signed ? (
                      <Pressable onPress={() => removeSignature(r)} hitSlop={8}>
                        <Ionicons name="checkmark-circle" size={26} color={theme.colors.accent} />
                      </Pressable>
                    ) : (
                      <Button
                        title="მოწერა"
                        variant="secondary"
                        onPress={() => void signForRole(r)}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </Card>

          {missingCerts.length > 0 ? (
            <Card style={{ backgroundColor: theme.colors.warnSoft, borderColor: theme.colors.warn }}>
              <Text style={{ fontWeight: '600', color: theme.colors.warn }}>
                აკლია სერტიფიკატი: {missingCerts.join(', ')}
              </Text>
              <Button
                title="სერტიფიკატის ატვირთვა"
                variant="secondary"
                onPress={() => router.push('/certificates')}
                style={{ marginTop: 8 }}
              />
            </Card>
          ) : null}

          {!allSigned ? (
            <Text style={{ fontSize: 12, color: theme.colors.inkSoft, textAlign: 'center' }}>
              დააჭირე "მოწერა"-ს თითოეული როლისთვის გაგრძელებამდე.
            </Text>
          ) : null}

          <Button
            title="PDF-ის დაგენერირება"
            onPress={generate}
            loading={busy}
            disabled={!readyToGenerate}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 12,
  },
});
