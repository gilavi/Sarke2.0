import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Button, Field, Input } from './ui';
import { BottomSheetScrollView, useBottomSheet } from './BottomSheet';
import { theme } from '../lib/theme';
import { haptic } from '../lib/haptics';
import type { CrewMember } from '../types/models';

// Suggested role chips offered in the add sheet. The user can still type
// anything; these are shortcuts for the two common cases.
const ROLE_PRESETS = ['ზედამხედველი', 'ხარაჩოს ამწყობი'];

export interface InspectorRow {
  /** Display name — usually `${first_name} ${last_name}` from auth. */
  name: string;
  /** Role label for the inspector row (e.g. "ინსპექტორი"). */
  role: string;
}

/**
 * Project crew widget — displays the inspector (read-only, derived from
 * auth) on top, then the manual crew array, then a "+ დამატება" button.
 *
 * Owns no state; the parent passes `crew` and an `onChange` callback that
 * receives the next array. This keeps it reusable between the project
 * screen and the inspection signing flow — both write back to the same
 * `projects.crew` field via the parent.
 */
export function CrewList({
  inspector,
  crew,
  onChange,
}: {
  inspector: InspectorRow | null;
  crew: CrewMember[];
  onChange: (next: CrewMember[]) => void | Promise<void>;
}) {
  const showSheet = useBottomSheet();

  const removeMember = (id: string) => {
    haptic.medium();
    void onChange(crew.filter(m => m.id !== id));
  };

  const openAddSheet = () => {
    haptic.light();
    const handle = showSheet({
      content: ({ dismiss }) => (
        <CrewMemberForm
          onSave={member => {
            void onChange([...crew, member]);
            dismiss();
          }}
          onCancel={dismiss}
        />
      ),
    });
    return handle;
  };

  return (
    <View style={{ gap: 8 }}>
      {inspector ? (
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.accentSoft }]}>
            <Ionicons name="shield-checkmark" size={18} color={theme.colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{inspector.name}</Text>
            <Text style={styles.role}>{inspector.role}</Text>
          </View>
          <View style={styles.lockedChip}>
            <Ionicons name="lock-closed" size={10} color={theme.colors.inkSoft} />
          </View>
        </View>
      ) : null}

      {crew.map(m => (
        <Swipeable
          key={m.id}
          renderRightActions={() => (
            <Pressable onPress={() => removeMember(m.id)} style={styles.swipeDelete}>
              <Ionicons name="trash" size={18} color={theme.colors.white} />
            </Pressable>
          )}
          overshootRight={false}
        >
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.subtleSurface }]}>
              <Ionicons name="person" size={18} color={theme.colors.inkSoft} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{m.name}</Text>
              <Text style={styles.role}>{m.role}</Text>
            </View>
            <Pressable
              hitSlop={10}
              onPress={() => removeMember(m.id)}
              accessibilityLabel="წაშლა"
            >
              <Ionicons name="close" size={18} color={theme.colors.inkFaint} />
            </Pressable>
          </View>
        </Swipeable>
      ))}

      <Pressable onPress={openAddSheet} style={styles.addBtn}>
        <Ionicons name="person-add" size={18} color={theme.colors.accent} />
        <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>+ დამატება</Text>
      </Pressable>
    </View>
  );
}

/**
 * Form rendered inside the shared BottomSheet for adding a crew member.
 * Imported by callers who want to render this content via `useBottomSheet().show({ content: … })`.
 */
export function CrewMemberForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CrewMember;
  onSave: (member: CrewMember) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');

  // Reset on mount only; sheet is unmounted between opens.
  useEffect(() => {
    setName(initial?.name ?? '');
    setRole(initial?.role ?? '');
  }, [initial]);

  const canSave = useMemo(() => name.trim().length > 0 && role.trim().length > 0, [name, role]);

  const save = () => {
    if (!canSave) return;
    haptic.medium();
    onSave({
      id: initial?.id ?? cryptoUuid(),
      name: name.trim(),
      role: role.trim(),
      signature: initial?.signature ?? null,
    });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={sheetStyles.header}>
        <Text style={sheetStyles.title}>მონაწილის დამატება</Text>
        <Pressable onPress={onCancel} hitSlop={10}>
          <Ionicons name="close" size={22} color={theme.colors.inkSoft} />
        </Pressable>
      </View>
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 14, paddingTop: 8, paddingBottom: 8 }}
      >
        <Field label="სახელი">
          <Input
            value={name}
            onChangeText={setName}
            placeholder="მაგ. გიორგი მელაძე"
            autoFocus
          />
        </Field>
        <Field label="როლი">
          <View style={sheetStyles.chipRow}>
            {ROLE_PRESETS.map(preset => {
              const active = role.trim() === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => {
                    haptic.light();
                    setRole(preset);
                  }}
                  style={[sheetStyles.chip, active && sheetStyles.chipActive]}
                >
                  <Text style={[sheetStyles.chipText, active && sheetStyles.chipTextActive]}>
                    {preset}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
      </BottomSheetScrollView>
      <Button title="შენახვა" onPress={save} disabled={!canSave} style={{ marginTop: 14 }} />
    </KeyboardAvoidingView>
  );
}

// Avoid pulling in a uuid dependency just for crew row keys — RN's global
// `crypto.randomUUID` is available on iOS 17+ / Android via the polyfill in
// lib/polyfills. Falls back to a Math.random id on older runtimes.
function cryptoUuid(): string {
  const g = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (g?.randomUUID) return g.randomUUID();
  return `crew_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: theme.colors.subtleSurface,
    borderRadius: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 14, fontWeight: '600', color: theme.colors.ink },
  role: { fontSize: 11, color: theme.colors.inkSoft, marginTop: 2 },
  lockedChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  swipeDelete: {
    width: 64,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    marginLeft: 6,
  },
});

const sheetStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.subtleSurface,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
  },
  chipActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  chipText: { color: theme.colors.inkSoft, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: theme.colors.accent, fontWeight: '700' },
});
