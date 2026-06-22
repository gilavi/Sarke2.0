// Bottom-sheet form for adding a qualification. Replaces the previous
// /qualifications/new route - opens in-place from the qualifications list.
import { useEffect, useState , useMemo} from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { SheetLayout } from '../SheetLayout';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Check, ChevronRight } from 'lucide-react-native';
import { Button, Field } from '../ui';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { qualificationsApi, storageApi } from '../../lib/services';
import { STORAGE_BUCKETS, supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import { usePhotoPicker } from '../../hooks/usePhotoPicker';

import { toErrorMessage } from '../../lib/logError';
import { a11y } from '../../lib/accessibility';
import { REQUIRED_TYPES } from '../../lib/qualificationTypes';
import type { Qualification } from '../../types/models';

function formatDate(d: Date) {
  return d.toLocaleDateString('ka', { day: 'numeric', month: 'long', year: 'numeric' });
}
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AddQualificationSheet({
  visible,
  initialType,
  existing,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initialType?: string;
  /** When set, the sheet edits this qualification in place (reuses its id). */
  existing?: Qualification | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { pickPhoto: pickPhotoFromLibrary } = usePhotoPicker();

  const TYPES: { value: string; label: string }[] = [
    ...REQUIRED_TYPES,
    { value: 'general', label: t('qualifications.other') },
  ];

  const [type, setType] = useState(initialType ?? 'xaracho_specialist');
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

  // Reset form whenever the sheet (re-)opens. When `existing` is passed we
  // prefill from it and edit in place; otherwise it's a fresh add.
  useEffect(() => {
    if (!visible) return;
    if (existing) {
      setType(existing.type);
      setNumber(existing.number ?? '');
      setIssued(existing.issued_at ? new Date(existing.issued_at) : new Date());
      if (existing.expires_at) {
        setExpires(new Date(existing.expires_at));
      } else {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        setExpires(d);
      }
    } else {
      setType(initialType && TYPES.some(t => t.value === initialType) ? initialType : 'xaracho_specialist');
      setNumber('');
      setIssued(new Date());
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setExpires(d);
    }
    setPhotoUri(null);
    setPicker(null);
  }, [visible, initialType, existing]);

  const pickPhoto = async () => {
    // Must use pickPhoto (ImagePicker directly) - this component is a Modal and
    // router.push navigates behind it, freezing the picker callback forever.
    const result = await pickPhotoFromLibrary();
    if (!result) return;
    setPhotoUri(result.uri);
  };

  const save = async () => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('common.error'));
      // Keep the existing photo when editing without picking a new one.
      let filePath: string | null = existing?.file_url ?? null;
      if (photoUri) {
        const path = `${user.id}/${Date.now()}.jpg`;
        await storageApi.uploadFromUri(STORAGE_BUCKETS.certificates, path, photoUri, 'image/jpeg', 'qualification');
        filePath = path;
      }
      await qualificationsApi.upsert({
        id: existing?.id ?? crypto.randomUUID(),
        user_id: user.id,
        type,
        number: number || null,
        issued_at: toISO(issued),
        expires_at: toISO(expires),
        file_url: filePath,
      });
      onSaved();
    } catch (e) {
      Alert.alert(t('common.error'), toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} {...a11y(t('common.close'), t('a11y.closeSheetHint'), 'button')}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <SheetLayout
            header={{ title: existing ? t('qualifications.editTitle') : t('qualifications.newCertTitle'), onClose }}
            footer={
              <View style={{ gap: 10 }}>
                <Button
                  title={
                    photoUri
                      ? t('qualifications.photoSelected')
                      : existing?.file_url
                        ? t('qualifications.changePhotoLabel')
                        : t('qualifications.addCertPhoto')
                  }
                  variant="secondary"
                  onPress={pickPhoto}
                />
                <Button title={t('common.save')} onPress={save} loading={busy} />
              </View>
            }
          >
            <Field label={t('qualifications.typeLabel')}>
              <View style={{ gap: 8 }}>
                {TYPES.map(typeOption => (
                  <Pressable
                    key={typeOption.value}
                    onPress={() => setType(typeOption.value)}
                    style={[styles.typeRow, type === typeOption.value && styles.typeRowActive]}
                    {...a11y(typeOption.label, t('qualifications.selectTypeHint'), 'radio')}
                  >
                    <View style={[styles.radio, type === typeOption.value && styles.radioActive]}>
                      {type === typeOption.value && <Check size={13} color={theme.colors.white} strokeWidth={2} />}
                    </View>
                    <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{typeOption.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            <FloatingLabelInput
              label={t('qualifications.numberLabel')}
              value={number}
              onChangeText={setNumber}
            />

            <Field label={t('qualifications.issuedDate')}>
              <Pressable onPress={() => setPicker('issued')} style={styles.dateBtn} {...a11y(t('qualifications.issuedDate'), t('qualifications.issuedDate'), 'button')}>
                <Calendar size={18} color={theme.colors.accent} strokeWidth={1.5} />
                <Text style={styles.dateBtnText}>{formatDate(issued)}</Text>
                <ChevronRight size={16} color={theme.colors.inkFaint} strokeWidth={1.5} />
              </Pressable>
            </Field>

            <Field label={t('qualifications.expiryDate')}>
              <Pressable onPress={() => setPicker('expires')} style={styles.dateBtn} {...a11y(t('qualifications.expiryDate'), t('qualifications.expiryDate'), 'button')}>
                <Calendar size={18} color={theme.colors.accent} strokeWidth={1.5} />
                <Text style={styles.dateBtnText}>{formatDate(expires)}</Text>
                <ChevronRight size={16} color={theme.colors.inkFaint} strokeWidth={1.5} />
              </Pressable>
              <View style={styles.chips}>
                {[
                  { label: t('qualifications.yearPlus1'), months: 12 },
                  { label: t('qualifications.yearPlus3'), months: 36 },
                  { label: t('qualifications.yearPlus5'), months: 60 },
                ].map(c => (
                  <Pressable key={c.label} style={styles.chip} {...a11y(c.label, t('qualifications.expiryQuickHint'), 'button')} onPress={() => {
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
        <Pressable style={styles.backdrop} onPress={() => setPicker(null)} {...a11y(t('common.close'), t('a11y.closeSheetHint'), 'button')}>
          <Pressable style={styles.dateSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>
                {picker === 'issued' ? t('qualifications.issuedDate') : t('qualifications.expiryDateShort')}
              </Text>
              <Pressable onPress={() => setPicker(null)} hitSlop={12} {...a11y(t('qualifications.readyBtn'), t('qualifications.readyBtn'), 'button')}>
                <Text style={{ color: theme.colors.accent, fontWeight: '700', fontSize: 15 }}>{t('qualifications.readyBtn')}</Text>
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
