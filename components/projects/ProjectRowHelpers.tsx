/**
 * Small presentational components used by the project detail screen.
 * All self-contained - they call useTheme() internally so callers need no style props.
 */
import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, File, FileText, TriangleAlert, User } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { InspectionTypeAvatar } from '../InspectionTypeAvatar';
import { INCIDENT_COLORS } from '../../lib/statusColors';
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

export function ViewMoreRow({
  items, total, onPress,
}: {
  items: { category?: string | null }[];
  total: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const rowStyles = useMemo(() => getRowStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      style={rowStyles.listRow}
      {...a11y(`+ ${total} მეტი`, 'სრული სიის გახსნა', 'button')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {items.slice(0, 3).map((item, idx) =>
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
      <View style={{ flex: 1 }}>
        <Text style={rowStyles.listRowTitle}>+ {total} მეტი</Text>
      </View>
      <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
    </Pressable>
  );
}

// ── IncidentRow ───────────────────────────────────────────────────────────────

export function IncidentRow({
  incident, onPress,
}: {
  incident: Incident;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const rowStyles = useMemo(() => getRowStyles(theme), [theme]);
  const badge = INCIDENT_COLORS[incident.type as IncidentType] ?? INCIDENT_COLORS.minor;

  return (
    <Pressable onPress={onPress} style={rowStyles.listRow}>
      <View style={[rowStyles.statusIcon, { backgroundColor: badge.bg, borderWidth: 1, borderColor: badge.border }]}>
        <TriangleAlert size={13} color={badge.text} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: badge.bg, borderRadius: 4, borderWidth: 1, borderColor: badge.border, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: badge.text }}>
              {INCIDENT_TYPE_LABEL[incident.type as IncidentType] ?? incident.type}
            </Text>
          </View>
          {incident.status === 'draft' && (
            <View style={{ backgroundColor: theme.colors.warnSoft, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.certTint }}>დრაფტი</Text>
            </View>
          )}
        </View>
        <Text style={[rowStyles.listRowTitle, { marginTop: 3 }]} numberOfLines={1}>
          {incident.location || incident.description || '-'}
        </Text>
        <Text style={rowStyles.listRowSubtitle}>{formatShortDateTime(incident.date_time)}</Text>
      </View>
      <ChevronRight size={18} color={theme.colors.borderStrong} strokeWidth={1.5} />
    </Pressable>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

function getRowStyles(theme: any) {
  return StyleSheet.create({
    listRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 12 },
    listRowTitle:    { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    listRowSubtitle: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 },
    statusIcon:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  });
}

const styles = StyleSheet.create({
  emptyState:     { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyStateText: { fontSize: 13, fontWeight: '500' },
});
