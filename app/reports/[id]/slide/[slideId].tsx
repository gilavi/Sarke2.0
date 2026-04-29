import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { A11yText as Text } from '../../../../components/primitives/A11yText';
import { useBottomSheet } from '../../../../components/BottomSheet';
import { Button } from '../../../../components/ui';
import { HeaderBackPill } from '../../../../components/HeaderBackPill';
import { useTheme } from '../../../../lib/theme';
import { useToast } from '../../../../lib/toast';
import { friendlyError } from '../../../../lib/errorMap';
import { reportsApi, storageApi } from '../../../../lib/services';
import { STORAGE_BUCKETS } from '../../../../lib/supabase';
import { getStorageImageDisplayUrl } from '../../../../lib/imageUrl';
import { setPhotoAnnotateCallback } from '../../../../lib/photoPickerBus';
import type { Report, ReportSlide } from '../../../../types/models';

export default function ReportSlideEditor() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const showSheet = useBottomSheet();
  const { id, slideId } = useLocalSearchParams<{ id: string; slideId: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [slide, setSlide] = useState<ReportSlide | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [annotatedPath, setAnnotatedPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !slideId) return;
    const r = await reportsApi.getById(id).catch(() => null);
    if (!r) return;
    setReport(r);
    const s = r.slides.find(x => x.id === slideId) ?? null;
    setSlide(s);
    if (s) {
      setTitle(s.title);
      setDescription(s.description);
      setImagePath(s.image_path);
      setAnnotatedPath(s.annotated_image_path);
    }
  }, [id, slideId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Resolve display URI for the active image.
  useEffect(() => {
    const path = annotatedPath ?? imagePath;
    if (!path) {
      setThumbUri(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const u = await getStorageImageDisplayUrl(STORAGE_BUCKETS.reportPhotos, path);
        if (!cancelled) setThumbUri(u);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [annotatedPath, imagePath]);

  const uploadLocalUri = async (localUri: string, kind: 'raw' | 'annotated'): Promise<string | null> => {
    if (!report) return null;
    const ext = (localUri.split('.').pop() || 'jpg').split('?')[0];
    const path = `${report.id}/${slideId}/${kind}-${Crypto.randomUUID()}.${ext}`;
    try {
      await storageApi.uploadFromUri(STORAGE_BUCKETS.reportPhotos, path, localUri, 'image/jpeg');
      return path;
    } catch (e) {
      toast.error(friendlyError(e, 'სურათის ატვირთვა ვერ მოხერხდა'));
      return null;
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      toast.error('კამერაზე წვდომა აკრძალულია');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (res.canceled || !res.assets?.[0]) return;
    setImageUploading(true);
    const newPath = await uploadLocalUri(res.assets[0].uri, 'raw');
    if (newPath) {
      setImagePath(newPath);
      setAnnotatedPath(null);
    }
    setImageUploading(false);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      toast.error('გალერეაზე წვდომა აკრძალულია');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.[0]) return;
    setImageUploading(true);
    const newPath = await uploadLocalUri(res.assets[0].uri, 'raw');
    if (newPath) {
      setImagePath(newPath);
      setAnnotatedPath(null);
    }
    setImageUploading(false);
  };

  const openAnnotator = async () => {
    const path = imagePath;
    if (!path) return;
    setImageUploading(true);
    try {
      const signed = await getStorageImageDisplayUrl(STORAGE_BUCKETS.reportPhotos, path);
      setPhotoAnnotateCallback(async annotatedLocalUri => {
        if (annotatedLocalUri) {
          const newPath = await uploadLocalUri(annotatedLocalUri, 'annotated');
          if (newPath) setAnnotatedPath(newPath);
        }
        setImageUploading(false);
      });
      router.push(`/photo-annotate?uri=${encodeURIComponent(signed)}` as any);
    } catch (e) {
      toast.error(friendlyError(e, 'ხატვის გახსნა ვერ მოხერხდა'));
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    showSheet(
      {
        title: 'სურათის წაშლა?',
        options: ['დიახ, წაშლა', 'გაუქმება'],
        cancelButtonIndex: 1,
        destructiveButtonIndex: 0,
      },
      idx => {
        if (idx !== 0) return;
        setImagePath(null);
        setAnnotatedPath(null);
      },
    );
  };

  const onImageTap = () => {
    if (!imagePath) {
      showSheet(
        {
          title: 'ფოტოს წყარო',
          options: ['გადაღება', 'გალერეა', 'გაუქმება'],
          cancelButtonIndex: 2,
        },
        idx => {
          if (idx === 0) void pickFromCamera();
          else if (idx === 1) void pickFromLibrary();
        },
      );
      return;
    }
    showSheet(
      {
        title: 'სურათის ცვლილება',
        options: ['გადაღება', 'გალერეა', 'ხატვა / რედაქტირება', 'წაშლა', 'გაუქმება'],
        cancelButtonIndex: 4,
        destructiveButtonIndex: 3,
      },
      idx => {
        if (idx === 0) void pickFromCamera();
        else if (idx === 1) void pickFromLibrary();
        else if (idx === 2) void openAnnotator();
        else if (idx === 3) removeImage();
      },
    );
  };

  const canSave = title.trim().length > 0 && !busy && !imageUploading;

  const onSave = async () => {
    if (!report || !slide || !canSave) return;
    setBusy(true);
    const next = report.slides.map(s =>
      s.id === slide.id
        ? {
            ...s,
            title: title.trim(),
            description: description.trim(),
            image_path: imagePath,
            annotated_image_path: annotatedPath,
          }
        : s,
    );
    try {
      await reportsApi.update(report.id, { slides: next });
      router.back();
    } catch (e) {
      toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      setBusy(false);
    }
  };

  if (!report || !slide) {
    return (
      <View style={[styles.centered, { flex: 1, backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  const slideIndex = report.slides.findIndex(s => s.id === slide.id);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          title: `სლაიდი ${slideIndex + 1}`,
          headerBackVisible: false,
          headerLeft: () => <HeaderBackPill onPress={() => router.back()} />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { color: theme.colors.ink, fontWeight: '700', fontSize: 17 },
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image section */}
          <Pressable onPress={onImageTap} style={styles.imageWrap}>
            {thumbUri ? (
              <Image source={{ uri: thumbUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={32} color={theme.colors.inkFaint} />
                <Text style={styles.imagePlaceholderText}>+ ფოტოს დამატება</Text>
              </View>
            )}
            {imageUploading ? (
              <View style={styles.imageOverlay}>
                <ActivityIndicator color={theme.colors.white} />
              </View>
            ) : null}
          </Pressable>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>სლაიდის სათაური *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="მაგ: ხარაჩოს ძირი"
              placeholderTextColor={theme.colors.inkFaint}
              style={styles.input}
              returnKeyType="next"
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>აღწერა</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="დაამატეთ დეტალები (სურვილისამებრ)"
              placeholderTextColor={theme.colors.inkFaint}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.multiline]}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Button title="შენახვა" onPress={onSave} disabled={!canSave} loading={busy} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    centered: { alignItems: 'center', justifyContent: 'center' },
    imageWrap: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.colors.subtleSurface,
    },
    imagePlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.borderStrong,
      borderRadius: 12,
    },
    imagePlaceholderText: { fontSize: 14, color: theme.colors.inkSoft, fontWeight: '600' },
    imageOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    field: { gap: 6 },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.inkSoft },
    input: {
      fontSize: 15,
      color: theme.colors.ink,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.surface,
    },
    multiline: {
      minHeight: 90,
      paddingTop: 10,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      backgroundColor: theme.colors.background,
    },
  });
}
