// PDF Preview Screen
//
// Loads inspection data and renders a live HTML preview in a WebView
// before the user commits to PDF generation.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import {
  answersApi,
  inspectionsApi,
  projectsApi,
  signaturesApi,
  templatesApi,
} from '../../lib/services';
import { buildPdfPreviewHtml } from '../../lib/pdf';
import { useToast } from '../../lib/toast';
import { logError, toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  Project,
  Question,
  SignatureRecord,
  Template,
} from '../../types/models';

export default function PdfPreviewScreen() {
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const router = useRouter();
  const toast = useToast();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [photosByAnswer, setPhotosByAnswer] = useState<Record<string, AnswerPhoto[]>>({});
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!inspectionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const insp = await inspectionsApi.getById(inspectionId);
      if (!insp) {
        toast.error('ინსპექცია ვერ მოიძებნა');
        setLoading(false);
        return;
      }
      setInspection(insp);

      const [tpl, proj, qs, ans, sigs] = await Promise.all([
        templatesApi.getById(insp.template_id).catch(e => {
          logError(e, 'preview.template');
          return null;
        }),
        projectsApi.getById(insp.project_id).catch(e => {
          logError(e, 'preview.project');
          return null;
        }),
        templatesApi.questions(insp.template_id).catch(e => {
          logError(e, 'preview.questions');
          return [] as Question[];
        }),
        answersApi.list(insp.id).catch(e => {
          logError(e, 'preview.answers');
          return [] as Answer[];
        }),
        signaturesApi.list(insp.id).catch(e => {
          logError(e, 'preview.signatures');
          return [] as SignatureRecord[];
        }),
      ]);

      setTemplate(tpl);
      setProject(proj);
      setQuestions(qs);
      setAnswers(ans);
      setSignatures(sigs);

      // Load photos
      const photoMap: Record<string, AnswerPhoto[]> = {};
      await Promise.all(
        ans.map(async a => {
          const ps = await answersApi.photos(a.id).catch(e => {
            logError(e, 'preview.photos');
            return [] as AnswerPhoto[];
          });
          if (ps.length > 0) photoMap[a.id] = ps;
        }),
      );
      setPhotosByAnswer(photoMap);

      // Build preview HTML
      if (tpl && proj) {
        const html = buildPdfPreviewHtml({
          questionnaire: insp,
          template: tpl,
          project: proj,
          questions: qs,
          answers: ans,
          signatures: sigs,
          photosByAnswer: photoMap,
        });
        setPreviewHtml(html);
      }
    } catch (e) {
      toast.error(friendlyError(e, 'პრევიუს ჩატვირთვა ვერ მოხერხდა'));
    } finally {
      setLoading(false);
    }
  }, [inspectionId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const goToGenerate = () => {
    if (!inspectionId) return;
    router.push(`/certificates/new?inspectionId=${inspectionId}` as any);
  };

  const photoCount = Object.values(photosByAnswer).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.topBtn} {...a11y('ინსპექცია — დაბრუნება', 'გადავა ინსპექციის ეკრანზე', 'button')}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.accent} />
        </Pressable>
        <Text style={styles.topTitle}>PDF პრევიუ</Text>
        <Pressable onPress={goToGenerate} hitSlop={10} style={styles.generateBtn} {...a11y('გენერაცია', 'PDF-ის გენერაცია', 'button')}>
          <Text style={styles.generateBtnText}>გენერაცია</Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading || !previewHtml ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loaderText}>პრევიუ იტვირთება…</Text>
        </View>
      ) : (
        <>
          <WebView
            originWhitelist={['*']}
            source={{ html: previewHtml }}
            style={{ flex: 1 }}
            scalesPageToFit
            javaScriptEnabled={false}
            domStorageEnabled={false}
          />
          {/* Bottom Stats Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomStat}>
              <Ionicons name="clipboard-outline" size={14} color={theme.colors.inkSoft} />
              <Text style={styles.bottomStatText} numberOfLines={1}>
                {template?.name ?? 'ინსპექცია'}
              </Text>
            </View>
            <View style={styles.bottomDivider} />
            <View style={styles.bottomStat}>
              <Ionicons name="business-outline" size={14} color={theme.colors.inkSoft} />
              <Text style={styles.bottomStatText} numberOfLines={1}>
                {project?.name ?? '—'}
              </Text>
            </View>
            <View style={styles.bottomDivider} />
            <View style={styles.bottomStat}>
              <Ionicons name="help-circle-outline" size={14} color={theme.colors.inkSoft} />
              <Text style={styles.bottomStatText}>{questions.length} კითხვა</Text>
            </View>
            <View style={styles.bottomDivider} />
            <View style={styles.bottomStat}>
              <Ionicons name="camera-outline" size={14} color={theme.colors.inkSoft} />
              <Text style={styles.bottomStatText}>{photoCount} ფოტო</Text>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  topBtn: {
    padding: 4,
    width: 80,
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
    textAlign: 'center',
    flex: 1,
  },
  generateBtn: {
    width: 80,
    alignItems: 'flex-end',
  },
  generateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: theme.colors.inkSoft,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    gap: 8,
  },
  bottomStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  bottomStatText: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    fontWeight: '500',
  },
  bottomDivider: {
    width: 1,
    height: 16,
    backgroundColor: theme.colors.border,
  },
});
