import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../components/DateTimeField';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { FlowHeader } from '../../components/FlowHeader';
import { useTheme } from '../../lib/theme';
import { useSession } from '../../lib/session';
import { briefingsApi } from '../../lib/briefingsApi';
import { projectsApi } from '../../lib/services';
import { a11y } from '../../lib/accessibility';
import type { BriefingParticipant, Project } from '../../types/models';

// ── Predefined topic keys ─────────────────────────────────────────────────────

const TOPIC_KEYS = [
  'scaffold_safety', 'height_work', 'ppe', 'evacuation', 'fire_safety', 'other',
] as const;

const TOPIC_ICONS: Record<typeof TOPIC_KEYS[number], keyof typeof Ionicons.glyphMap> = {
  scaffold_safety: 'construct-outline',
  height_work: 'arrow-up-circle-outline',
  ppe: 'shield-outline',
  evacuation: 'exit-outline',
  fire_safety: 'flame-outline',
  other: 'pencil-outline',
};

export default function NewBriefingScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const session = useSession();

  // ── Project (for header context) ──
  const [project, setProject] = useState<Project | null>(null);
  useEffect(() => {
    if (!projectId) return;
    projectsApi.getById(projectId).then(setProject).catch(() => null);
  }, [projectId]);

  // ── Date/time state ──
  const [dateTime, setDateTime] = useState(() => new Date());

  // ── Topics ──
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [customTopic, setCustomTopic] = useState('');

  // ── Participants ──
  const [participants, setParticipants] = useState<BriefingParticipant[]>([]);
  const [nameInput, setNameInput] = useState('');
  const nameInputRef = useRef<TextInput>(null);

  const [busy, setBusy] = useState(false);

  // ── Inspector name from session ──
  const inspectorName = useMemo(() => {
    if (session.state.status !== 'signedIn') return '';
    const u = session.state.user;
    if (u) return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
    return session.state.session.user.email ?? '';
  }, [session.state]);

  const toggleTopic = (key: string) => {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addParticipant = () => {
    const name = nameInput.trim();
    if (!name) return;
    setParticipants(prev => [...prev, { name, signature: null }]);
    setNameInput('');
    nameInputRef.current?.focus();
  };

  const removeParticipant = (idx: number) => {
    setParticipants(prev => prev.filter((_, i) => i !== idx));
  };

  const builtTopics = useMemo(() => {
    const result: string[] = [];
    for (const key of selectedTopics) {
      if (key === 'other') {
        const ct = customTopic.trim();
        if (ct) result.push(`custom:${ct}`);
      } else {
        result.push(key);
      }
    }
    return result;
  }, [selectedTopics, customTopic]);

  const canStart = participants.length >= 1 && builtTopics.length > 0;

  const onStart = useCallback(async () => {
    if (!projectId || !canStart) return;
    setBusy(true);
    try {
      const briefing = await briefingsApi.create({
        projectId,
        dateTime: dateTime.toISOString(),
        topics: builtTopics,
        participants,
        inspectorName,
      });
      router.replace(`/briefings/${briefing.id}/sign` as any);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('შეცდომა', `ინსტრუქტაჟის შექმნა ვერ მოხერხდა\n\n${msg}`);
    } finally {
      setBusy(false);
    }
  }, [projectId, dateTime, participants, builtTopics, inspectorName, canStart]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlowHeader
        flowTitle="ინსტრუქტაჟი"
        project={project}
        step={1}
        totalSteps={2}
        onBack={() => router.back()}
        confirmExit={
          participants.length > 0 ||
          selectedTopics.size > 0 ||
          customTopic.trim().length > 0
        }
      />

      <KeyboardSafeArea
        headerOffset={44}
        contentStyle={{ padding: 16, gap: 20 }}
        footer={
          <View style={styles.footer}>
            {!canStart && (
              <Text style={styles.footerHint}>
                {participants.length === 0
                  ? 'დაამატეთ მინიმუმ 1 მონაწილე'
                  : 'აირჩიეთ მინიმუმ 1 თემა'}
              </Text>
            )}
            <Button
              title="დაწყება →"
              size="lg"
              onPress={onStart}
              disabled={!canStart}
              loading={busy}
              style={{ width: '100%' }}
            />
          </View>
        }
      >
        {/* ── Date & Time ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>თარიღი და დრო</Text>
          <DateTimeField
            value={dateTime}
            onChange={d => { Keyboard.dismiss(); setDateTime(d); }}
            mode="datetime"
          />
        </View>

        {/* ── Topics ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ინსტრუქტაჟის თემა</Text>
          <Text style={styles.sectionHint}>შეარჩიეთ ერთი ან მეტი</Text>
          <View style={styles.topicList}>
            {TOPIC_KEYS.map(key => {
              const label = t(`briefings.topics.${key}`);
              const selected = selectedTopics.has(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleTopic(key)}
                  style={[styles.topicRow, selected && styles.topicRowSelected]}
                  {...a11y(label, selected ? 'მონიშნულია' : 'არ არის მონიშნული', 'checkbox')}
                >
                  <View style={[styles.topicIconBox, selected && styles.topicIconBoxSelected]}>
                    <Ionicons
                      name={TOPIC_ICONS[key]}
                      size={16}
                      color={selected ? theme.colors.accent : theme.colors.inkSoft}
                    />
                  </View>
                  <Text style={[styles.topicRowLabel, selected && styles.topicRowLabelSelected]}>
                    {label}
                  </Text>
                  <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={selected ? theme.colors.accent : theme.colors.borderStrong}
                  />
                </Pressable>
              );
            })}
          </View>

          {selectedTopics.has('other') && (
            <FloatingLabelInput
              label="თემის დასახელება"
              value={customTopic}
              onChangeText={setCustomTopic}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          )}
        </View>

        {/* ── Participants ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>მონაწილეები</Text>
            {participants.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{participants.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionHint}>მინიმუმ 1 მონაწილე საჭიროა</Text>

          {/* Input row */}
          <View style={styles.addRow}>
            <View style={{ flex: 1 }}>
              <FloatingLabelInput
                ref={nameInputRef}
                label="სახელი გვარი"
                value={nameInput}
                onChangeText={setNameInput}
                returnKeyType="done"
                onSubmitEditing={addParticipant}
                style={{ marginBottom: 0 }}
              />
            </View>
            <Pressable
              onPress={addParticipant}
              disabled={!nameInput.trim()}
              style={[styles.addBtn, !nameInput.trim() && { opacity: 0.4 }]}
              {...a11y('დამატება', 'მონაწილის დამატება', 'button')}
            >
              <Text style={styles.addBtnText}>დამატება</Text>
            </Pressable>
          </View>

          {/* Participant chips */}
          {participants.length > 0 && (
            <View style={styles.participantList}>
              {participants.map((p, idx) => (
                <View key={idx} style={styles.participantChip}>
                  <Text style={styles.participantChipText} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Pressable
                    onPress={() => removeParticipant(idx)}
                    hitSlop={8}
                    {...a11y('წაშლა', `${p.name} წაშლა`, 'button')}
                  >
                    <Ionicons name="close-circle" size={18} color={theme.colors.inkFaint} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </KeyboardSafeArea>

    </View>
  );
}

function getstyles(theme: any) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: theme.colors.ink,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
      gap: 10,
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    sectionHint: {
      fontSize: 12,
      color: theme.colors.inkFaint,
      marginTop: -6,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    countBadge: {
      backgroundColor: theme.colors.semantic.successSoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary[700],
    },
    topicList: {
      gap: 8,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    topicRowSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    topicIconBox: {
      width: 34,
      height: 34,
      borderRadius: 9,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topicIconBoxSelected: {
      backgroundColor: theme.colors.semantic.successSoft,
    },
    topicRowLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.inkSoft,
    },
    topicRowLabelSelected: {
      fontWeight: '600',
      color: theme.colors.ink,
    },
    customTopicInput: {
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.colors.ink,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    addRow: {
      flexDirection: 'row',
      gap: 8,
    },
    nameInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.colors.ink,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    addBtn: {
      backgroundColor: theme.colors.accent,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      justifyContent: 'center',
    },
    addBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    participantList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    participantChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.accentSoft,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    participantChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.accent,
      maxWidth: 180,
    },
    footer: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: 8,
    },
    footerHint: {
      fontSize: 12,
      color: theme.colors.inkFaint,
      textAlign: 'center',
    },
  });
}
