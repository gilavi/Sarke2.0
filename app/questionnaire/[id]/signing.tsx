import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Button, Card, Screen } from '../../../components/ui';
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
  Template,
} from '../../../types/models';
import { SIGNER_ROLE_LABEL } from '../../../types/models';
import { buildPdfHtml } from '../../../lib/pdf';

export default function SigningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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

  const generate = async () => {
    if (!questionnaire || !template || !project) return;
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
      // Upload
      const fileName = `${questionnaire.id}.pdf`;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const blob = await (await fetch(`data:application/pdf;base64,${base64}`)).blob();
      await storageApi.upload(STORAGE_BUCKETS.pdfs, fileName, blob, 'application/pdf');
      await questionnairesApi.complete(questionnaire.id, fileName);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
      router.back();
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.message ?? '');
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
            <View style={{ gap: 8, marginTop: 8 }}>
              {requiredRoles.map(r => (
                <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, fontWeight: '600' }}>{SIGNER_ROLE_LABEL[r]}</Text>
                  <Text style={{ color: signedRoles.has(r) ? theme.colors.accent : theme.colors.warn }}>
                    {signedRoles.has(r) ? 'მზადაა' : 'საჭიროა'}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 11, color: theme.colors.inkSoft, marginTop: 14 }}>
              ხელმოწერის გადაღების ეკრანი დაემატება შემდეგ ბილდში. დროებით PDF გენერირდება
              ხელმოწერის ბლოკებით, საიდანაც ექსპერტი ფიზიკურად მოაწერს.
            </Text>
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

          <Button
            title="PDF-ის დაგენერირება"
            onPress={generate}
            loading={busy}
            disabled={missingCerts.length > 0}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
