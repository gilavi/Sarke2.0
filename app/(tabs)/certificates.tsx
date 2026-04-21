import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui';
import {
  certificatesApi,
  isExpiringSoon,
  questionnairesApi,
  templatesApi,
} from '../../lib/services';
import { theme } from '../../lib/theme';
import type { Certificate, Questionnaire, Template } from '../../types/models';

export default function CertificatesScreen() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [linkedOpen, setLinkedOpen] = useState<Certificate | null>(null);

  const load = useCallback(async () => {
    const [c, q, t] = await Promise.all([
      certificatesApi.list().catch(() => []),
      questionnairesApi.recent(500).catch(() => []),
      templatesApi.list().catch(() => []),
    ]);
    setCerts(c);
    setQuestionnaires(q);
    setTemplates(t);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = (c: Certificate) => {
    Alert.alert('წაშლა?', c.number ?? c.type, [
      { text: 'გაუქმება', style: 'cancel' },
      {
        text: 'წაშლა',
        style: 'destructive',
        onPress: async () => {
          try {
            await certificatesApi.remove(c.id);
            void load();
          } catch (e: any) {
            Alert.alert('წაშლა ვერ მოხერხდა', e?.message ?? 'ქსელის შეცდომა');
          }
        },
      },
    ]);
  };

  const statusOf = (c: Certificate): 'expired' | 'expiring' | 'ok' => {
    if (!c.expires_at) return 'ok';
    const exp = new Date(c.expires_at).getTime();
    if (exp < Date.now()) return 'expired';
    if (isExpiringSoon(c)) return 'expiring';
    return 'ok';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>სერტიფიკატები</Text>
        <Pressable onPress={() => router.push('/certificates/new')} hitSlop={10}>
          <Ionicons name="add-circle" size={30} color={theme.colors.accent} />
        </Pressable>
      </View>
      <FlatList
        data={certs}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
            <Ionicons name="ribbon" size={46} color={theme.colors.accent} style={{ opacity: 0.6 }} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink }}>
              ცარიელია
            </Text>
            <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
              დაამატე სერტიფიკატი, რომ PDF-ებს{'\n'}თან ერთოდეს.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = statusOf(item);
          return (
            <Pressable onPress={() => status !== 'ok' ? setLinkedOpen(item) : undefined}>
              <Card padding={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: theme.colors.ink }}>{item.type}</Text>
                    {item.number ? (
                      <Text style={{ color: theme.colors.inkSoft, fontSize: 13 }}>№ {item.number}</Text>
                    ) : null}
                    {item.expires_at ? (
                      <Text style={{ fontSize: 12, color: theme.colors.inkSoft, marginTop: 2 }}>
                        ვადა: {new Date(item.expires_at).toLocaleDateString('ka')}
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge status={status} />
                  <Pressable
                    onPress={() => remove(item)}
                    hitSlop={10}
                    accessibilityLabel="remove"
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />

      <LinkedInspectionsSheet
        cert={linkedOpen}
        questionnaires={questionnaires}
        templates={templates}
        onClose={() => setLinkedOpen(null)}
        onOpen={qid => {
          setLinkedOpen(null);
          router.push(`/questionnaire/${qid}` as any);
        }}
      />
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: 'expired' | 'expiring' | 'ok' }) {
  if (status === 'ok') return null;
  const label = status === 'expired' ? 'ვადა გასულია' : 'იწურება';
  const bg = status === 'expired' ? theme.colors.dangerSoft : theme.colors.warnSoft;
  const fg = status === 'expired' ? theme.colors.danger : theme.colors.warn;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: fg }}>{label}</Text>
    </View>
  );
}

function LinkedInspectionsSheet({
  cert,
  questionnaires,
  templates,
  onClose,
  onOpen,
}: {
  cert: Certificate | null;
  questionnaires: Questionnaire[];
  templates: Template[];
  onClose: () => void;
  onOpen: (qid: string) => void;
}) {
  const linked = useMemo(() => {
    if (!cert) return [];
    const matchingTemplates = new Set(
      templates.filter(t => t.required_cert_types.includes(cert.type)).map(t => t.id),
    );
    return questionnaires.filter(q => matchingTemplates.has(q.template_id));
  }, [cert, questionnaires, templates]);

  return (
    <Modal
      visible={cert !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink, marginBottom: 10 }}>
            დაკავშირებული ინსპექციები
          </Text>
          {cert ? (
            <Text style={{ color: theme.colors.inkSoft, fontSize: 13, marginBottom: 14 }}>
              {cert.type} · ვადა: {cert.expires_at ? new Date(cert.expires_at).toLocaleDateString('ka') : '—'}
            </Text>
          ) : null}
          <ScrollView style={{ maxHeight: 380 }}>
            {linked.length === 0 ? (
              <Text style={{ color: theme.colors.inkSoft, textAlign: 'center', paddingVertical: 20 }}>
                ამ სერტიფიკატს არცერთი ინსპექცია არ ეყრდნობა.
              </Text>
            ) : (
              linked.map(q => {
                const t = templates.find(x => x.id === q.template_id);
                return (
                  <Pressable key={q.id} onPress={() => onOpen(q.id)}>
                    <View style={styles.linkedRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', color: theme.colors.ink }}>
                          {t?.name ?? 'კითხვარი'}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.inkSoft }}>
                          {new Date(q.created_at).toLocaleString('ka')} · {q.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.inkFaint} />
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.ink },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    backgroundColor: theme.colors.hairline,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
});
