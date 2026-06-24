/**
 * Participants editor for the briefing (ინსტრუქტაჟი) wizard, step 2. A
 * name-and-add row plus a monochrome list of added participants. Owns its own
 * text-input state; the parent only holds the participant array.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { CircleX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import type { BriefingParticipant } from '../../types/models';

export interface ParticipantsStepProps {
  participants: BriefingParticipant[];
  onAdd: (name: string) => void;
  onRemove: (index: number) => void;
}

export function ParticipantsStep({ participants, onAdd, onRemove }: ParticipantsStepProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [nameInput, setNameInput] = useState('');
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => nameInputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const add = () => {
    const name = nameInput.trim();
    if (!name) return;
    onAdd(name);
    setNameInput('');
    nameInputRef.current?.focus();
  };

  return (
    <>
      <View style={styles.addRow}>
        <View style={{ flex: 1 }}>
          <FloatingLabelInput
            ref={nameInputRef}
            label={t('briefings.participantNameLabel')}
            value={nameInput}
            onChangeText={setNameInput}
            returnKeyType="done"
            onSubmitEditing={add}
            style={{ marginBottom: 0 }}
          />
        </View>
        <Pressable
          onPress={add}
          disabled={!nameInput.trim()}
          style={[styles.addBtn, !nameInput.trim() && { opacity: 0.4 }]}
          {...a11y(t('common.add'), t('a11y.addMemberHint'), 'button')}
        >
          <Text style={styles.addBtnText}>{t('common.add')}</Text>
        </Pressable>
      </View>

      {participants.length > 0 && (
        <View style={styles.list}>
          {participants.map((p, idx) => (
            <View key={idx} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {p.name}
              </Text>
              <Pressable
                onPress={() => onRemove(idx)}
                hitSlop={12}
                {...a11y(t('common.delete'), `${p.name} ${t('common.delete')}`, 'button')}
              >
                <CircleX size={18} color={theme.colors.inkFaint} strokeWidth={1.5} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    addRow: {
      flexDirection: 'row',
      gap: 8,
    },
    addBtn: {
      backgroundColor: theme.colors.inverse.background,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      justifyContent: 'center',
    },
    addBtnText: {
      color: theme.colors.inverse.ink,
      fontSize: 14,
      fontWeight: '700',
    },
    list: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.ink,
      maxWidth: 180,
    },
  });
}
