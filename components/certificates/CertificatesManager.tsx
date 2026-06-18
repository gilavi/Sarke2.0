// Equipment-certificate manager for one inspection. Rendered as a full screen
// (the /inspections/[id]/certificates route) — replaces the former modal
// CertificatesActionSheet so the photo picker, keyboard handling and back
// button all behave like the rest of the app.
//
// Two internal views (state-driven): 'list' (rows + add CTA) and 'edit'
// (CertEditForm). Each successful save/delete marks the inspection's certs
// dirty so the result screen rebuilds its live PDF preview on return.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CircleCheck, CircleX, ChevronRight, Plus } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { HeaderBackButton } from '../HeaderBackButton';
import { SkeletonRow } from '../Skeleton';
import { CertEditForm } from './CertEditForm';
import { inspectionAttachmentsApi } from '../../lib/services';
import { type InspectionAttachment } from '../../types/models';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { friendlyError } from '../../lib/errorMap';
import { markCertsDirty } from '../../lib/certDirty';
import { a11y } from '../../lib/accessibility';

type View_ = { kind: 'list' } | { kind: 'edit'; existing?: InspectionAttachment };

export function CertificatesManager({
  inspectionId,
  onClose,
}: {
  inspectionId: string;
  /** Navigate back to the screen that pushed this route (router.back). */
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const toast = useToast();
  const [view, setView] = useState<View_>({ kind: 'list' });
  const [items, setItems] = useState<InspectionAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await inspectionAttachmentsApi.listByInspection(inspectionId));
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [inspectionId, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const afterChange = useCallback(async () => {
    markCertsDirty(inspectionId);
    await reload();
    setView({ kind: 'list' });
  }, [inspectionId, reload]);

  if (view.kind === 'edit') {
    return (
      <CertEditForm
        inspectionId={inspectionId}
        existing={view.existing}
        onBack={() => setView({ kind: 'list' })}
        onSaved={afterChange}
        onDeleted={afterChange}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <HeaderBackButton onPress={onClose} />
        <Text style={styles.headerTitle} numberOfLines={1}>სერტიფიკატები</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        {loading ? (
          <View style={{ gap: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} style={{ backgroundColor: theme.colors.subtleSurface, borderRadius: 12 }} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>სერტიფიკატი ჯერ არ დამატებულა</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {items.map(item => (
              <CertRow key={item.id} item={item} styles={styles} theme={theme} onPress={() => setView({ kind: 'edit', existing: item })} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => setView({ kind: 'edit' })}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
          {...a11y('სერტიფიკატის დამატება', 'ახალი სერტიფიკატის დამატება', 'button')}
        >
          <Plus size={18} color={theme.colors.accent} strokeWidth={2} />
          <Text style={styles.addBtnText}>სერტიფიკატის დამატება</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CertRow({
  item,
  styles,
  theme,
  onPress,
}: {
  item: InspectionAttachment;
  styles: ReturnType<typeof createStyles>;
  theme: any;
  onPress: () => void;
}) {
  const hasPhoto = !!item.photo_path;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.cert_type}
          {item.cert_number ? ` №${item.cert_number}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {hasPhoto ? (
            <CircleCheck size={14} color={theme.colors.accent} strokeWidth={1.5} />
          ) : (
            <CircleX size={14} color={theme.colors.inkFaint} strokeWidth={1.5} />
          )}
          <Text style={[styles.rowMeta, { color: hasPhoto ? theme.colors.accent : theme.colors.inkFaint }]}>
            {hasPhoto ? '✓ ფოტო' : 'ფოტო არ არის'}
          </Text>
        </View>
      </View>
      <ChevronRight size={18} color={theme.colors.inkFaint} strokeWidth={1.5} />
    </Pressable>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.ink },
    headerSpacer: { width: 38 },
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
    emptyText: { textAlign: 'center', color: theme.colors.inkSoft, paddingVertical: 24 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.subtleSurface,
    },
    rowTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.ink },
    rowMeta: { fontSize: 12, fontWeight: '600' },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 48,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    addBtnText: { fontSize: 15, fontWeight: '700', color: theme.colors.accent },
  });
}
