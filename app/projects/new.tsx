import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Button, ErrorText, Field, Input, Screen } from '../../components/ui';
import { projectsApi } from '../../lib/services';
import { theme } from '../../lib/theme';

export default function NewProjectScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await projectsApi.create({
        name,
        companyName: company || null,
        address: address || null,
      });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'შეცდომა');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'ახალი პროექტი',
          headerStyle: { backgroundColor: theme.colors.background },
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            <Field label="სახელი">
              <Input value={name} onChangeText={setName} placeholder="მაგ. ვაკე-საბურთალოს ობიექტი" />
            </Field>
            <Field label="კომპანია">
              <Input value={company} onChangeText={setCompany} placeholder="შემკვეთი" />
            </Field>
            <Field label="მისამართი">
              <Input value={address} onChangeText={setAddress} placeholder="ობიექტის მისამართი" />
            </Field>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <Button title="შენახვა" onPress={save} loading={busy} disabled={!name.trim()} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}
