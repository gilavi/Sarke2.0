import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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

// ── Predefined topic options ──────────────────────────────────────────────────

interface TopicOption {
  key: string;
  label: string;
}

const TOPIC_OPTIONS: TopicOption[] = [
  { key: 'scaffold_safety', label: 'ხარაჩოს უსაფრთხოება' },
  { key: 'height_work', label: 'სიმაღლეზე მუშაობა' },
  { key: 'ppe', label: 'დამცავი აღჭურვილობა' },
  { key: 'evacuation', label: 'საევაკუაციო გეგმა' },
  { key: 'fire_safety', label: 'ხანძარსაწინააღმდეგო' },
  { key: 'other', label: 'სხვა' },
];

const KA_MONTHS_SHORT = [
  'იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ',
  'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ',
];

function formatPickedDateTime(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = KA_MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

export default function NewBriefingScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useSession();

  // ── Date/time state ──
  const [dateTime, setDateTime] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

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
    } catch {
      Alert.alert('შეცდომა', 'ინსტრუქტაჟის შექმნა ვერ მოხერხდა');
    } finally {
      setBusy(false);
    }
  }, [projectId, dateTime, participants, selectedTopics, customTopic, inspectorName, canStart]);

  const onDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      const next = new Date(dateTime);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setDateTime(next);
      if (Platform.OS === 'android') setShowTimePicker(true);
    }
  };

  const onTimeChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) {
      const next = new Date(dateTime);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setDateTime(next);
    }
  };

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
            onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}
            style={styles.dateRow}
            {...a11y('თარიღი და დრო', 'დააჭირეთ შესაცვლელად', 'button')}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.colors.accent} />
            <Text style={styles.dateText}>{formatPickedDateTime(dateTime)}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.borderStrong} />
          </Pressable>
        </View>

        {/* ── Topics ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ინსტრუქტაჟის თემა</Text>
          <Text style={styles.sectionHint}>შეარჩიეთ ერთი ან მეტი</Text>
          <View style={styles.chipGrid}>
            {TOPIC_OPTIONS.map(opt => {
              const selected = selectedTopics.has(opt.key);
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => toggleTopic(opt.key)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  {...a11y(opt.label, selected ? 'მონიშნულია' : 'არ არის მონიშნული', 'checkbox')}
                >
                  {selected && (
                    <Ionicons name="checkmark" size={13} color={theme.colors.accent} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
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

      {/* ── Date/Time pickers ── */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker || showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => { setShowDatePicker(false); setShowTimePicker(false); }}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
            onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}
          >
            <Pressable onPress={() => {}} style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12 }}>
                <Pressable onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}>
                  <Text style={{ color: theme.colors.accent, fontSize: 16, fontWeight: '600' }}>დასრულება</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={dateTime}
                mode={showTimePicker ? 'time' : 'date'}
                display="spinner"
                locale="ka-GE"
                onChange={showTimePicker ? onTimeChange : onDateChange}
                style={{ height: 200 }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={dateTime}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={dateTime}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
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
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    chipSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
    chipTextSelected: {
      color: theme.colors.accent,
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
      paddingVertical: 7,
      backgroundColor: theme.colors.accentGhost,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.accentSoft,
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
