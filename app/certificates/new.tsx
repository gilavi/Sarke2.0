import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Field, Input, Screen } from '../../components/ui';
import { certificatesApi, storageApi } from '../../lib/services';
import { STORAGE_BUCKETS, supabase } from '../../lib/supabase';
import { theme } from '../../lib/theme';

function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const dateChip = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFEAE0',
    borderRadius: 999,
  },
  text: { fontSize: 12, fontWeight: '600', color: '#4A4A4A' },
});

const TYPES: { value: string; label: string }[] = [
  { value: 'xaracho_inspector', label: 'ხარაჩოს ინსპექტორი' },
  { value: 'harness_inspector', label: 'ქამრების ინსპექტორი' },
  { value: 'general', label: 'სხვა' },
];

export default function AddCertificate() {
  const router = useRouter();
  const [type, setType] = useState('xaracho_inspector');
  const [number, setNumber] = useState('');
  const [issued, setIssued] = useState(new Date().toISOString().slice(0, 10));
  const [expires, setExpires] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!res.canceled && res.assets.length) setPhotoUri(res.assets[0].uri);
  };

  const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());

  const save = async () => {
    if (!isValidDate(issued) || !isValidDate(expires)) {
      Alert.alert('თარიღი არასწორია', 'გამოიყენე ფორმატი YYYY-MM-DD.');
      return;
    }
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
      await certificatesApi.upsert({
        id: crypto.randomUUID(),
        user_id: user.id,
        type,
        number: number || null,
        issued_at: issued,
        expires_at: expires,
        file_url: filePath,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('შეცდომა', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'ახალი სერტიფიკატი' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <Field label="ტიპი">
            <View style={{ gap: 8 }}>
              {TYPES.map(t => (
                <Button
                  key={t.value}
                  title={t.label}
                  variant={type === t.value ? 'primary' : 'secondary'}
                  onPress={() => setType(t.value)}
                />
              ))}
            </View>
          </Field>
          <Field label="ნომერი">
            <Input value={number} onChangeText={setNumber} />
          </Field>
          <Field label="გაცემის თარიღი">
            <Input value={issued} onChangeText={setIssued} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
            <View style={dateChip.row}>
              <Pressable style={dateChip.chip} onPress={() => setIssued(addMonths(0))}>
                <Text style={dateChip.text}>დღეს</Text>
              </Pressable>
              <Pressable style={dateChip.chip} onPress={() => setIssued(addMonths(-12))}>
                <Text style={dateChip.text}>-1 წელი</Text>
              </Pressable>
            </View>
          </Field>
          <Field label="ვადა">
            <Input value={expires} onChangeText={setExpires} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
            <View style={dateChip.row}>
              <Pressable style={dateChip.chip} onPress={() => setExpires(addMonths(12))}>
                <Text style={dateChip.text}>+1 წელი</Text>
              </Pressable>
              <Pressable style={dateChip.chip} onPress={() => setExpires(addMonths(36))}>
                <Text style={dateChip.text}>+3 წელი</Text>
              </Pressable>
              <Pressable style={dateChip.chip} onPress={() => setExpires(addMonths(60))}>
                <Text style={dateChip.text}>+5 წელი</Text>
              </Pressable>
            </View>
          </Field>
          <Button title={photoUri ? 'შეცვალე ფოტო' : 'ფოტოს არჩევა'} variant="secondary" onPress={pickPhoto} />
          {photoUri ? <Text style={{ color: theme.colors.accent }}>ფოტო არჩეულია ✓</Text> : null}
          <Button title="შენახვა" onPress={save} loading={busy} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
