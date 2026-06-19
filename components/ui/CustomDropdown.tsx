import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../lib/theme';
import { useBottomSheet, BottomSheetScrollView } from '../BottomSheet';
import { haptic } from '../../lib/haptics';
import { PressBounce } from '../animations/PressBounce';

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
   * When provided the component renders only the sheet (no trigger button).
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
  const showSheet = useBottomSheet();

  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? (controlledOpen ?? false) : internalOpen;

  // Latest props captured in a ref so the imperative sheet body always reads
  // current options/value without re-opening the sheet on every change.
  const liveRef = useRef({ options, value, label, onChange });
  liveRef.current = { options, value, label, onChange };

  const sheetHandleRef = useRef<{ dismiss: () => void } | null>(null);

  const setOpen = useCallback((next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }, [isControlled, onOpenChange]);

  const selectedOption = useMemo(
    () => options.find(o => o.value === value) ?? null,
    [options, value],
  );

  // Imperative bridge: open/close the canonical BottomSheet in response to
  // isOpen flipping. Selection + cancel both close the sheet via setOpen(false).
  useEffect(() => {
    if (!isOpen) {
      sheetHandleRef.current?.dismiss();
      sheetHandleRef.current = null;
      return;
    }
    if (sheetHandleRef.current) return;

    const handle = showSheet(
      {
        content: ({ dismiss }) => {
          const { options: opts, value: curValue, label: curLabel, onChange: curOnChange } = liveRef.current;
          return (
            <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              {curLabel != null && (
                <Text
                  style={[
                    styles.sheetTitle,
                    { fontFamily: ty.fontFamily.bodySemiBold, color: c.inkSoft },
                  ]}
                >
                  {curLabel}
                </Text>
              )}
              <BottomSheetScrollView style={{ maxHeight: 480 }}>
                {opts.map((item, idx) => {
                  const isSelected = item.value === curValue;
                  const isLast = idx === opts.length - 1;
                  return (
                    <View key={String(item.value)}>
                      <Pressable
                        onPress={() => {
                          haptic.light();
                          // Fire onChange synchronously from the React event
                          // handler so router.push / further navigation runs
                          // in a normal React event tick. The sheet then
                          // animates closed in the background.
                          curOnChange(item.value);
                          dismiss();
                        }}
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
                              style={[
                                styles.optionSubtitle,
                                { fontFamily: ty.fontFamily.body, color: c.inkSoft },
                              ]}
                            >
                              {item.subtitle}
                            </Text>
                          )}
                        </View>
                        {isSelected && (
                          <Check size={18} color={c.accent} strokeWidth={1.5} style={styles.checkmark} />
                        )}
                      </Pressable>
                      {!isLast && (
                        <View style={[styles.separator, { backgroundColor: c.border }]} />
                      )}
                    </View>
                  );
                })}
              </BottomSheetScrollView>
              <Pressable
                onPress={() => {
                  haptic.light();
                  dismiss();
                }}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    borderColor: c.border,
                    backgroundColor: c.surface,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="გაუქმება"
              >
                <Text
                  style={[
                    styles.cancelText,
                    { fontFamily: ty.fontFamily.bodySemiBold, color: c.inkFaint },
                  ]}
                >
                  გაუქმება
                </Text>
              </Pressable>
            </View>
          );
        },
      },
      () => {
        sheetHandleRef.current = null;
        setOpen(false);
      },
    );
    sheetHandleRef.current = handle;
  }, [isOpen, showSheet, setOpen, c, ty, insets.bottom]);

  // Make sure we tear the sheet down if the component unmounts mid-open.
  useEffect(() => () => sheetHandleRef.current?.dismiss(), []);

  const openSheet = useCallback(() => {
    if (disabled) return;
    setOpen(true);
  }, [disabled, setOpen]);

  if (isControlled) {
    // Controlled mode: render only the bridge - no trigger button.
    return null;
  }

  return (
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
      <PressBounce
        onPress={openSheet}
        disabled={disabled}
        scaleTo={0.98}
        hapticOnPress="light"
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
        <ChevronDown size={16} color={disabled ? c.inkFaint : c.inkSoft} strokeWidth={1.5} />
      </PressBounce>
      {error != null && (
        <Text style={[styles.errorText, { fontFamily: ty.fontFamily.body, color: c.danger }]}>
          {error}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
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

  sheetTitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionIcon: { marginRight: 14 },
  optionTextCol: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 15, lineHeight: 22 },
  optionSubtitle: { fontSize: 11 },
  checkmark: { marginLeft: 8 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },

  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 16 },
});
