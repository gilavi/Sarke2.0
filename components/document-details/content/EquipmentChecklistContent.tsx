// EquipmentChecklistContent — the content body for an EQUIPMENT inspection
// detail page (bobcat, excavator, forklift, …).
//
// Equipment types don't use the generic template/answers model (that's
// InspectionPointsContent); each stores its own typed checklist item arrays and
// renders a hand-written PDF. To show a structured native detail page we
// normalize every type into the schema's `ChecklistSection`/`RenderItem` shape
// (see lib/inspection/schema.ts) and render it here: optional section headers,
// one row per point with a tone'd result badge + comment + photo thumbnails,
// followed by the conclusion notes + summary photos. The verdict itself is shown
// as the status pill at the top of DocumentDetails, so it is not repeated here.
//
// Rows + the grouped-list look are reused from components/success so it matches
// the act / incident / report detail pages.
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react-native';
import { A11yText as Text } from '../../primitives/A11yText';
import { Badge, type BadgeVariant } from '../../primitives/Badge';
import { useTheme, type Theme } from '../../../lib/theme';
import { SuccessListRow, RowLead } from '../../success/SuccessListRow';
import { imageForDisplay } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import type { ChecklistSection, ResultOption } from '../../../lib/inspection/schema';

interface Props {
  /** Normalized checklist sections (from the type's catalog + item state). */
  sections: ChecklistSection[];
  /** Result vocabulary, used to resolve a result value → label + tone. */
  resultOptions: ResultOption[];
  /** Conclusion free-text (shown under the checklist). */
  notes?: string | null;
  /** Summary photo storage paths (answer-photos bucket). */
  summaryPhotos?: string[];
}

const TONE_VARIANT: Record<string, BadgeVariant> = {
  good: 'success',
  warn: 'warning',
  bad: 'danger',
  neutral: 'default',
};

/** Lazily resolves storage paths → display URLs and renders a thumbnail row. */
function PhotoStrip({ paths }: { paths: string[] }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = await Promise.all(
        paths.map((p) => imageForDisplay(STORAGE_BUCKETS.answerPhotos, p).catch(() => '')),
      );
      if (!cancelled) setUrls(resolved.filter(Boolean));
    })();
    return () => { cancelled = true; };
  }, [paths]);

  if (urls.length === 0) return null;
  return (
    <View style={styles.photoStrip}>
      {urls.map((u, i) => (
        <Image key={`${u}-${i}`} source={{ uri: u }} style={styles.thumb} />
      ))}
    </View>
  );
}

export function EquipmentChecklistContent({ sections, resultOptions, notes, summaryPhotos }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const optionByValue = useMemo(() => {
    const map: Record<string, ResultOption> = {};
    for (const o of resultOptions) map[o.value] = o;
    return map;
  }, [resultOptions]);

  // Flatten to a single list with section-header markers preserved, so the
  // grouped-list card reads top-to-bottom like the act checklist.
  const hasAnyItem = sections.some((s) => s.items.length > 0);

  return (
    <View style={{ gap: 16 }}>
      {hasAnyItem ? (
        sections.map((section, si) =>
          section.items.length === 0 ? null : (
            <View key={section.title ?? `s-${si}`}>
              {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
              <View style={styles.list}>
                {section.items.map((item, ii) => {
                  const opt = item.result ? optionByValue[item.result] : undefined;
                  const variant = opt?.tone ? TONE_VARIANT[opt.tone] ?? 'default' : 'default';
                  const photos = item.photoPaths ?? [];
                  return (
                    <View key={String(item.id)}>
                      <SuccessListRow
                        isFirst={ii === 0}
                        lead={<RowLead icon={ClipboardList} />}
                        title={item.description || item.label}
                        subtitle={item.comment ?? undefined}
                        trailing={
                          opt ? <Badge variant={variant}>{opt.short ?? opt.label}</Badge> : undefined
                        }
                      />
                      {photos.length > 0 ? (
                        <View style={styles.rowPhotos}>
                          <PhotoStrip paths={photos} />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ),
        )
      ) : (
        <Text style={styles.empty}>{t('details.content.empty')}</Text>
      )}

      {notes?.trim() ? (
        <View>
          <Text style={styles.sectionTitle}>{t('details.content.notes')}</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{notes.trim()}</Text>
          </View>
        </View>
      ) : null}

      {summaryPhotos && summaryPhotos.length > 0 ? (
        <View>
          <Text style={styles.sectionTitle}>{t('details.content.photos')}</Text>
          <PhotoStrip paths={summaryPhotos} />
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
      overflow: 'hidden',
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    empty: { fontSize: 14, color: theme.colors.inkFaint, paddingHorizontal: 4 },
    notesCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
      padding: 14,
    },
    notesText: { fontSize: 15, lineHeight: 22, color: theme.colors.ink },
    rowPhotos: { paddingHorizontal: 14, paddingBottom: 12, marginTop: -2 },
    photoStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    thumb: {
      width: 76,
      height: 76,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSecondary,
    },
  });
}
