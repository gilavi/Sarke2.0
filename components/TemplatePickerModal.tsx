import { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { InspectionTypeAvatar } from './InspectionTypeAvatar';
import type { Template } from '../types/models';

interface Props {
  visible: boolean;
  templates: Template[];
  title: string;
  onSelect: (template: Template) => void;
  onClose: () => void;
}

export const TemplatePickerModal = memo(function TemplatePickerModal({
  visible,
  templates,
  title,
  onSelect,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface }]}>
        <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
        <Text style={[styles.title, { color: c.ink }]}>{title}</Text>
        <ScrollView bounces={false}>
          {templates.map((tpl, i) => (
            <TouchableOpacity
              key={tpl.id}
              style={[
                styles.row,
                {
                  borderBottomColor: c.borderStrong,
                  borderBottomWidth: i < templates.length - 1 ? StyleSheet.hairlineWidth : 0,
                },
              ]}
              onPress={() => onSelect(tpl)}
              activeOpacity={0.7}
            >
              <InspectionTypeAvatar
                category={tpl.category}
                size={40}
                style={styles.avatar}
              />
              <Text style={[styles.label, { color: c.ink }]} numberOfLines={2}>
                {tpl.name}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={c.inkSoft} />
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={[styles.cancel, { borderTopColor: c.borderStrong }]} onPress={onClose}>
          <Text style={[styles.cancelText, { color: c.inkSoft }]}>გაუქმება</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatar: {
    marginRight: 14,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  cancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
  },
});
