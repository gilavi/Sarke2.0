// Bottom-sheet form for adding a qualification. Replaces the previous
// /qualifications/new route — opens in-place from the qualifications list.
import { useEffect, useState , useMemo} from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { SheetLayout } from '../SheetLayout';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field, Input } from '../ui';
import { qualificationsApi, storageApi } from '../../lib/services';
import { STORAGE_BUCKETS, supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';

import { toErrorMessage } from '../../lib/logError';
import { a11y } from '../../lib/accessibility';
import { REQUIRED_TYPES } from '../../lib/qualificationTypes';

const TYPES: { value: string; label: string }[] = [
  ...REQUIRED_TYPES,
  { value: 'general', label: 'სხვა' },
];

function formatDate(d: Date) {
  return d.toLocaleDateString('ka', { day: 'numeric', month: 'long', year: 'numeric' });
}
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AddQualificationSheet({
  visible,
  initialType,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initialType?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const [type, setType] = useState(initialType ?? 'xaracho_inspector');
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

  // Reset form whenever the sheet (re-)opens.
  useEffect(() => {
    if (visible) {
      setType(initialType && TYPES.some(t => t.value === initialType) ? initialType : 'xaracho_inspector');
      setNumber('');
      setIssued(new Date());
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setExpires(d);
      setPhotoUri(null);
      setPicker(null);
    }
  }, [visible, initialType]);

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
      if (!user) throw new Error('არ ხართ შესული');
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
      onSaved();
    } catch (e) {
      Alert.alert('შეცდომა', toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} {...a11y('დახურვა', 'ფანჯრის დახურვა', 'button')}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <SheetLayout
            header={{ title: 'ახალი სერტიფიკატი', onClose }}
            footer={
              <View style={{ gap: 10 }}>
                <Button
                  title={photoUri ? '✓ ფოტო არჩეულია — შეცვლა' : 'სერტიფიკატის ფოტო'}
                  variant="secondary"
                  onPress={pickPhoto}
                />
                <Button title="შენახვა" onPress={save} loading={busy} />
              </View>
            }
          >
            <Field label="ტიპი">
              <View style={{ gap: 8 }}>
                {TYPES.map(t => (
                  <Pressable
                    key={t.value}
                    onPress={() => setType(t.value)}
                    style={[styles.typeRow, type === t.value && styles.typeRowActive]}
                    {...a11y(t.label, 'სერტიფიკატის ტიპის არჩევა', 'radio')}
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

            <Field label="გაცემის თარიღი">
              <Pressable onPress={() => setPicker('issued')} style={styles.dateBtn} {...a11y('გაცემის თარიღი', 'გაცემის თარიღის არჩევა', 'button')}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.accent} />
                <Text style={styles.dateBtnText}>{formatDate(issued)}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
              </Pressable>
            </Field>

            <Field label="ვადის გასვლის თარიღი">
              <Pressable onPress={() => setPicker('expires')} style={styles.dateBtn} {...a11y('ვადის გასვლის თარიღი', 'ვადის გასვლის თარიღის არჩევა', 'button')}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.accent} />
                <Text style={styles.dateBtnText}>{formatDate(expires)}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
              </Pressable>
              <View style={styles.chips}>
                {[{ label: '+1 წელი', months: 12 }, { label: '+3 წელი', months: 36 }, { label: '+5 წელი', months: 60 }].map(c => (
                  <Pressable key={c.label} style={styles.chip} {...a11y(c.label, 'ვადის სწრაფად დამატება', 'button')} onPress={() => {
                    const d = new Date(issued);
                    d.setMonth(d.getMonth() + c.months);
                    setExpires(d);
                  }}>
                    <Text style={styles.chipText}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>
          </SheetLayout>
        </Pressable>
      </Pressable>

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPicker(null)} {...a11y('დახურვა', 'თარიღის არჩევის გაუქმება', 'button')}>
          <Pressable style={styles.dateSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>
                {picker === 'issued' ? 'გაცემის თარიღი' : 'ვადის გასვლა'}
              </Text>
              <Pressable onPress={() => setPicker(null)} hitSlop={12} {...a11y('მზადაა', 'თარიღის არჩევის დადასტურება', 'button')}>
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
    </Modal>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: '92%',
  },
  dateSheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center', marginTop: 10, marginBottom: 6,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 8,
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.ink },
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
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.subtleSurface, borderRadius: 16 },
  chipText: { fontSize: 12, fontWeight: '500', color: theme.colors.inkSoft },
});
}
