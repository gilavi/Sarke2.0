// NoteBlocksContent — a list of titled note cards. Used by the incident content
// (description / cause / actions narrative) and the instruction content (topic
// note). Each block is an optional small label + a soft note card.
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../primitives/A11yText';
import { useTheme, type Theme } from '../../../lib/theme';

export interface NoteBlock {
  /** Optional small caps label above the note. */
  label?: string;
  text: string;
}

interface Props {
  blocks: NoteBlock[];
}

export function NoteBlocksContent({ blocks }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const visible = blocks.filter((b) => b.text?.trim());
  if (visible.length === 0) {
    return <Text style={styles.empty}>{t('details.content.empty')}</Text>;
  }

  return (
    <View style={styles.stack}>
      {visible.map((b, i) => (
        <View key={`${b.label ?? ''}-${i}`}>
          {b.label ? <Text style={styles.blockLabel}>{b.label}</Text> : null}
          <View style={styles.note}>
            <Text style={styles.noteText}>{b.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    stack: { gap: 14 },
    blockLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.inkFaint,
      marginBottom: 6,
      paddingHorizontal: 4,
    },
    note: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
      padding: 16,
    },
    noteText: { fontSize: 14, lineHeight: 22, color: theme.colors.inkSoft },
    empty: { fontSize: 14, color: theme.colors.inkFaint, paddingHorizontal: 4 },
  });
}
