import { useMemo } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button } from '../../components/ui';
import { useTheme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';
import { getstyles } from './styles';

export function DeleteConfirmModal({
  visible,
  deleting,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmOverlay}>
        <Pressable style={styles.confirmBackdrop} onPress={onCancel} {...a11y('გაუქმება', 'შეეხეთ გასაუქმებლად', 'button')} />
        <View style={styles.confirmCard}>
          <View style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="warning-outline" size={28} color={theme.colors.danger} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.ink }}>წაშლა?</Text>
            <Text style={{ fontSize: 14, color: theme.colors.inkSoft, textAlign: 'center', lineHeight: 20 }}>
              შემოწმების აქტი სამუდამოდ წაიშლება.
            </Text>
          </View>
          <View style={{ gap: 8, marginTop: 4 }}>
            <Button title="გაუქმება" variant="secondary" onPress={onCancel} />
            <Button
              title="წაშლა"
              variant="danger"
              loading={deleting}
              disabled={deleting}
              onPress={onConfirm}
              iconLeft={<Ionicons name="trash" size={18} color={theme.colors.danger} />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
