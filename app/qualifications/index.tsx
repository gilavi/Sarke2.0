// Qualifications list - the expert's professional credentials
// (xaracho_inspector etc.). Reached from the More tab.
//
// Layout: a "სხვა" (custom) row on top that opens the add sheet for an
// arbitrary certificate, then a 2-column thumbnail grid with one card per
// REQUIRED_TYPES entry (empty cards are dashed upload affordances, filled
// cards show the document thumbnail with edit/delete actions). Any
// qualification whose type isn't in the required set is appended to the grid.
import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { RefreshControl } from '../../components/primitives';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Trash2, CloudUpload, Pencil, ChevronRight, FileText, Plus } from 'lucide-react-native';
import { Button } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { HeaderBackButton } from '../../components/HeaderBackButton';
import { haptic } from '../../lib/haptics';
import { isExpiringSoon, qualificationsApi, storageApi } from '../../lib/services';
import { qk, useQualifications } from '../../lib/apiHooks';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';

import { toErrorMessage } from '../../lib/logError';
import { useQueryClient } from '@tanstack/react-query';
import { a11y } from '../../lib/accessibility';
import type { Qualification } from '../../types/models';
import { REQUIRED_TYPES, REQUIRED_TYPE_VALUES, labelForType } from '../../lib/qualificationTypes';
import AddQualificationSheet from '../../components/qualifications/AddQualificationSheet';

type QualWithThumb = Qualification & { thumbUrl?: string | null };

export default function QualificationsScreen() {
  const qc = useQueryClient();
  const { theme } = useTheme();
  const qStyles = useMemo(() => getqStyles(theme), [theme]);
  const qualsQ = useQualifications();
  const [loaded, setLoaded] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Qualification | null>(null);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [addInitialType, setAddInitialType] = useState<string | undefined>(undefined);
  const [editTarget, setEditTarget] = useState<Qualification | null>(null);

  // Derive thumbs from the React Query cached list.
  const [quals, setQuals] = useState<QualWithThumb[]>([]);
  useEffect(() => {
    if (!qualsQ.data) return;
    let cancelled = false;
    (async () => {
      const withThumbs: QualWithThumb[] = await Promise.all(
        qualsQ.data!.map(async q => {
          if (!q.file_url) return { ...q, thumbUrl: null };
          try {
            const url = await storageApi.signedUrl(STORAGE_BUCKETS.certificates, q.file_url, 3600);
            return { ...q, thumbUrl: url };
          } catch (err) {
            console.warn('[qualifications] thumb signedUrl failed', { path: q.file_url, err });
            return { ...q, thumbUrl: null };
          }
        }),
      );
      if (!cancelled) {
        setQuals(withThumbs);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [qualsQ.data]);

  const confirmRemove = (q: Qualification) => {
    haptic.medium();
    setDeleteTarget(q);
    setDeleteModalVisible(true);
  };

  const doRemove = async () => {
    if (!deleteTarget) return;
    setDeleteModalVisible(false);
    try {
      await qualificationsApi.remove(deleteTarget.id);
      haptic.success();
      qc.invalidateQueries({ queryKey: qk.qualifications.list });
    } catch (e) {
      haptic.error();
      Alert.alert('წაშლა ვერ მოხერხდა', toErrorMessage(e, 'ქსელის შეცდომა'));
    }
    setDeleteTarget(null);
  };

  const goAdd = (typeValue?: string) => {
    haptic.light?.();
    setEditTarget(null);
    setAddInitialType(typeValue);
    setAddSheetVisible(true);
  };

  const goEdit = (q: Qualification) => {
    haptic.light?.();
    setAddInitialType(undefined);
    setEditTarget(q);
    setAddSheetVisible(true);
  };

  const additional = quals.filter(q => !REQUIRED_TYPE_VALUES.has(q.type));

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.background }}>
        <View style={qStyles.header}>
          <HeaderBackButton />
          <Text style={qStyles.headerTitle} numberOfLines={1}>სერტიფიკატები</Text>
          <View style={qStyles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl queries={[qualsQ]} />}
      >
        {/* Custom certificate entry */}
        <Pressable
          onPress={() => goAdd('general')}
          style={qStyles.customRow}
          {...a11y('სხვა ნებისმიერი სერტიფიკატი', 'მორგებული სერტიფიკატის დამატება', 'button')}
        >
          <View style={qStyles.customIcon}>
            <Plus size={18} color={theme.colors.inkSoft} strokeWidth={2} />
          </View>
          <Text style={qStyles.customText}>სხვა ნებისმიერი სერტიფიკატი</Text>
          <ChevronRight size={18} color={theme.colors.inkFaint} strokeWidth={1.5} />
        </Pressable>

        {/* Thumbnail grid */}
        <View style={qStyles.grid}>
          {!loaded ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)
          ) : (
            <>
              {REQUIRED_TYPES.map(rt => {
                const match = quals.find(q => q.type === rt.value);
                return match ? (
                  <FilledCard
                    key={rt.value}
                    qual={match}
                    label={rt.label}
                    onEdit={() => goEdit(match)}
                    onDelete={() => confirmRemove(match)}
                  />
                ) : (
                  <EmptyCard key={rt.value} label={rt.label} onPress={() => goAdd(rt.value)} />
                );
              })}
              {additional.map(q => (
                <FilledCard
                  key={q.id}
                  qual={q}
                  label={labelForType(q.type)}
                  onEdit={() => goEdit(q)}
                  onDelete={() => confirmRemove(q)}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <DeleteModal
        visible={deleteModalVisible}
        onClose={() => { setDeleteModalVisible(false); setDeleteTarget(null); }}
        onConfirm={doRemove}
        title={deleteTarget?.number ?? (deleteTarget ? labelForType(deleteTarget.type) : '')}
      />

      <AddQualificationSheet
        visible={addSheetVisible}
        initialType={addInitialType}
        existing={editTarget}
        onClose={() => { setAddSheetVisible(false); setEditTarget(null); }}
        onSaved={() => {
          setAddSheetVisible(false);
          setEditTarget(null);
          qc.invalidateQueries({ queryKey: qk.qualifications.list });
        }}
      />
    </View>
  );
}

function StatusPill({ status }: { status: 'expired' | 'expiring' | 'ok' }) {
  const { theme } = useTheme();
  if (status === 'ok') return null;
  const label = status === 'expired' ? 'ვადა გასულია' : 'იწურება';
  const bg = status === 'expired' ? theme.colors.dangerSoft : theme.colors.warnSoft;
  const fg = status === 'expired' ? theme.colors.danger : theme.colors.warn;
  return (
    <View style={[badgeStyle(bg), { position: 'absolute', top: 6, left: 6 }]}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: fg }}>{label}</Text>
    </View>
  );
}

function FilledCard({
  qual,
  label,
  onEdit,
  onDelete,
}: {
  qual: QualWithThumb;
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();
  const qStyles = useMemo(() => getqStyles(theme), [theme]);
  const status = statusOf(qual);

  return (
    <View style={qStyles.card}>
      <View style={qStyles.thumb}>
        {qual.thumbUrl ? (
          <Image source={{ uri: qual.thumbUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <View style={qStyles.thumbPlaceholder}>
            <FileText size={28} color={theme.colors.inkFaint} strokeWidth={1.5} />
          </View>
        )}
        <StatusPill status={status} />
        <View style={qStyles.actions}>
          <Pressable
            onPress={onEdit}
            hitSlop={8}
            style={qStyles.actionBtn}
            {...a11y('რედაქტირება', 'სერტიფიკატის რედაქტირება', 'button')}
          >
            <Pencil size={15} color={theme.colors.ink} strokeWidth={1.6} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            style={qStyles.actionBtn}
            {...a11y('წაშლა', 'სერტიფიკატის წაშლა', 'button')}
          >
            <Trash2 size={15} color={theme.colors.danger} strokeWidth={1.6} />
          </Pressable>
        </View>
      </View>
      <View style={qStyles.footer}>
        <Text style={qStyles.cardName} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

function EmptyCard({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const qStyles = useMemo(() => getqStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      style={qStyles.cardEmpty}
      {...a11y(label, 'სერტიფიკატის ატვირთვა', 'button')}
    >
      <View style={qStyles.thumbEmpty}>
        <CloudUpload size={24} color={theme.colors.inkFaint} strokeWidth={1.5} />
        <Text style={qStyles.uploadHint}>ატვირთვა</Text>
      </View>
      <View style={qStyles.footer}>
        <Text style={qStyles.cardNameEmpty} numberOfLines={1}>{label}</Text>
      </View>
    </Pressable>
  );
}

function SkeletonCard() {
  const { theme } = useTheme();
  const qStyles = useMemo(() => getqStyles(theme), [theme]);
  return (
    <View style={qStyles.card}>
      <Skeleton width={'100%'} height={120} radius={0} />
      <View style={qStyles.footer}>
        <Skeleton width={'70%'} height={13} />
      </View>
    </View>
  );
}

function statusOf(q: Qualification): 'expired' | 'expiring' | 'ok' {
  if (!q.expires_at) return 'ok';
  const exp = new Date(q.expires_at).getTime();
  if (exp < Date.now()) return 'expired';
  if (isExpiringSoon(q)) return 'expiring';
  return 'ok';
}

function DeleteModal({
  visible,
  onClose,
  onConfirm,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}) {
  const { theme } = useTheme();
  const qStyles = useMemo(() => getqStyles(theme), [theme]);

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      fade.setValue(0);
      Animated.timing(fade, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fade]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFillObject}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} {...a11y('გაუქმება', 'დიალოგის დახურვა', 'button')} />
        </Animated.View>

        <View style={qStyles.modalWrap}>
          <View style={qStyles.modalCard}>
            <View style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={qStyles.iconCircle}>
                <Trash2 size={28} color={theme.colors.danger} strokeWidth={1.5} />
              </View>
              <Text style={qStyles.modalTitle}>წაშლა?</Text>
              <Text style={qStyles.modalBody}>{title}</Text>
            </View>
            <View style={{ gap: 10, marginTop: 8 }}>
              <Button title="გაუქმება" variant="secondary" onPress={onClose} {...a11y('გაუქმება', undefined, 'button')} />
              <Button title="წაშლა" variant="danger" onPress={onConfirm} iconLeft={<Trash2 size={18} color={theme.colors.danger} strokeWidth={1.5} />} {...a11y('წაშლა', 'სერტიფიკატის წაშლა', 'button')} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CARD_RADIUS = 16;

function getqStyles(theme: any) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    headerSpacer: { width: 38 },
    customRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      padding: 12,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    customIcon: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    customText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.inkSoft,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 12,
    },
    card: {
      width: '48%',
      borderRadius: CARD_RADIUS,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      overflow: 'hidden',
    },
    cardEmpty: {
      width: '48%',
      borderRadius: CARD_RADIUS,
      backgroundColor: theme.colors.card,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      overflow: 'hidden',
    },
    thumb: {
      height: 120,
      backgroundColor: theme.colors.subtleSurface,
    },
    thumbPlaceholder: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbEmpty: {
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    uploadHint: {
      fontSize: 11,
      color: theme.colors.inkFaint,
    },
    actions: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      flexDirection: 'row',
      gap: 6,
    },
    actionBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderTopWidth: 1,
      borderTopColor: theme.colors.subtleSurface,
    },
    cardName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    cardNameEmpty: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
    modalWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: 20,
      width: '100%',
      maxWidth: 320,
      gap: 4,
      ...theme.shadow.card,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    modalBody: {
      fontSize: 14,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}

const badgeStyle = (bg: string) => ({
  backgroundColor: bg,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 16,
});
