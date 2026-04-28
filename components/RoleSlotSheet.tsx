import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { A11yText as Text } from './primitives/A11yText';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field, Input } from './ui';
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
  onSubmit: (details: RoleSlotDetails) => void;
  onCancel: () => void;
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
  onSubmit,
  onCancel,
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

  const submit = () => {
    if (!valid) return;
    haptic.light();
    onSubmit({ name: name.trim(), role: roleLabel });
  };

  return (
    <SheetLayout
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
        <Button
          title="ხელმოწერა →"
          onPress={submit}
          disabled={!valid}
        />
      }
    >
      {isOther ? (
        <Field label="როლი">
          <Input
            value={customRole}
            onChangeText={setCustomRole}
            placeholder="მაგ. პრარაბი"
            autoFocus
          />
        </Field>
      ) : null}
      <Field label="სახელი გვარი">
        <Input
          value={name}
          onChangeText={setName}
          placeholder="მაგ. გიორგი მელაძე"
          autoFocus={!isOther}
        />
      </Field>
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
});
