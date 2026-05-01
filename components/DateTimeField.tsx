// Unified date / time / datetime field.
//
// Renders the trigger chip(s) AND owns the sheet, so every screen gets the same UX.
// Uses draft state — scrolling the wheel doesn't commit until Confirm. Cancel and
// backdrop-tap discard the draft.
//
// Modes:
//   'date'     → single date chip
//   'time'     → single time chip
//   'datetime' → two chips side by side; sheet has a date/time tab toggle
//
// Platforms: same modal on iOS and Android (no native Android dialog), spinner
// display so wheel UX is identical. iOS uses 'inline' for date pickers (calendar)
// because it reads better on iOS.

import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from './primitives/A11yText';
import { useTheme } from '../lib/theme';
import { a11y } from '../lib/accessibility';

export type DateTimeMode = 'date' | 'time' | 'datetime';

interface Props {
  value: Date;
  onChange: (next: Date) => void;
  mode?: DateTimeMode;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
  /** Disables the trigger. */
  disabled?: boolean;
}

const KA_MONTHS_SHORT = [
  'იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ',
  'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ',
];

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${KA_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function DateTimeField({
  value,
  onChange,
  mode = 'datetime',
  label,
  minDate,
  maxDate,
  disabled,
}: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const styles = makeStyles(theme);

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date');
  const [draft, setDraft] = useState<Date>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const openSheet = (tab: 'date' | 'time') => {
    if (disabled) return;
    setActiveTab(tab);
    setDraft(value);
    setOpen(true);
  };

  const confirm = () => {
    onChange(draft);
    setOpen(false);
  };

  const cancel = () => {
    setOpen(false);
  };

  const showDateChip = mode === 'date' || mode === 'datetime';
  const showTimeChip = mode === 'time' || mode === 'datetime';

  // Sheet's picker mode: in datetime, follows tab; otherwise the field's mode.
  const sheetPickerMode: 'date' | 'time' =
    mode === 'datetime' ? activeTab : (mode as 'date' | 'time');

  // iOS uses inline calendar for date, spinner wheel for time.
  // Android uses spinner for both — gives uniform feel inside our modal
  // and avoids the platform's default dialog popping a second sheet.
  const display: 'inline' | 'spinner' =
    Platform.OS === 'ios' && sheetPickerMode === 'date' ? 'inline' : 'spinner';

  const sheetTitle =
    mode === 'datetime'
      ? 'თარიღი და დრო'
      : sheetPickerMode === 'date'
      ? 'თარიღი'
      : 'დრო';

  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.row}>
        {showDateChip && (
          <Pressable
            onPress={() => openSheet('date')}
            disabled={disabled}
            style={({ pressed }) => [
              styles.chip,
              { flex: mode === 'datetime' ? 1.5 : 1 },
              pressed && styles.chipPressed,
              disabled && styles.chipDisabled,
            ]}
            {...a11y(formatDate(value), 'თარიღის არჩევა', 'button')}
          >
            <Ionicons name="calendar-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.chipText} numberOfLines={1}>
              {formatDate(value)}
            </Text>
          </Pressable>
        )}

        {showTimeChip && (
          <Pressable
            onPress={() => openSheet('time')}
            disabled={disabled}
            style={({ pressed }) => [
              styles.chip,
              { flex: 1 },
              pressed && styles.chipPressed,
              disabled && styles.chipDisabled,
            ]}
            {...a11y(formatTime(value), 'დროის არჩევა', 'button')}
          >
            <Ionicons name="time-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.chipText} numberOfLines={1}>
              {formatTime(value)}
            </Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={cancel}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
          onPress={cancel}
        >
          <Pressable
            onPress={() => {}}
            style={[
              styles.sheet,
              { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 16 },
            ]}
          >
            {/* Header — Cancel / Title / Confirm */}
            <View style={styles.header}>
              <Pressable onPress={cancel} hitSlop={8} {...a11y('გაუქმება', '', 'button')}>
                <Text style={styles.headerAction}>გაუქმება</Text>
              </Pressable>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {sheetTitle}
              </Text>
              <Pressable onPress={confirm} hitSlop={8} {...a11y('დადასტურება', '', 'button')}>
                <Text style={[styles.headerAction, styles.headerActionPrimary]}>
                  დადასტურება
                </Text>
              </Pressable>
            </View>

            {/* Tabs (only in datetime mode) */}
            {mode === 'datetime' && (
              <View style={styles.tabs}>
                <TabButton
                  active={activeTab === 'date'}
                  label={formatDate(draft)}
                  icon="calendar-outline"
                  onPress={() => setActiveTab('date')}
                  theme={theme}
                />
                <TabButton
                  active={activeTab === 'time'}
                  label={formatTime(draft)}
                  icon="time-outline"
                  onPress={() => setActiveTab('time')}
                  theme={theme}
                />
              </View>
            )}

            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={draft}
                mode={sheetPickerMode}
                display={display}
                accentColor={theme.colors.accent}
                textColor={theme.colors.ink}
                themeVariant={theme.colors.surface === '#FFFFFF' ? 'light' : 'dark'}
                minimumDate={minDate}
                maximumDate={maxDate}
                locale="ka-GE"
                onChange={(_, d) => {
                  if (d) setDraft(d);
                }}
                style={{ width: screenWidth - 32 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function TabButton({
  active, label, icon, onPress, theme,
}: {
  active: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        tabStyles.btn,
        {
          backgroundColor: active ? theme.colors.accentSoft : theme.colors.surfaceSecondary,
          borderColor: active ? theme.colors.accent : theme.colors.hairline,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? theme.colors.accent : theme.colors.inkSoft}
      />
      <Text
        style={{
          fontSize: 14,
          fontWeight: active ? '700' : '500',
          color: active ? theme.colors.accent : theme.colors.inkSoft,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const tabStyles = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});

function makeStyles(theme: any) {
  return StyleSheet.create({
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    chipPressed: {
      opacity: 0.7,
    },
    chipDisabled: {
      opacity: 0.4,
    },
    chipText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      gap: 12,
    },
    headerAction: {
      fontSize: 15,
      color: theme.colors.inkSoft,
      fontWeight: '500',
      minWidth: 80,
    },
    headerActionPrimary: {
      color: theme.colors.accent,
      fontWeight: '700',
      textAlign: 'right',
    },
    headerTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.ink,
      textAlign: 'center',
    },
    tabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    pickerWrap: {
      alignItems: 'center',
    },
  });
}
