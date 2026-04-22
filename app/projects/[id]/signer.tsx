import { useCallback, useRef, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import { Button, Field, Input, Screen } from '../../../components/ui';
import { projectsApi, storageApi } from '../../../lib/services';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import { useToast } from '../../../lib/toast';
import { getStorageImageDataUrl } from '../../../lib/imageUrl';
import { theme } from '../../../lib/theme';
import type { ProjectSigner, SignerRole } from '../../../types/models';
import { SIGNER_ROLE_LABEL } from '../../../types/models';

// Roster roles only — "expert" is always the logged-in user per inspection, not rostered.
const ROSTER_ROLES: SignerRole[] = ['xaracho_supervisor', 'xaracho_assembler'];

export default function SignerForm() {
  const { id, signerId } = useLocalSearchParams<{ id: string; signerId?: string }>();
  const router = useRouter();
  const toast = useToast();

  const editing = !!signerId;
  const [existing, setExisting] = useState<ProjectSigner | null>(null);
  const [role, setRole] = useState<SignerRole>('xaracho_supervisor');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [sigPreview, setSigPreview] = useState<string | null>(null); // data url for preview
  const [sigDirty, setSigDirty] = useState(false); // new capture since load
  const [pendingSigData, setPendingSigData] = useState<string | null>(null); // base64 png to upload
  const [capturing, setCapturing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id || !signerId) return;
    try {
      const signers = await projectsApi.signers(id);
      const s = signers.find(x => x.id === signerId);
      if (!s) return;
      setExisting(s);
      setRole(s.role);
      setFullName(s.full_name);
      setPhone(s.phone ?? '');
      setPosition(s.position ?? '');
      if (s.signature_png_url) {
        setSigPreview(
          await getStorageImageDataUrl(STORAGE_BUCKETS.signatures, s.signature_png_url),
        );
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'ჩატვირთვა ვერ მოხერხდა');
    }
  }, [id, signerId, toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onCaptured = (base64: string) => {
    const cleaned = base64.replace(/^data:image\/png;base64,/, '');
    const dataUrl = `data:image/png;base64,${cleaned}`;
    setPendingSigData(cleaned);
    setSigPreview(dataUrl);
    setSigDirty(true);
    setCapturing(false);
  };

  const save = async () => {
    if (!id || !fullName.trim()) return;
    setBusy(true);
    try {
      let sigPath = existing?.signature_png_url ?? null;

      if (sigDirty && pendingSigData) {
        // Upload new signature
        const res = await fetch(`data:image/png;base64,${pendingSigData}`);
        const blob = await res.blob();
        const path = `project/${id}/signer-${existing?.id ?? Date.now()}-${Date.now()}.png`;
        await storageApi.upload(STORAGE_BUCKETS.signatures, path, blob, 'image/png');
        sigPath = path;
      }

      await projectsApi.upsertSigner({
        ...(existing?.id ? { id: existing.id } : {}),
        project_id: id,
        role,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        position: position.trim() || null,
        signature_png_url: sigPath,
      });
      toast.success(editing ? 'განახლდა' : 'დაემატა');
      router.back();
    } catch (e: any) {
      toast.error(e?.message ?? 'შენახვა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert('წაშლა?', `${existing.full_name}`, [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა',
        style: 'destructive',
        onPress: async () => {
          try {
            await projectsApi.deleteSigner(existing.id);
            toast.success('წაიშალა');
            router.back();
          } catch (e: any) {
            toast.error(e?.message ?? 'ვერ წაიშალა');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: editing ? 'ხელმომწერის რედაქტირება' : 'ახალი ხელმომწერი',
          headerRight: () =>
            editing ? (
              <Pressable onPress={remove} hitSlop={10}>
                <Ionicons name="trash-outline" size={22} color={theme.colors.danger} />
              </Pressable>
            ) : null,
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }}>
          <Field label="როლი">
            <View style={{ gap: 8 }}>
              {ROSTER_ROLES.map(r => (
                <Pressable
                  key={r}
                  onPress={() => setRole(r)}
                  style={[styles.roleRow, role === r && styles.roleRowSelected]}
                >
                  <View style={[styles.radio, role === r && styles.radioOn]}>
                    {role === r ? (
                      <Ionicons name="checkmark" size={14} color={theme.colors.white} />
                    ) : null}
                  </View>
                  <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
                    {SIGNER_ROLE_LABEL[r]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label="სახელი გვარი">
            <Input value={fullName} onChangeText={setFullName} placeholder="გიორგი ხელაძე" />
          </Field>
          <Field label="ტელეფონი">
            <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+995 5XX XX XX XX" />
          </Field>
          <Field label="პოზიცია">
            <Input value={position} onChangeText={setPosition} placeholder="მაგ. ზედამხედველი" />
          </Field>

          <Field label="ხელმოწერა">
            <View style={styles.sigBox}>
              {sigPreview ? (
                <Image source={{ uri: sigPreview }} style={styles.sigImage} resizeMode="contain" />
              ) : (
                <View style={styles.sigEmpty}>
                  <Ionicons name="create-outline" size={22} color={theme.colors.inkFaint} />
                  <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>
                    ხელმოწერა შენახული არ არის
                  </Text>
                </View>
              )}
            </View>
            <Button
              title={sigPreview ? 'ხელახლა დახატვა' : 'ხელის მოწერა'}
              variant="secondary"
              onPress={() => setCapturing(true)}
              style={{ marginTop: 8 }}
            />
          </Field>

          <Button
            title={editing ? 'შენახვა' : 'დამატება'}
            onPress={save}
            loading={busy}
            disabled={!fullName.trim()}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </SafeAreaView>

      <SignatureCaptureModal
        visible={capturing}
        title={SIGNER_ROLE_LABEL[role]}
        onCancel={() => setCapturing(false)}
        onDone={onCaptured}
      />
    </Screen>
  );
}

function SignatureCaptureModal({
  visible,
  title,
  onCancel,
  onDone,
}: {
  visible: boolean;
  title: string;
  onCancel: () => void;
  onDone: (base64Png: string) => void;
}) {
  const ref = useRef<SignatureViewRef>(null);

  const handleSave = () => ref.current?.readSignature();
  const handleClear = () => ref.current?.clearSignature();

  const webStyle = `
    .m-signature-pad { box-shadow: none; border: none; background: #fff; margin: 0; }
    .m-signature-pad--body { border: 1px solid #E8E1D4; }
    .m-signature-pad--footer { display: none; }
    body, html { background: #fff; margin: 0; }
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.ink, flex: 1 }}>
              {title}
            </Text>
            <Pressable onPress={onCancel} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
            </Pressable>
          </View>
          <View style={styles.canvasBox}>
            <SignatureScreen
              ref={ref}
              onOK={onDone}
              webStyle={webStyle}
              descriptionText=""
              autoClear={false}
              imageType="image/png"
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="გასუფთავება"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={handleClear}
            />
            <Button title="შენახვა" style={{ flex: 1.4 }} onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.hairline,
  },
  roleRowSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  radioOn: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  sigBox: {
    height: 120,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigImage: { width: '100%', height: '100%' },
  sigEmpty: { alignItems: 'center', gap: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingTop: 10,
    gap: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.hairline,
    alignSelf: 'center',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center' },
  canvasBox: {
    height: 320,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
});
