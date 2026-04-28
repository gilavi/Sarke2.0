// Certificates tab — list of generated PDF certificates.
//
// Each row has a thumbnail (styled mini-document) + metadata badges.
// Tap → cert preview/detail screen. Swipe delete removes the cert row
// but leaves the underlying inspection intact.
import { memo, useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Card } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import {
  certificatesApi,
  inspectionsApi,
  projectsApi,
  templatesApi,
} from '../../lib/services';
import { useToast } from '../../lib/toast';
import { useTheme } from '../../lib/theme';

import { toErrorMessage } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import { a11y } from '../../lib/accessibility';
import type {
  Certificate,
  Inspection,
  Project,
  Template,
} from '../../types/models';
import { useTranslation } from 'react-i18next';

// ── Thumbnail ────────────────────────────────────────────────────────────────

function CertThumbnail({ cert }: { cert: Certificate }) {
  const { theme } = useTheme();
  const thumbStyles = useMemo(() => getthumbStyles(theme), [theme]);

  const isSafe = cert.is_safe_for_use;
  const barColor = isSafe === false ? theme.colors.danger : theme.colors.accent;
  return (
    <View style={thumbStyles.wrapper}>
      {/* Colored left bar — safety indicator */}
      <View style={[thumbStyles.bar, { backgroundColor: barColor }]} />
      {/* Document body */}
      <View style={thumbStyles.body}>
        <Ionicons name="document-text" size={14} color={theme.colors.inkFaint} />
        <View style={{ gap: 4, marginTop: 6 }}>
          <View style={[thumbStyles.line, { width: '90%' }]} />
          <View style={[thumbStyles.line, { width: '70%' }]} />
          <View style={[thumbStyles.line, { width: '80%', opacity: 0.5 }]} />
          <View style={[thumbStyles.line, { width: '55%', opacity: 0.5 }]} />
          <View style={[thumbStyles.line, { width: '75%', opacity: 0.35 }]} />
        </View>
      </View>
    </View>
  );
}

function getthumbStyles(theme: any) {
  return StyleSheet.create({
  wrapper: {
    width: 58,
    height: 80,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.hairline,
    flexDirection: 'row',
    overflow: 'hidden',
    // Subtle shadow
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  bar: {
    width: 4,
    height: '100%',
  },
  body: {
    flex: 1,
    padding: 7,
  },
  line: {
    height: 5,
    borderRadius: 2,
    backgroundColor: theme.colors.inkFaint,
  },
});
}

const MemoizedCertItem = memo(function CertItem({
  item,
  inspectionById,
  templateById,
  projectById,
  theme,
  styles,
  onDelete,
  onPress,
  t,
}: {
  item: Certificate;
  inspectionById: Map<string, Inspection>;
  templateById: Map<string, Template>;
  projectById: Map<string, Project>;
  theme: any;
  styles: any;
  onDelete: (cert: Certificate) => void;
  onPress: (cert: Certificate) => void;
  t: (key: string) => string;
}) {
  const insp = inspectionById.get(item.inspection_id) ?? null;
  const tpl = templateById.get(item.template_id) ?? null;
  const proj = insp ? (projectById.get(insp.project_id) ?? null) : null;
  const params = item.params as {
    expertName?: string | null;
    qualTypes?: { type: string; number: string | null }[];
  };
  const expertName = params?.expertName ?? null;
  const qualTypes = params?.qualTypes ?? [];
  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable onPress={() => onDelete(item)} style={styles.swipeDelete} {...a11y(t('common.delete'), 'PDF რეპორტის წაშლა', 'button')}>
          <Ionicons name="trash" size={18} color={theme.colors.white} />
          <Text style={{ color: theme.colors.white, fontWeight: '700', fontSize: 11 }}>
            {t('common.delete')}
          </Text>
        </Pressable>
      )}
      overshootRight={false}
    >
      <Pressable onPress={() => onPress(item)} {...a11y(t('certificates.pdfReport'), 'დეტალების ნახვა', 'button')}>
        <Card padding={12}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* PDF thumbnail */}
            <CertThumbnail cert={item} />

            {/* Metadata */}
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {tpl?.name ?? t('certificates.pdfReport')}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {proj?.name ?? '—'}
              </Text>
              <Text style={styles.rowDate}>
                {new Date(item.generated_at).toLocaleString(t('common.localeTag'))}
              </Text>

              {/* Expert / qual badges */}
              {(expertName || qualTypes.length > 0) ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {expertName ? (
                    <View style={styles.badge}>
                      <Ionicons name="person-outline" size={10} color={theme.colors.inkSoft} />
                      <Text style={styles.badgeText}>{expertName}</Text>
                    </View>
                  ) : null}
                  {qualTypes.map(q => (
                    <View key={q.type} style={styles.badge}>
                      <Ionicons name="ribbon-outline" size={10} color={theme.colors.inkSoft} />
                      <Text style={styles.badgeText}>{q.number ? `№${q.number}` : q.type}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Preview indicator */}
            <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
          </View>
        </Card>
      </Pressable>
    </Swipeable>
  );
});

// ── Screen ───────────────────────────────────────────────────────────────────

export default function CertificatesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const thumbStyles = useMemo(() => getthumbStyles(theme), [theme]);
  const styles = useMemo(() => getstyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [cs, ts, ps, insps] = await Promise.all([
      certificatesApi.list().catch(() => []),
      templatesApi.list().catch(() => []),
      projectsApi.list().catch(() => []),
      inspectionsApi.recent(500).catch(() => []),
    ]);
    setCerts(cs);
    setTemplates(ts);
    setProjects(ps);
    setInspections(insps);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => { void load(); }, [load]),
  );

  const inspectionById = useMemo(
    () => new Map(inspections.map(i => [i.id, i])),
    [inspections],
  );
  const templateById = useMemo(
    () => new Map(templates.map(t => [t.id, t])),
    [templates],
  );
  const projectById = useMemo(
    () => new Map(projects.map(p => [p.id, p])),
    [projects],
  );

  const openPreview = useCallback((cert: Certificate) => {
    router.push(`/certificates/${cert.id}` as any);
  }, [router]);

  const deleteCert = useCallback(async (cert: Certificate) => {
    try {
      await certificatesApi.remove(cert.id);
      setCerts(prev => prev.filter(c => c.id !== cert.id));
      toast.success(t('certificates.deleted'));
    } catch (e) {
      toast.error(friendlyError(e, t('certificates.deleteError')));
    }
  }, [toast]);

  const renderItem = useCallback(({ item }: { item: Certificate }) => (
    <MemoizedCertItem
      item={item}
      inspectionById={inspectionById}
      templateById={templateById}
      projectById={projectById}
      theme={theme}
      styles={styles}
      onDelete={deleteCert}
      onPress={openPreview}
      t={t}
    />
  ), [inspectionById, templateById, projectById, theme, styles, deleteCert, openPreview, t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('certificates.title')}</Text>
      </View>
      <FlatList
        data={certs}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}
        ListEmptyComponent={
          !loaded ? (
            <View style={{ gap: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={`skeleton-${i}`} padding={12}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Skeleton width={58} height={80} radius={8} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Skeleton width={'70%'} height={14} />
                      <Skeleton width={'50%'} height={12} />
                      <Skeleton width={'40%'} height={11} />
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                        <Skeleton width={72} height={18} radius={999} />
                        <Skeleton width={56} height={18} radius={999} />
                      </View>
                    </View>
                    <Skeleton width={16} height={16} radius={8} />
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState
              type="certificates"
              title={t('certificates.emptyTitle')}
              subtitle={t('certificates.emptyHint')}
              action={{
                label: t('certificates.emptyAction'),
                icon: 'add-circle-outline',
                onPress: () => router.push('/(tabs)/home'),
              }}
            />
          )
        }
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.ink },
  // empty styles removed — now handled by <EmptyState />
  rowTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.ink },
  rowMeta: { fontSize: 12, color: theme.colors.inkSoft },
  rowDate: { fontSize: 11, color: theme.colors.inkFaint },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 16,
    backgroundColor: theme.colors.subtleSurface,
  },
  badgeText: { fontSize: 10, color: theme.colors.inkSoft },
  swipeDelete: {
    width: 86,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginLeft: 8,
    borderRadius: 12,
  },
});
}
