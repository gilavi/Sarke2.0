import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WIZARD_COLORS as C, webStyle, type WizardItem } from './types';

interface SidebarProps {
  /** Uppercase section label, e.g. "ქამარები". */
  sectionLabel: string;
  itemLabel: string;
  items: WizardItem[];
  activeItemId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

/**
 * Left rail listing every inspectable item plus an "add new" card. Web only.
 * Arrow up/down navigation is handled by the parent wizard, which owns focus.
 */
export function Sidebar({
  sectionLabel,
  itemLabel,
  items,
  activeItemId,
  onSelect,
  onAdd,
}: SidebarProps) {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.sidebar}>
      <Text style={styles.sectionLabel}>{sectionLabel}</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <AddCard label={`ახალი ${itemLabel}`} onPress={onAdd} />
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            active={item.id === activeItemId}
            onPress={() => onSelect(item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function AddCard({ label, onPress }: { label: string; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.addCard, hovered && styles.addCardHover]}
    >
      <Text style={styles.addPlus}>+</Text>
      <Text style={styles.addLabel}>{label}</Text>
    </Pressable>
  );
}

/** Status sub-line text + colour for one item. */
function statusLine(item: WizardItem): { text: string; color: string } {
  switch (item.status) {
    case 'done':
      return { text: '✓ დასრულდა', color: C.green };
    case 'problem': {
      const count = item.stats?.no ?? 0;
      return { text: `⚠ ${count} პრობლემა`, color: C.red };
    }
    case 'in_progress': {
      const yes = item.stats?.yes ?? 0;
      const no = item.stats?.no ?? 0;
      return { text: `${yes} კი · ${no} არა`, color: C.textGray };
    }
    case 'pending':
    default:
      return { text: 'შეუვსებელი', color: C.textGray };
  }
}

function ItemRow({
  item,
  active,
  onPress,
}: {
  item: WizardItem;
  active: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const status = statusLine(item);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.itemRow,
        active && styles.itemRowActive,
        !active && hovered && styles.itemRowHover,
      ]}
    >
      <Text style={styles.itemTitle}>{item.label}</Text>
      <Text style={[styles.itemStatus, { color: status.color }]}>{status.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: C.sidebarBg,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  addCard: webStyle({
    marginHorizontal: 12,
    marginVertical: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.dashedBorder,
    borderRadius: 8,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
  }),
  addCardHover: {
    backgroundColor: C.segmentHover,
  },
  addPlus: {
    fontSize: 14,
    color: C.addText,
  },
  addLabel: {
    fontSize: 13,
    color: C.addText,
  },
  itemRow: webStyle({
    marginHorizontal: 8,
    marginVertical: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  }),
  itemRowHover: {
    backgroundColor: C.segmentHover,
  },
  itemRowActive: {
    backgroundColor: C.greenSoftBg,
    borderColor: C.green,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
  },
  itemStatus: {
    fontSize: 11,
    marginTop: 3,
  },
});
