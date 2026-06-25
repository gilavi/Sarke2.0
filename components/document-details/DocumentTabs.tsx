// DocumentTabs — the sticky tab bar. Presentational only: it renders one tab
// per existing section and an accent underline on the active one. The shell
// (DocumentDetails) owns the ScrollView, the section offsets, scroll-to-section
// on press, and active-on-scroll detection, and feeds `activeId` back in.
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { useTheme, type Theme } from '../../lib/theme';
import { a11y } from '../../lib/accessibility';

export interface DocumentTabItem {
  id: string;
  label: string;
}

interface Props {
  tabs: DocumentTabItem[];
  activeId: string;
  onPress: (id: string) => void;
}

export function DocumentTabs({ tabs, activeId, onPress }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onPress(tab.id)}
              style={styles.tab}
              {...a11y(tab.label, undefined, 'button', { selected: active })}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
              {active ? <View style={styles.underline} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    bar: {
      backgroundColor: theme.colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    row: { flexDirection: 'row', gap: 20, paddingHorizontal: 24 },
    tab: { paddingVertical: 10 },
    label: { fontSize: 14, fontWeight: '600', color: theme.colors.inkFaint },
    labelActive: { color: theme.colors.ink },
    underline: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 2,
      borderRadius: 2,
      backgroundColor: theme.colors.accent,
    },
  });
}
