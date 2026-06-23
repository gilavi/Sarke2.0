/**
 * Small presentational components used by the project detail screen.
 * All self-contained - they call useTheme() internally so callers need no style props.
 */
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { ChevronRight, File, FileText, TriangleAlert, User } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { InspectionTypeAvatar } from '../InspectionTypeAvatar';
import { InspectionRow } from '../InspectionRow';
import { RecordAvatar } from '../RecordAvatar';
import { incidentColors } from '../../lib/statusColors';
import { imageForDisplay } from '../../lib/imageUrl';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { formatShortDateTime } from '../../lib/formatDate';
import { INCIDENT_TYPE_LABEL, type IncidentType } from '../../types/models';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import type { Incident, ProjectFile } from '../../types/models';

// ── EmptyState ────────────────────────────────────────────────────────────────

export function EmptyState({ text }: { text: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyState}>
      <FileText size={28} color={theme.colors.borderStrong} strokeWidth={1.5} />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

// ── SafeSigImage ──────────────────────────────────────────────────────────────

export function SafeSigImage({ uri }: { uri: string }) {
  const { theme } = useTheme();
  const [err, setErr] = useState(false);
  if (err) return <User size={20} color={theme.colors.inkFaint} strokeWidth={1.5} />;
  return (
    <Image
      source={{ uri }}
      style={{ width: '100%', height: '100%' }}
      contentFit="contain"
      onError={() => setErr(true)}
    />
  );
}

// ── FileThumbnail ─────────────────────────────────────────────────────────────

export const FileThumbnail = memo(function FileThumbnail({ file }: { file: ProjectFile }) {
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
      } catch { /* fall through to icon */ }
    })();
    return () => { cancelled = true; };
  }, [isImage, file.storage_path]);

  const tile = useMemo(() => ({
    width: 72, aspectRatio: 16 / 9, borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }), [theme.colors.surfaceSecondary]);

  if (isImage && uri) {
    return (
      <View style={tile}>
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      </View>
    );
  }

  const TileIcon = file.mime_type?.includes('pdf') ? FileText : File;

  return (
    <View style={tile}>
      <TileIcon size={20} color={theme.colors.inkSoft} strokeWidth={1.5} />
    </View>
  );
});

// ── ViewMoreRow ───────────────────────────────────────────────────────────────

/**
 * "View all" footer row: a stack of avatars + the text "ყველას ნახვა" (no
 * count). Pass `avatars` (pre-rendered, row-matching nodes) for the home
 * widgets so the stack mirrors the list's own avatars; otherwise the
 * category-based circles are derived from `items` (project sections).
 */
export function ViewMoreRow({
  items, onPress, avatars,
}: {
  items?: { category?: string | null }[];
  /** @deprecated count is no longer shown; kept for call-site compatibility. */
  total?: number;
  onPress: () => void;
  avatars?: ReactNode[];
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const rowStyles = useMemo(() => getRowStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      style={rowStyles.listRow}
      {...a11y(t('records.viewAll'), 'სრული სიის გახსნა', 'button')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {avatars
          ? avatars.slice(0, 3).map((node, idx) => (
              <View key={idx} style={{ marginLeft: idx === 0 ? 0 : -12 }}>{node}</View>
            ))
          : (items ?? []).slice(0, 3).map((item, idx) =>
              item.category != null ? (
                <View key={idx} style={{ marginLeft: idx === 0 ? 0 : -10 }}>
                  <InspectionTypeAvatar category={item.category} size={32} />
                </View>
              ) : (
                <View
                  key={idx}
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1.5, borderColor: theme.colors.border,
                    alignItems: 'center', justifyContent: 'center',
                    marginLeft: idx === 0 ? 0 : -10,
                    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
                  }}
                >
                  <File size={14} color={theme.colors.inkSoft} strokeWidth={1.5} />
                </View>
              ),
            )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={rowStyles.listRowTitle}>{t('records.viewAll')}</Text>
      </View>
      <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
    </Pressable>
  );
}

// ── IncidentRow ───────────────────────────────────────────────────────────────

export function IncidentRow({
  incident, onPress, showBorder,
}: {
  incident: Incident;
  onPress: () => void;
  /** Draw a hairline bottom divider (omit on the last row of a group). */
  showBorder?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const palette = incidentColors(isDark);
  const badge = palette[incident.type as IncidentType] ?? palette.minor;
  const typeLabel = INCIDENT_TYPE_LABEL[incident.type as IncidentType] ?? incident.type;

  // Same row layout + circle avatar as every other record type. Severity is
  // carried by the avatar colour + the subtitle label (no separate status box).
  return (
    <InspectionRow
      leading={<RecordAvatar icon={TriangleAlert} tint={badge.text} bg={badge.bg} />}
      title={incident.location || incident.description || '-'}
      subtitle={`${typeLabel} · ${formatShortDateTime(incident.date_time)}`}
      trailing={<ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />}
      inset={0}
      showBorder={showBorder}
      onPress={onPress}
      a11y={a11y(typeLabel, 'ინციდენტის ნახვა', 'button')}
    />
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

function getRowStyles(theme: any) {
  return StyleSheet.create({
    listRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, backgroundColor: 'transparent' },
    listRowBorder:   { borderBottomWidth: 0.5, borderBottomColor: theme.colors.hairline },
    listRowTitle:    { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    listRowSubtitle: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
    statusIcon:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  });
}

const styles = StyleSheet.create({
  emptyState:     { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyStateText: { fontSize: 13, fontWeight: '500' },
});
