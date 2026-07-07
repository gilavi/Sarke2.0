import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Camera, Pencil, Plus, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { PressBounce } from '../../components/animations/PressBounce';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { AnswerPhoto } from '../../types/models';
import { PhotoThumb } from './PhotoThumb';
import { DebouncedNotes } from './DebouncedNotes';

/**
 * Shared photo + note attachments for inspection steps. Two quiet dashed bars:
 * the photo bar stays put and shows thumbnails as they're added; the note bar
 * morphs into the notes textarea on tap. Monochrome - no semantic colors.
 *
 * Reuses the canonical PhotoThumb (display) and DebouncedNotes (debounced save).
 * Photo picking/deleting is the caller's responsibility via the callbacks.
 */
export function AttachmentBars({
  photos,
  onPickPhoto,
  onDeletePhoto,
  onViewPhoto,
  note,
  onNoteCommit,
}: {
  photos: AnswerPhoto[];
  onPickPhoto: () => void;
  onDeletePhoto: (photo: AnswerPhoto) => void;
  onViewPhoto?: (photo: AnswerPhoto) => void;
  /** Omit `onNoteCommit` to render only the photo bar (e.g. the conclusion step). */
  note?: string | null;
  onNoteCommit?: (value: string) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const hasPhotos = photos.length > 0;
  const hasNote = !!(note && note.length > 0);
  const [noteOpen, setNoteOpen] = useState(false);
  const showNote = noteOpen || hasNote;

  return (
    <View style={{ gap: 10 }}>
      <PressBounce
        onPress={onPickPhoto}
        {...a11y(t('a11y.addPhoto'), t('inspections.addPhotoHintUpload'), 'button')}
      >
        <View style={[styles.bar, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <View style={styles.barLabel}>
            <Camera size={20} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={[styles.barText, { color: theme.colors.inkSoft }]}>{t('inspections.photoBarLabel')}</Text>
          </View>
          <Plus size={20} color={theme.colors.inkFaint} strokeWidth={1.5} />
        </View>
      </PressBounce>

      {hasPhotos ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbRow}
        >
          {photos.map(p => (
            <View key={p.id} style={styles.thumbWrap}>
              <Pressable onPress={() => onViewPhoto?.(p)} {...a11y(t('a11y.viewPhoto'), t('a11y.viewPhotoHint'), 'button')}>
                <PhotoThumb photo={p} size={72} />
              </Pressable>
              <Pressable
                onPress={() => onDeletePhoto(p)}
                style={[styles.thumbDel, { backgroundColor: theme.colors.ink, borderColor: theme.colors.surface }]}
                hitSlop={6}
                {...a11y(t('inspections.deletePhotoA11y'), undefined, 'button')}
              >
                <X size={12} color={theme.colors.white} strokeWidth={1.5} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {onNoteCommit ? (
        showNote ? (
          // autoFocus only when opened by tap (noteOpen) — a pre-existing note
          // shown on mount shouldn't yank the keyboard open.
          <DebouncedNotes initial={note ?? null} onCommit={onNoteCommit} autoFocus={noteOpen} />
        ) : (
          <PressBounce
            onPress={() => setNoteOpen(true)}
            {...a11y(t('inspections.addNoteA11y'), t('inspections.addNoteHint'), 'button')}
          >
            <View style={[styles.bar, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <View style={styles.barLabel}>
                <Pencil size={20} color={theme.colors.inkSoft} strokeWidth={1.5} />
                <Text style={[styles.barText, { color: theme.colors.inkSoft }]}>{t('inspections.noteBarLabel')}</Text>
              </View>
              <Plus size={20} color={theme.colors.inkFaint} strokeWidth={1.5} />
            </View>
          </PressBounce>
        )
      ) : null}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1.5,
      borderStyle: 'dashed',
    },
    barLabel: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    barText: { fontSize: 15, fontWeight: '500' },
    thumbRow: { gap: 8, paddingVertical: 2, paddingRight: 8 },
    thumbWrap: { position: 'relative', paddingTop: 6, paddingRight: 6 },
    thumbDel: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
