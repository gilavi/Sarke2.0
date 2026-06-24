import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FileText, File, ChevronRight } from 'lucide-react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { RefreshControl } from '../../../components/primitives';
import { useTheme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { formatShortDateTime } from '../../../lib/formatDate';
import { projectFilesApi } from '../../../lib/services';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import { imageForDisplay } from '../../../lib/imageUrl';
import { useProject, useProjectFiles } from '../../../lib/apiHooks';
import { SkeletonRow } from '../../../components/Skeleton';
import type { ProjectFile } from '../../../types/models';

function formatGeorgianDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('ka-GE', {
    day: 'numeric',
    month: 'long',
  });
}
function toDateKey(isoDatetime: string): string {
  return isoDatetime.slice(0, 10);
}
function fileIcon(mime: string | null): LucideIcon {
  if (!mime) return File;
  if (mime.includes('pdf')) return FileText;
  if (mime.startsWith('image/')) return ImageIcon;
  return File;
}
function humanSize(bytes: number | null): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

export default function ProjectFilesList() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { t } = useTranslation();

  const { data: project } = useProject(id);
  const filesQ = useProjectFiles(id);
  const items = filesQ.data ?? [];
  // Canonical three-state guard (see CLAUDE.md): skeleton until the query
  // has produced a real answer; never flash empty state over a stale [].
  const loading = (filesQ.isFetching || !filesQ.isFetched) && items.length === 0;

  const grouped = useMemo(() => groupByDateDesc(items, f => f.created_at), [items]);

  const openFile = async (f: ProjectFile) => {
    try {
      const url = await projectFilesApi.signedUrl(f, 3600);
      await Linking.openURL(url);
    } catch {
      toast.error(t('projects.fileOpenFailed'));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: t('records.orders') }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}

        refreshControl={<RefreshControl queries={[filesQ]} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t('records.orders')}</Text>
          {project ? (
            <Text style={styles.pageSubtitle}>{project.company_name || project.name}</Text>
          ) : null}
        </View>

        {loading ? (
          <View style={{ gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} style={styles.skeletonRow} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={40} color={theme.colors.borderStrong} strokeWidth={1.5} />
            <Text style={styles.emptyStateText}>{t('projects.noRecords')}</Text>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.key}>
              <Text style={styles.dateSep}>{formatGeorgianDate(group.key)}</Text>
              <View style={{ gap: 10 }}>
                {group.items.map(f => (
                  <Pressable
                    key={f.id}
                    onPress={() => openFile(f)}
                    style={styles.listRow}
                  >
                    <FileThumbnail file={f} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle} numberOfLines={1}>
                        {f.name}
                      </Text>
                      <Text style={styles.listRowSubtitle}>
                        {[humanSize(f.size_bytes), formatShortDateTime(f.created_at)]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function FileThumbnail({ file }: { file: ProjectFile }) {
  const { theme } = useTheme();
  const isImage = !!file.mime_type?.startsWith('image/');
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    (async () => {
      try {
        const u = await imageForDisplay(STORAGE_BUCKETS.projectFiles, file.storage_path);
        if (!cancelled) setUri(u);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [isImage, file.storage_path]);

  const tile = {
    width: 80,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  if (isImage && uri) {
    return (
      <View style={tile}>
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
      </View>
    );
  }
  const IconComp = fileIcon(file.mime_type);
  return (
    <View style={tile}>
      <IconComp size={20} color={theme.colors.inkSoft} strokeWidth={1.5} />
    </View>
  );
}

function groupByDateDesc<T>(
  items: T[],
  getDate: (it: T) => string,
): { key: string; items: T[] }[] {
  const sorted = [...items].sort(
    (a, b) => +new Date(getDate(b)) - +new Date(getDate(a)),
  );
  const groups: { key: string; items: T[] }[] = [];
  for (const it of sorted) {
    const k = toDateKey(getDate(it));
    let g = groups.find(x => x.key === k);
    if (!g) {
      g = { key: k, items: [] };
      groups.push(g);
    }
    g.items.push(it);
  }
  return groups;
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    pageHeader: {
      marginBottom: 24,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    pageSubtitle: {
      fontSize: 13,
      color: theme.colors.inkFaint,
      marginTop: 3,
    },
    skeletonRow: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 14,
    },
    emptyState: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.inkFaint,
      fontWeight: '500',
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 14,
      shadowColor: theme.colors.ink,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    listRowTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    listRowSubtitle: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
    fileIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateSep: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.inkFaint,
      marginBottom: 8,
      marginTop: 22,
    },
  });
}
