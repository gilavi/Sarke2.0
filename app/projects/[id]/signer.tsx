import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Input, Screen } from '../../../components/ui';
import { projectsApi } from '../../../lib/services';
import { theme } from '../../../lib/theme';
import type { SignerRole } from '../../../types/models';

export default function AddSigner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [role, setRole] = useState<SignerRole>('xaracho_supervisor');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await projectsApi.upsertSigner({
        project_id: id,
        role,
        full_name: fullName,
        phone: phone || null,
        position: position || null,
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
      <Stack.Screen options={{ headerShown: true, title: 'ხელმომწერი' }} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <Field label="როლი">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['xaracho_supervisor', 'xaracho_assembler'] as const).map(r => (
                <Button
                  key={r}
                  title={r === 'xaracho_supervisor' ? 'ზედამხედველი' : 'ამწყობი'}
                  variant={role === r ? 'primary' : 'secondary'}
                  style={{ flex: 1 }}
                  onPress={() => setRole(r)}
                />
              ))}
            </View>
          </Field>
          <Field label="სახელი გვარი">
            <Input value={fullName} onChangeText={setFullName} />
          </Field>
          <Field label="ტელეფონი">
            <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </Field>
          <Field label="პოზიცია">
            <Input value={position} onChangeText={setPosition} />
          </Field>
          <Button title="შენახვა" onPress={save} loading={busy} disabled={!fullName} />
          <Text style={{ fontSize: 11, color: theme.colors.inkSoft, textAlign: 'center' }}>
            ხელმოწერის ფუნქცია ემატება მალე.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
