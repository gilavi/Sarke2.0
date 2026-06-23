import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSheetKeyboardMargin } from '../../../lib/useSheetKeyboardMargin';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { SheetLayout } from '../../../components/SheetLayout';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, ChevronRight, Check } from 'lucide-react-native';
import { Button, Screen } from '../../../components/ui';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { Skeleton } from '../../../components/Skeleton';
import { questionnairesApi, projectsApi } from '../../../lib/services';
import { InspectionTypeAvatar } from '../../../components/InspectionTypeAvatar';
import { inspectionRegistry } from '../../../lib/inspection/registry';
import { routeForInspection } from '../../../lib/inspectionRouting';
import { inspectionDisplayName } from '../../../lib/shared/documentName';
import { useToast } from '../../../lib/toast';
import { useTheme } from '../../../lib/theme';
import { useSubmitGuard } from '../../../hooks/useSubmitGuard';

import { friendlyError } from '../../../lib/errorMap';
import { useTemplate, useProjects, qk, invalidateRecordLists } from '../../../lib/apiHooks';
import { useQueryClient } from '@tanstack/react-query';
import type { Project } from '../../../types/models';
import { a11y } from '../../../lib/accessibility';
import { ErrorScreen } from '../../../components/ErrorScreen';

export default function StartTemplateScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: template, isLoading: templateLoading } = useTemplate(id);
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const [selected, setSelected] = useState<string | null>(null);
  const [showingCreate, setShowingCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const loaded = !templateLoading && !projectsLoading;
  const queryClient = useQueryClient();
  // Enabled start button + on-press project-selection error.
  const { attempted, guard } = useSubmitGuard();

  useEffect(() => {
    if (projects.length > 0 && !selected) {
      setSelected(projects[0]?.id ?? null);
    }
  }, [projects, selected]);

  const start = async () => {
    if (!template || !selected) return;
    setBusy(true);
    try {
      const entry = template.category ? inspectionRegistry[template.category] : undefined;
      const newId = entry
        ? (await entry.create({ projectId: selected, templateId: template.id })).id
        : (await questionnairesApi.create({ projectId: selected, templateId: template.id })).id;
      invalidateRecordLists(queryClient);
      router.replace(routeForInspection(template.category, newId, false) as any);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.inspectionCreateFailed')));
    } finally {
      setBusy(false);
    }
  };

  const onCreated = (p: Project) => {
    queryClient.invalidateQueries({ queryKey: qk.projects.list });
    setSelected(p.id);
    setShowingCreate(false);
  };

  if (!id) {
    return <ErrorScreen onGoHome={() => router.replace('/(tabs)/home')} onRetry={() => router.back()} />;
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t('inspections.newModalTitle'), presentation: 'modal' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <InspectionTypeAvatar category={template?.category} size={56} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.eyebrow}>{t('inspections.templateLabel')}</Text>
              {template ? (
                <Text style={styles.templateName}>{inspectionDisplayName(template.name)}</Text>
              ) : (
                <Skeleton width={'80%'} height={22} />
              )}
            </View>
          </View>

          <View style={{ gap: 4, marginTop: 20 }}>
            <Text style={styles.eyebrow}>{t('inspections.chooseProjectRequired')}</Text>
          </View>

          <Pressable onPress={() => setShowingCreate(true)} style={styles.newTile} {...a11y(t('projects.addProject'), t('flowProjectPicker.newProjectA11y'), 'button')}>
            <View style={styles.newIcon}>
              <Plus size={22} color={theme.colors.accent} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.ink }}>
                {t('projects.addProject')}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 }}>
                {t('inspections.createNow')}
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.inkFaint} strokeWidth={1.5} />
          </Pressable>

          {!loaded && projects.length === 0 ? (
            <View style={{ gap: 10 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={styles.projectRow}>
                  <Skeleton width={22} height={22} radius={11} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={'70%'} height={15} />
                    <Skeleton width={'40%'} height={11} />
                  </View>
                </View>
              ))}
            </View>
          ) : projects.length > 0 ? (
            <View style={{ gap: 10 }}>
              {projects.map(p => {
                const isSelected = selected === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelected(p.id)}
                    style={[
                      styles.projectRow,
                      isSelected && styles.projectRowSelected,
                      attempted && !selected && { borderColor: theme.colors.danger },
                    ]}
                    {...a11y(p.company_name || p.name, t('inspections.chooseProjectRequired'), 'radio')}
                  >
                    <View style={[styles.radio, isSelected && styles.radioOn]}>
                      {isSelected ? (
                        <Check size={16} color={theme.colors.white} strokeWidth={1.5} />
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.ink }}>
                        {p.company_name || p.name}
                      </Text>
                      {p.address ? (
                        <Text
                          numberOfLines={1}
                          style={{ fontSize: 11, color: theme.colors.inkFaint, marginTop: 1 }}
                        >
                          {p.address}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: theme.colors.inkSoft, fontSize: 13, textAlign: 'center', marginTop: 20 }}>
              {t('inspections.noProjectsYet2')}
            </Text>
          )}

          {attempted && !selected ? (
            <Text style={styles.selectionError}>{t('inspections.chooseProjectRequired')}</Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={t('inspections.startButton')}
            onPress={() => guard(!!selected, start)}
            loading={busy}
          />
        </View>
      </SafeAreaView>

      <CreateProjectSheet
        visible={showingCreate}
        onClose={() => setShowingCreate(false)}
        onCreated={onCreated}
      />
    </Screen>
  );
}

function CreateProjectSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const toast = useToast();
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const keyboardMargin = useSheetKeyboardMargin();
  // Enabled save button + on-press company-field error (separate from start).
  const { attempted, guard } = useSubmitGuard();

  const save = async () => {
    if (!company.trim()) return;
    setBusy(true);
    try {
      const p = (await projectsApi.create({
        name: company.trim(),
        companyName: company.trim(),
        address: address.trim() || null,
      }));
      toast.success(t('notifications.projectCreated'));
      setCompany('');
      setAddress('');
      onCreated(p);
    } catch (e) {
      toast.error(friendlyError(e, t('errors.createFailed')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Backdrop */}
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
          onPress={onClose}
          {...a11y(t('a11y.close'), t('a11y.closeHint'), 'button')}
        />
        {/* Card - marginBottom rides the iOS keyboard 1:1 */}
        <Animated.View style={{ width: '100%', marginBottom: keyboardMargin }}>
        <Pressable style={{ width: '100%' }} onPress={() => {}}>
          <SheetLayout
            insideBottomSheet
            maxHeightRatio={0.92}
            header={{ title: t('projects.addProject'), onClose }}
            footer={
              <Button
                title={t('common.save')}
                onPress={() => guard(!!company.trim(), save)}
                loading={busy}
              />
            }
          >
            <FloatingLabelInput
              label={t('common.company')}
              required
              value={company}
              onChangeText={setCompany}
              autoFocus
              error={attempted && !company.trim() ? t('errors.requiredField') : undefined}
            />
            <FloatingLabelInput
              label={t('common.address')}
              value={address}
              onChangeText={setAddress}
            />
          </SheetLayout>
        </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 24, gap: 12 },
  eyebrow: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  templateName: { fontSize: 20, fontWeight: '800', color: theme.colors.ink, marginTop: 4 },
  newTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  newIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.hairline,
  },
  projectRowSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  radioOn: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.hairline,
    backgroundColor: theme.colors.card,
  },
  selectionError: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.danger,
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
}
