// Upload a new professional qualification (xaracho_inspector etc.) that can
// be attached to generated PDF certificates as proof of credential.
//
// Previously lived at `app/certificates/new.tsx` — moved in 0006 decoupling
// so `/certificates/new` can be repurposed as the PDF generator.
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field, Input, Screen } from '../../components/ui';
import { UploadOverlay } from '../../components/UploadOverlay';
import { qualificationsApi, storageApi } from '../../lib/services';
import { STORAGE_BUCKETS, supabase } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { haptics } from '../../lib/haptics';
import { friendlyError } from '../../lib/errorMap';
import { theme } from '../../lib/theme';

const TYPES: { value: string; label: string }[] = [
  { value: 'xaracho_inspector', label: 'ხარაჩოს ინსპექტორი' },
  { value: 'harness_inspector', label: 'ქამრების ინსპექტორი' },
  { value: 'general', label: 'სხვა' },
];

function formatDate(d: Date) {
  return d.toLocaleDateString('ka', { day: 'numeric', month: 'long', year: 'numeric' });
}
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AddQualification() {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState('xaracho_inspector');
  const [number, setNumber] = useState('');
  const [issued, setIssued] = useState(new Date());
  const [expires, setExpires] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<'issued' | 'expires' | null>(null);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!res.canceled && res.assets.length) setPhotoUri(res.assets[0].uri);
  };

  const save = async () => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხარ შესული');
      let filePath: string | null = null;
      if (photoUri) {
        const res = await fetch(photoUri);
        const blob = await res.blob();
        const path = `${user.id}/${Date.now()}.jpg`;
        await storageApi.upload(STORAGE_BUCKETS.certificates, path, blob, 'image/jpeg');
        filePath = path;
      }
      await qualificationsApi.upsert({
        id: crypto.randomUUID(),
        user_id: user.id,
        type,
        number: number || null,
        issued_at: toISO(issued),
        expires_at: toISO(expires),
        file_url: filePath,
      });
      haptics.success();
      toast.success('სერტიფიკატი დაემატა');
      router.back();
    } catch (e) {
      haptics.error();
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'ახალი სერტიფიკატი' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
       <KeyboardAvoidingView
         style={{ flex: 1 }}
         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
         keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
       >
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <Field label="ტიპი" required>
            <View style={{ gap: 8 }}>
              {TYPES.map(t => (
                <Pressable
                  key={t.value}
                  onPress={() => setType(t.value)}
                  style={[styles.typeRow, type === t.value && styles.typeRowActive]}
                >
                  <View style={[styles.radio, type === t.value && styles.radioActive]}>
                    {type === t.value && <Ionicons name="checkmark" size={13} color={theme.colors.white} />}
                  </View>
                  <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="ნომერი">
            <Input value={number} onChangeText={setNumber} placeholder="№ სერტიფიკატის ნომერი" />
          </Field>

          <Field label="გაცემის თარიღი" required>
            <Pressable onPress={() => setPicker('issued')} style={styles.dateBtn}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.dateBtnText}>{formatDate(issued)}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
            </Pressable>
          </Field>

          <Field label="ვადის გასვლის თარიღი" required>
            <Pressable onPress={() => setPicker('expires')} style={styles.dateBtn}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.dateBtnText}>{formatDate(expires)}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
            </Pressable>
            <View style={styles.chips}>
              {[{ label: '+1 წელი', months: 12 }, { label: '+3 წელი', months: 36 }, { label: '+5 წელი', months: 60 }].map(c => (
                <Pressable key={c.label} style={styles.chip} onPress={() => {
                  const d = new Date(issued);
                  d.setMonth(d.getMonth() + c.months);
                  setExpires(d);
                }}>
                  <Text style={styles.chipText}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Button
            title={photoUri ? '✓ ფოტო არჩეულია — შეცვლა' : 'სერტიფიკატის ფოტო'}
            variant="secondary"
            onPress={pickPhoto}
          />

          <Button title="შენახვა" onPress={save} loading={busy} />
        </ScrollView>
       </KeyboardAvoidingView>
      </SafeAreaView>
      <UploadOverlay
        visible={busy && !!photoUri}
        label="სერტიფიკატი იტვირთება…"
      />

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {picker === 'issued' ? 'გაცემის თარიღი' : 'ვადის გასვლა'}
              </Text>
              <Pressable onPress={() => setPicker(null)} hitSlop={12}>
                <Text style={{ color: theme.colors.accent, fontWeight: '700', fontSize: 15 }}>მზადაა</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={picker === 'issued' ? issued : expires}
              mode="date"
              display="spinner"
              locale="ka-GE"
              onChange={(_, date) => {
                if (!date) return;
                if (picker === 'issued') setIssued(date);
                else setExpires(date);
              }}
              style={{ height: 200 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  typeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 2, borderColor: theme.colors.hairline,
  },
  typeRowActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: theme.colors.hairline,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  radioActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 12, borderWidth: 1, borderColor: theme.colors.hairline,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  dateBtnText: { flex: 1, fontSize: 15, color: theme.colors.ink, fontWeight: '500' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.subtleSurface, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
  },
  sheetHandle: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center', marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.ink },
});
