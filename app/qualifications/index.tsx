// Qualifications list — the expert's professional credentials
// (xaracho_inspector etc.). Reached from the More tab.
//
// Layout: a fixed "Required" section with one slot per REQUIRED_TYPES entry
// (empty slots act as upload affordances) and an "Additional" section for
// any qualifications whose type isn't in the required set.
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen } from '../../components/ui';
import { Skeleton } from '../../components/Skeleton';
import { haptic } from '../../lib/haptics';
import { isExpiringSoon, qualificationsApi, storageApi } from '../../lib/services';
import { useQualifications } from '../../lib/apiHooks';
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
      qc.invalidateQueries({ queryKey: ['qualifications', 'list'] });
    } catch (e) {
      haptic.error();
      Alert.alert('წაშლა ვერ მოხერხდა', toErrorMessage(e, 'ქსელის შეცდომა'));
    }
    setDeleteTarget(null);
  };

  const goAdd = (typeValue?: string) => {
    haptic.light?.();
    setAddInitialType(typeValue);
    setAddSheetVisible(true);
  };

  const additional = quals.filter(q => !REQUIRED_TYPE_VALUES.has(q.type));

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'სერტიფიკატები' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100, gap: 20 }}
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Required section */}
          <View style={{ gap: 10 }}>
            <SectionHeader title="სავალდებულო სერტიფიკატები" />
            {!loaded ? (
              <View style={{ gap: 12 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={`sk-${i}`} />
                ))}
              </View>
            ) : (
              REQUIRED_TYPES.map(rt => {
                const match = quals.find(q => q.type === rt.value);
                return match ? (
                  <FilledCard
                    key={rt.value}
                    qual={match}
                    onDelete={() => confirmRemove(match)}
                  />
                ) : (
                  <EmptySlot
                    key={rt.value}
                    label={rt.label}
                    onPress={() => goAdd(rt.value)}
                  />
                );
              })
            )}
          </View>

          {/* Additional section */}
          {additional.length > 0 && (
            <View style={{ gap: 10 }}>
              <SectionHeader title="დამატებითი სერტიფიკატები" />
              {additional.map(q => (
                <FilledCard key={q.id} qual={q} onDelete={() => confirmRemove(q)} />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <DeleteModal
        visible={deleteModalVisible}
        onClose={() => { setDeleteModalVisible(false); setDeleteTarget(null); }}
        onConfirm={doRemove}
        title={deleteTarget?.number ?? (deleteTarget ? labelForType(deleteTarget.type) : '')}
      />

      <AddQualificationSheet
        visible={addSheetVisible}
        initialType={addInitialType}
        onClose={() => setAddSheetVisible(false)}
        onSaved={() => { setAddSheetVisible(false); qc.invalidateQueries({ queryKey: ['qualifications', 'list'] }); }}
      />

      <Pressable
        onPress={() => goAdd()}
        style={[qStyles.fab, theme.shadow.button]}
        {...a11y('ახალი სერტიფიკატი', 'სერტიფიკატის დამატება', 'button')}
      >
        <Ionicons name="add" size={28} color={theme.colors.white} />
      </Pressable>
    </Screen>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  const qStyles = useMemo(() => getqStyles(theme), [theme]);
  return (
    <Text style={qStyles.sectionHeader}>{title}</Text>
  );
}

function SkeletonRow() {
  return (
    <Card padding={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={56} height={56} radius={10} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={'55%'} height={14} />
          <Skeleton width={'35%'} height={11} />
          <Skeleton width={'45%'} height={11} />
        </View>
        <Skeleton width={70} height={22} radius={999} />
      </View>
    </Card>
  );
}

function QualThumb({ uri }: { uri?: string | null }) {
  const { theme } = useTheme();
  const qStyles = useMemo(() => getqStyles(theme), [theme]);
  const [errored, setErrored] = useState(false);

  if (!uri || errored) {
    return (
      <View style={qStyles.thumbEmpty}>
        <Ionicons name="image-outline" size={22} color={theme.colors.inkFaint} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={qStyles.thumb}
      contentFit="cover"
      transition={150}
      onError={(e) => {
        console.warn('[qualifications] thumb image render failed', { uri, err: e });
        setErrored(true);
      }}
    />
  );
}

function FilledCard({ qual, onDelete }: { qual: QualWithThumb; onDelete: () => void }) {
  const { theme } = useTheme();
  const qStyles = useMemo(() => getqStyles(theme), [theme]);

  const status = statusOf(qual);
  return (
    <Card padding={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <QualThumb uri={qual.thumbUrl} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
            {labelForType(qual.type)}
          </Text>
          {qual.number ? (
            <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>№ {qual.number}</Text>
          ) : null}
          {qual.expires_at ? (
            <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 }}>
              ვადა: {new Date(qual.expires_at).toLocaleDateString('ka')}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={status} />
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          style={{ padding: 6 }}
          {...a11y('წაშლა', 'სერტიფიკატის წაშლა', 'button')}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
        </Pressable>
      </View>
    </Card>
  );
}

function EmptySlot({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const qStyles = useMemo(() => getqStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      style={qStyles.emptySlot}
      {...a11y(label, 'სერტიფიკატის ატვირთვა', 'button')}
    >
      <View style={qStyles.thumbEmptyDashed}>
        <Ionicons name="cloud-upload-outline" size={22} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{label}</Text>
        <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 }}>
          ატვირთვა
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={theme.colors.accent} />
    </Pressable>
  );
}

function statusOf(q: Qualification): 'expired' | 'expiring' | 'ok' {
  if (!q.expires_at) return 'ok';
  const exp = new Date(q.expires_at).getTime();
  if (exp < Date.now()) return 'expired';
  if (isExpiringSoon(q)) return 'expiring';
  return 'ok';
}

function StatusBadge({ status }: { status: 'expired' | 'expiring' | 'ok' }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getqStyles(theme), [theme]);

  if (status === 'ok') return null;
  const label = status === 'expired' ? 'ვადა გასულია' : 'იწურება';
  const bg = status === 'expired' ? theme.colors.dangerSoft : theme.colors.warnSoft;
  const fg = status === 'expired' ? theme.colors.danger : theme.colors.warn;
  return (
    <View style={badgeStyle(bg)}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: fg }}>{label}</Text>
    </View>
  );
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
                <Ionicons name="trash" size={28} color={theme.colors.danger} />
              </View>
              <Text style={qStyles.modalTitle}>წაშლა?</Text>
              <Text style={qStyles.modalBody}>{title}</Text>
            </View>
            <View style={{ gap: 10, marginTop: 8 }}>
              <Button title="გაუქმება" variant="secondary" onPress={onClose} {...a11y('გაუქმება', undefined, 'button')} />
              <Button title="წაშლა" variant="danger" onPress={onConfirm} iconLeft={<Ionicons name="trash-outline" size={18} color={theme.colors.danger} />} {...a11y('წაშლა', 'სერტიფიკატის წაშლა', 'button')} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getqStyles(theme: any) {
  return StyleSheet.create({
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: theme.colors.subtleSurface,
  },
  thumbEmpty: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: theme.colors.subtleSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmptyDashed: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.hairline,
    borderStyle: 'dashed',
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
}

const badgeStyle = (bg: string) => ({
  backgroundColor: bg,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 16,
});
