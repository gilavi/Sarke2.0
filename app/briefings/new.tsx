import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { DatePickerSheet } from '../../components/DatePickerSheet';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { useTheme } from '../../lib/theme';
import { useSession } from '../../lib/session';
import { briefingsApi } from '../../lib/briefingsApi';
import { a11y } from '../../lib/accessibility';
import type { BriefingParticipant } from '../../types/models';

// ── Predefined topic keys ─────────────────────────────────────────────────────

const TOPIC_KEYS = [
  'scaffold_safety', 'height_work', 'ppe', 'evacuation', 'fire_safety', 'other',
] as const;

const KA_MONTHS_SHORT = [
  'იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ',
  'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ',
];

function formatDateOnly(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = KA_MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatTimeOnly(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function NewBriefingScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useSession();

  // ── Date/time state ──
  const [dateTime, setDateTime] = useState(() => new Date());
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);

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

  const buildTopics = (): string[] => {
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
  };

  const canStart = participants.length >= 1 && selectedTopics.size > 0;

  const onStart = useCallback(async () => {
    if (!projectId || !canStart) return;
    setBusy(true);
    try {
      const topics = buildTopics();
      const briefing = await briefingsApi.create({
        projectId,
        dateTime: dateTime.toISOString(),
        topics,
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
  }, [projectId, dateTime, participants, selectedTopics, customTopic, inspectorName, canStart]);

  const onPickerChange = useCallback((selected: Date) => {
    const next = new Date(dateTime);
    if (pickerMode === 'date') {
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    setDateTime(next);
  }, [dateTime, pickerMode]);

  const onPickerClose = useCallback(() => {
    setPickerMode(null);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'ახალი ინსტრუქტაჟი',
          headerBackTitle: 'პროექტი',
          headerTitleStyle: { fontSize: 17, fontWeight: '700', color: theme.colors.ink },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.accent,
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Date & Time ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>თარიღი და დრო</Text>
          <Pressable
            onPress={() => { Keyboard.dismiss(); setPickerMode('date'); }}
            style={styles.dateRow}
            {...a11y('თარიღი', 'დააჭირეთ შესაცვლელად', 'button')}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.dateText}>{formatDateOnly(dateTime)}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.borderStrong} />
          </Pressable>
          <Pressable
            onPress={() => { Keyboard.dismiss(); setPickerMode('time'); }}
            style={styles.dateRow}
            {...a11y('დრო', 'დააჭირეთ შესაცვლელად', 'button')}
          >
            <Ionicons name="time-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.dateText}>{formatTimeOnly(dateTime)}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.borderStrong} />
          </Pressable>
        </View>

        {/* ── Topics ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ინსტრუქტაჟის თემა</Text>
          <Text style={styles.sectionHint}>შეარჩიეთ ერთი ან მეტი</Text>
          <View style={styles.chipGrid}>
            {TOPIC_KEYS.map(key => {
              const label = t(`briefings.topics.${key}`);
              const selected = selectedTopics.has(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleTopic(key)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  {...a11y(label, selected ? 'მონიშნულია' : 'არ არის მონიშნული', 'checkbox')}
                >
                  {selected && (
                    <Ionicons name="checkmark" size={13} color={theme.colors.accent} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedTopics.has('other') && (
            <TextInput
              value={customTopic}
              onChangeText={setCustomTopic}
              placeholder="თემის დასახელება..."
              placeholderTextColor={theme.colors.inkFaint}
              style={styles.customTopicInput}
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
            <TextInput
              ref={nameInputRef}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="სახელი გვარი"
              placeholderTextColor={theme.colors.inkFaint}
              style={styles.nameInput}
              returnKeyType="done"
              onSubmitEditing={addParticipant}
            />
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
      </ScrollView>

      {/* ── Start Button ── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
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

      <DatePickerSheet
        visible={pickerMode !== null}
        value={dateTime}
        mode={pickerMode ?? 'date'}
        onClose={onPickerClose}
        onChange={onPickerChange}
      />
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
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    dateText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    chipSelected: {
      borderColor: 'transparent',
      backgroundColor: theme.colors.accent,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.inkSoft,
    },
    chipTextSelected: {
      color: '#fff',
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
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.hairline,
      gap: 8,
    },
    footerHint: {
      fontSize: 12,
      color: theme.colors.inkFaint,
      textAlign: 'center',
    },
  });
}
