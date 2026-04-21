import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Field, Input, Screen } from '../../components/ui';
import { certificatesApi, storageApi } from '../../lib/services';
import { STORAGE_BUCKETS, supabase } from '../../lib/supabase';
import { theme } from '../../lib/theme';

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
      <Stack.Screen options={{ headerShown: true, title: 'სერტიფიკატი' }} />
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
          <Field label="გაცემის თარიღი (YYYY-MM-DD)">
            <Input value={issued} onChangeText={setIssued} />
          </Field>
          <Field label="ვადა (YYYY-MM-DD)">
            <Input value={expires} onChangeText={setExpires} />
          </Field>
          <Button title={photoUri ? 'შეცვალე ფოტო' : 'ფოტოს არჩევა'} variant="secondary" onPress={pickPhoto} />
          {photoUri ? <Text style={{ color: theme.colors.accent }}>ფოტო არჩეულია ✓</Text> : null}
          <Button title="შენახვა" onPress={save} loading={busy} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
