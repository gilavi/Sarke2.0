// DocumentDetailsHeader — the tile + title + type + status pill block at the
// top of DocumentDetails. Deliberately NOT celebratory: no check disc, no hero.
// That is what distinguishes a saved-record details view from the post-save
// success screen (FlowSuccessScreen).
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { A11yText as Text } from '../primitives/A11yText';
import { Badge } from '../primitives/Badge';
import { useTheme, type Theme } from '../../lib/theme';
import type { StatusTone } from './types';

interface Props {
  tileIcon: LucideIcon;
  title: string;
  typeLabel: string;
  status?: { tone: StatusTone; label: string } | null;
}

const TONE_VARIANT: Record<StatusTone, 'success' | 'danger' | 'default'> = {
  safe: 'success',
  severe: 'danger',
  muted: 'default',
};

export function DocumentDetailsHeader({ tileIcon: TileIcon, title, typeLabel, status }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <View style={styles.tile}>
        <TileIcon size={26} color={theme.colors.white} strokeWidth={1.8} />
      </View>
      <View style={styles.main}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.meta}>
          <Text style={styles.type}>{typeLabel}</Text>
          {status ? <Badge variant={TONE_VARIANT[status.tone]}>{status.label}</Badge> : null}
        </View>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 },
    tile: {
      width: 54,
      height: 54,
      borderRadius: 14,
      backgroundColor: theme.colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    main: { flex: 1, minWidth: 0 },
    title: { fontSize: 20, fontWeight: '700', lineHeight: 25, color: theme.colors.ink },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
    type: { fontSize: 13, color: theme.colors.inkFaint },
  });
}
