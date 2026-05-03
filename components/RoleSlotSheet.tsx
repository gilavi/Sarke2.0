import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from './primitives/A11yText';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui';
import { FloatingLabelInput } from './inputs/FloatingLabelInput';
import { BottomSheetScrollView } from './BottomSheet';
import { SheetLayout } from './SheetLayout';
import { theme } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { a11y } from '../lib/accessibility';
import { CREW_ROLE_LABEL } from '../types/models';
import type { CrewRoleKey } from '../types/models';

export interface RoleSlotDetails {
  name: string;
  /** Display label for the role (preset label, or user-typed for `other`). */
  role: string;
}

interface Props {
  roleKey: CrewRoleKey;
  initialName?: string;
  /** For `other`: the previously-stored custom role label, if editing. */
  initialRoleLabel?: string;
  /**
   * `create` (default) leads into the SignatureCanvas after submit — button
   * reads "ხელმოწერა →". `editDetails` saves the new name/role on an
   * existing member without re-signing — button reads "შენახვა" and
   * `onResign` (if provided) is exposed as a secondary link for the user
   * to opt into a fresh signature.
   */
  mode?: 'create' | 'editDetails';
  onSubmit: (details: RoleSlotDetails) => void | Promise<void>;
  onCancel: () => void;
  onResign?: () => void;
  loading?: boolean;
  error?: string | null;
}

/**
 * Bottom-sheet content for the **details** step of adding/editing a role-slot
 * person. Collects name (and a custom role label for the `other` slot), then
 * hands off to the parent which dismisses the sheet and launches the
 * full-screen `SignatureCanvas` modal — rendering the signature WebView
 * inside the animated bottom-sheet Modal crashed on iOS.
 */
export function RoleSlotSheet({
  roleKey,
  initialName = '',
  initialRoleLabel,
  mode = 'create',
  onSubmit,
  onCancel,
  onResign,
  loading = false,
  error = null,
}: Props) {
  const [name, setName] = useState(initialName);
  const [customRole, setCustomRole] = useState(
    roleKey === 'other' ? initialRoleLabel ?? '' : '',
  );

  const isOther = roleKey === 'other';
  const roleLabel = isOther ? customRole.trim() || 'სხვა' : CREW_ROLE_LABEL[roleKey];

  const valid = useMemo(() => {
    if (name.trim().length === 0) return false;
    if (isOther && customRole.trim().length === 0) return false;
    return true;
  }, [name, customRole, isOther]);

  const submit = async () => {
    if (!valid || loading) return;
    haptic.light();
    await onSubmit({ name: name.trim(), role: roleLabel });
  };

  return (
    <SheetLayout
      showHandle={false}
      ScrollComponent={BottomSheetScrollView}
      header={
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>როლი</Text>
            <Text style={styles.title} numberOfLines={2}>{roleLabel}</Text>
          </View>
          <Pressable onPress={onCancel} hitSlop={10} style={styles.iconBtn} {...a11y('დახურვა', 'ფორმის დახურვა', 'button')}>
            <Ionicons name="close" size={20} color={theme.colors.inkSoft} />
          </Pressable>
        </View>
      }
      footer={
        <View style={{ gap: 10 }}>
          <Button
            title={mode === 'editDetails' ? 'შენახვა' : 'ხელმოწერა →'}
            onPress={submit}
            disabled={!valid || loading}
            loading={loading}
          />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          {mode === 'editDetails' && onResign ? (
            <Pressable
              onPress={onResign}
              hitSlop={6}
              style={styles.resignBtn}
              {...a11y('ხელმოწერა ხელახლა', 'ახალი ხელმოწერის გაკეთება', 'button')}
            >
              <Text style={styles.resignText}>ხელმოწერა ხელახლა</Text>
            </Pressable>
          ) : null}
        </View>
      }
    >
      {isOther ? (
        <FloatingLabelInput
          label="როლი"
          value={customRole}
          onChangeText={setCustomRole}
          autoFocus
        />
      ) : null}
      <FloatingLabelInput
        label="სახელი გვარი"
        value={name}
        onChangeText={setName}
        autoFocus={!isOther}
      />
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  title: { fontSize: 17, fontWeight: '800', color: theme.colors.ink, marginTop: 2 },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: theme.colors.subtleSurface,
  },
  resignBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resignText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    textAlign: 'center',
  },
});
