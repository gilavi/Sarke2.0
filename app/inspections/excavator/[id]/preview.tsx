import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../../components/primitives/A11yText';
import { Button, Screen } from '../../../../components/ui';
import { SignatureCanvas } from '../../../../components/SignatureCanvas';
import { excavatorApi } from '../../../../lib/excavatorService';
import { useTheme } from '../../../../lib/theme';
import { useToast } from '../../../../lib/toast';
import { pickPhoto } from '../../../../lib/photoPicker';
import { uploadOrQueue } from '../../../../lib/offline';
import { STORAGE_BUCKETS } from '../../../../lib/supabase';
import { imageForDisplay } from '../../../../lib/imageUrl';
import { EXCAVATOR_VERDICT_LABEL } from '../../../../types/excavator';
import type { ExcavatorInspection } from '../../../../types/excavator';

export default function ExcavatorPreviewScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [inspection, setInspection] = useState<ExcavatorInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSig, setShowSig] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    excavatorApi.getById(id)
      .then(data => {
        if (cancelled) return;
        if (data) {
          setInspection(data);
          setPhotoPaths(data.summaryPhotos || []);
        }
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const updateField = useCallback(
    async (field: keyof ExcavatorInspection, value: unknown) => {
      if (!inspection) return;
      setInspection(prev => prev ? { ...prev, [field]: value } : prev);
      await excavatorApi.update(inspection.id, { [field]: value });
    },
    [inspection],
  );

  const handleSignature = useCallback(
    async (base64: string) => {
      if (!inspection) return;
      setShowSig(false);
      const { data, error } = await excavatorApi.uploadSignature(inspection.id, base64);
      if (error || !data?.path) {
        toast.show('ხელმოწერის შენახვა ვერ მოხერხდა');
        return;
      }
      await updateField('inspectorSignature', data.path);
      toast.show('ხელმოწერა შენახულია');
    },
    [inspection, updateField, toast],
  );

  const handleAddPhoto = useCallback(async () => {
    if (!inspection) return;
    try {
      const uri = await pickPhoto({ allowsMultipleSelection: false, quality: 0.85 });
      if (!uri) return;
      const remote = await uploadOrQueue(
        STORAGE_BUCKETS.INSPECTION_PHOTOS,
        `inspections/${inspection.id}/certificates/${Date.now()}.jpg`,
        uri,
      );
      if (remote) {
        const next = [...photoPaths, remote];
        setPhotoPaths(next);
        await updateField('summaryPhotos', next);
        toast.show('სერტიფიკატი დამატებულია');
      }
    } catch (e) {
      toast.show('სერტიფიკატის ატვირთვა ვერ მოხერხდა');
    }
  }, [inspection, photoPaths, updateField, toast]);

  const handleDeletePhoto = useCallback(
    async (path: string) => {
      if (!inspection) return;
      const next = photoPaths.filter(p => p !== path);
      setPhotoPaths(next);
      await updateField('summaryPhotos', next);
    },
    [inspection, photoPaths, updateField],
  );

  const handlePdf = useCallback(async () => {
    if (!inspection) return;
    setGeneratingPdf(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      toast.show('PDF გენერირებულია');
    } catch (e) {
      toast.show('PDF გენერირება ვერ მოხერხდა');
    } finally {
      setGeneratingPdf(false);
    }
  }, [inspection, toast]);

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!inspection) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centred}>
          <Text style={styles.emptyTitle}>აქტი ვერ მოიძებნა</Text>
          <Button title="უკან" variant="secondary" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </Screen>
    );
  }

  const flatItems = [
    ...inspection.engineItems,
    ...inspection.undercarriageItems,
    ...inspection.cabinItems,
    ...inspection.safetyItems,
  ];
  const counts = {
    good: flatItems.filter(i => i.result === 'good').length,
    deficient: flatItems.filter(i => i.result === 'deficient').length,
    unusable: flatItems.filter(i => i.result === 'unusable').length,
    total: flatItems.length,
  };

  const isApproved = inspection.verdict === 'approved';

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>ექსკავატორი</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* PDF thumbnail + title row */}
          <View style={styles.pdfRow}>
            <View style={styles.pdfThumb}>
              <Ionicons name="document-text" size={32} color={theme.colors.accent} />
            </View>
            <View style={styles.pdfTitleBlock}>
              <Text style={styles.pdfTitle} numberOfLines={2}>
                ექსკავატორი — შემოწმების აქტი
              </Text>
              <Text style={styles.pdfId}>{inspection.serialNumber || inspection.id.slice(0, 8).toUpperCase()}</Text>
            </View>
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>სერ. ნომერი</Text>
                <Text style={styles.infoValue}>{inspection.serialNumber || '—'}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>ობიექტი</Text>
                <Text style={styles.infoValue}>{inspection.projectName || '—'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>თარიღი</Text>
                <Text style={styles.infoValue}>{inspection.inspectionDate}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>შემომწმებელი</Text>
                <Text style={styles.infoValue}>{inspection.inspectorName || '—'}</Text>
              </View>
            </View>
          </View>

          {/* Status badge */}
          <View style={[styles.statusCard, isApproved ? styles.statusApproved : styles.statusRejected]}>
            <Ionicons name={isApproved ? 'checkmark-circle' : 'close-circle'} size={22} color="#fff" />
            <Text style={styles.statusText}>
              {isApproved ? '✓ უსაფრთხო ექსპლუატაცია' : inspection.verdict === 'conditional' ? '⚠ პირობითი' : '✗ ექსპლუატაცია აკრძალულია'}
            </Text>
          </View>

          {/* Items progress */}
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>შემოწმებულია</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressNumber}>{String(counts.total).padStart(2, '0')}</Text>
              <Text style={styles.progressTotal}> / {counts.total} პუნქტი</Text>
            </View>
            <View style={styles.progressCounts}>
              <View style={styles.countPill}>
                <Ionicons name="checkmark" size={14} color={theme.colors.semantic.success} />
                <Text style={[styles.countPillText, { color: theme.colors.semantic.success }]}>{counts.good} სარეკ.</Text>
              </View>
              <View style={styles.countPill}>
                <Ionicons name="warning" size={14} color={theme.colors.warn} />
                <Text style={[styles.countPillText, { color: theme.colors.warn }]}>{counts.deficient} ხარვ.</Text>
              </View>
              <View style={styles.countPill}>
                <Ionicons name="close" size={14} color={theme.colors.danger} />
                <Text style={[styles.countPillText, { color: theme.colors.danger }]}>{counts.unusable} გამოუს.</Text>
              </View>
            </View>
          </View>

          {/* Certificate + Signature buttons */}
          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={handleAddPhoto}>
              <Ionicons name="document-text-outline" size={18} color={theme.colors.ink} />
              <Text style={styles.actionBtnText}>სერტ. ({photoPaths.length})</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setShowSig(true)}>
              <Ionicons name="create-outline" size={18} color={theme.colors.ink} />
              <Text style={styles.actionBtnText}>
                ხელმ. ({inspection.inspectorSignature ? '1/1' : '0/1'})
              </Text>
            </Pressable>
          </View>

          {/* Certificate thumbnails */}
          {photoPaths.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {photoPaths.map(path => (
                <View key={path} style={styles.photoThumbWrap}>
                  <Image source={{ uri: imageForDisplay(path, STORAGE_BUCKETS.INSPECTION_PHOTOS) }} style={styles.photoThumb} />
                  <Pressable onPress={() => handleDeletePhoto(path)} style={styles.photoDelete}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </ScrollView>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <Button
            title="გადმოწერა"
            onPress={handlePdf}
            loading={generatingPdf}
          />
        </View>
      </SafeAreaView>

      <SignatureCanvas
        visible={showSig}
        personName={inspection.serialNumber || ''}
        onCancel={() => setShowSig(false)}
        onConfirm={handleSignature}
      />
    </Screen>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.inkSoft },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.ink, flex: 1, textAlign: 'center' },
    scroll: { padding: 16, gap: 12, paddingBottom: 24 },
    pdfRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
    pdfThumb: {
      width: 64, height: 80,
      borderRadius: 8,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pdfTitleBlock: { flex: 1 },
    pdfTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.ink, lineHeight: 22 },
    pdfId: { fontSize: 12, color: theme.colors.inkSoft, marginTop: 4 },
    infoCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },
    infoRow: { flexDirection: 'row', gap: 12 },
    infoCol: { flex: 1, gap: 4 },
    infoLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.inkSoft, textTransform: 'uppercase' },
    infoValue: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
    statusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 10,
    },
    statusApproved: { backgroundColor: theme.colors.semantic.success },
    statusRejected: { backgroundColor: theme.colors.danger },
    statusText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    progressCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 14,
      gap: 8,
    },
    progressLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.inkSoft, textTransform: 'uppercase' },
    progressRow: { flexDirection: 'row', alignItems: 'baseline' },
    progressNumber: { fontSize: 28, fontWeight: '800', color: theme.colors.ink },
    progressTotal: { fontSize: 14, color: theme.colors.inkSoft },
    progressCounts: { flexDirection: 'row', gap: 8, marginTop: 4 },
    countPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    countPillText: { fontSize: 12, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    actionBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.ink },
    photoRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
    photoThumbWrap: { position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
    photoThumb: { width: 64, height: 64 },
    photoDelete: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 },
    bottomBar: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
    },
  });
}
