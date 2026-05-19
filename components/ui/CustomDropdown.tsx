import { memo, useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

export interface DropdownOption {
  label: string;
  value: string | number;
  /** Optional leading element rendered before the label (e.g. InspectionTypeAvatar). */
  icon?: React.ReactNode;
  /** Optional second line shown below the label inside the sheet. */
  subtitle?: string;
}

export interface CustomDropdownProps {
  label?: string;
  placeholder?: string;
  options: DropdownOption[];
  value: string | number | null;
  onChange: (value: string | number) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  testID?: string;
  /**
   * Controlled/imperative mode.
   * When provided the component renders only the sheet Modal (no trigger button).
   * The caller is responsible for toggling visibility via onOpenChange.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CustomDropdown = memo(function CustomDropdown({
  label,
  placeholder = 'აირჩიეთ...',
  options,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  testID,
  open: controlledOpen,
  onOpenChange,
}: CustomDropdownProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const ty = theme.typography;
  const insets = useSafeAreaInsets();

  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? (controlledOpen ?? false) : internalOpen;

  const openSheet = useCallback(() => {
    if (disabled) return;
    isControlled ? onOpenChange?.(true) : setInternalOpen(true);
  }, [disabled, isControlled, onOpenChange]);

  const closeSheet = useCallback(() => {
    isControlled ? onOpenChange?.(false) : setInternalOpen(false);
  }, [isControlled, onOpenChange]);

  const handleSelect = useCallback((v: string | number) => {
    onChange(v);
    closeSheet();
  }, [onChange, closeSheet]);

  const selectedOption = useMemo(
    () => options.find(o => o.value === value) ?? null,
    [options, value],
  );

  const renderOption = useCallback(({ item }: { item: DropdownOption }) => {
    const isSelected = item.value === value;
    return (
      <Pressable
        onPress={() => handleSelect(item.value)}
        style={({ pressed }) => [
          styles.optionRow,
          pressed && { backgroundColor: c.surfaceSecondary },
          isSelected && { backgroundColor: c.accentSoft },
        ]}
        accessibilityRole="menuitem"
        accessibilityState={{ selected: isSelected }}
      >
        {item.icon != null && <View style={styles.optionIcon}>{item.icon}</View>}
        <View style={styles.optionTextCol}>
          <Text
            numberOfLines={2}
            style={[
              styles.optionLabel,
              {
                fontFamily: isSelected ? ty.fontFamily.bodySemiBold : ty.fontFamily.body,
                color: isSelected ? c.accent : c.ink,
              },
            ]}
          >
            {item.label}
          </Text>
          {item.subtitle != null && (
            <Text
              numberOfLines={1}
              style={[styles.optionSubtitle, { fontFamily: ty.fontFamily.body, color: c.inkSoft }]}
            >
              {item.subtitle}
            </Text>
          )}
        </View>
        {isSelected && (
          <Ionicons name="checkmark" size={18} color={c.accent} style={styles.checkmark} />
        )}
      </Pressable>
    );
  }, [value, handleSelect, c, ty]);

  return (
    <>
      {/* ── Trigger — rendered only in self-contained mode ─────────────────── */}
      {!isControlled && (
        <View testID={testID} style={styles.fieldWrapper}>
          {label != null && (
            <Text
              style={[
                styles.fieldLabel,
                { fontFamily: ty.fontFamily.bodyMedium, color: error ? c.danger : c.inkSoft },
              ]}
            >
              {label}{required ? ' *' : ''}
            </Text>
          )}
          <Pressable
            onPress={openSheet}
            disabled={disabled}
            accessibilityRole="combobox"
            accessibilityLabel={label}
            accessibilityState={{ disabled, expanded: isOpen }}
            style={[
              styles.trigger,
              {
                borderColor: error ? c.danger : disabled ? c.border : c.borderStrong,
                backgroundColor: disabled ? c.surfaceSecondary : c.surface,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.triggerText,
                { fontFamily: ty.fontFamily.body, color: selectedOption ? c.ink : c.inkFaint },
              ]}
            >
              {selectedOption?.label ?? placeholder}
            </Text>
            <Ionicons name="chevron-down" size={16} color={disabled ? c.inkFaint : c.inkSoft} />
          </Pressable>
          {error != null && (
            <Text style={[styles.errorText, { fontFamily: ty.fontFamily.body, color: c.danger }]}>
              {error}
            </Text>
          )}
        </View>
      )}

      {/* ── Sheet modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={closeSheet} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.surface, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
          {label != null && (
            <Text
              style={[
                styles.sheetTitle,
                { fontFamily: ty.fontFamily.bodySemiBold, color: c.ink },
              ]}
            >
              {label}
            </Text>
          )}
          <FlatList
            data={options}
            keyExtractor={item => String(item.value)}
            renderItem={renderOption}
            bounces={false}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: c.border }]} />
            )}
          />
          <Pressable
            onPress={closeSheet}
            style={({ pressed }) => [
              styles.cancelBtn,
              { borderTopColor: c.borderStrong, opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="გაუქმება"
          >
            <Text style={[styles.cancelText, { fontFamily: ty.fontFamily.body, color: c.inkSoft }]}>
              გაუქმება
            </Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  // ── Self-contained form field ──────────────────────────────────────────────
  fieldWrapper: { gap: 4 },
  fieldLabel: { fontSize: 12, letterSpacing: 0.2 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  triggerText: { flex: 1, fontSize: 15, lineHeight: 22 },
  errorText: { fontSize: 11 },

  // ── Sheet modal ────────────────────────────────────────────────────────────
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetTitle: { fontSize: 13, textAlign: 'center', paddingVertical: 12, paddingHorizontal: 16, letterSpacing: 0.3 },

  // ── Option rows ────────────────────────────────────────────────────────────
  optionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, paddingVertical: 12 },
  optionIcon: { marginRight: 14 },
  optionTextCol: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 15, lineHeight: 22 },
  optionSubtitle: { fontSize: 11 },
  checkmark: { marginLeft: 8 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },

  // ── Cancel button ──────────────────────────────────────────────────────────
  cancelBtn: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  cancelText: { fontSize: 15 },
});
