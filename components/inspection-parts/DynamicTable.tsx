import { memo, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../primitives/A11yText';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { useTheme, type Theme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';

export interface DynamicTableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'readonly';
  width?: number;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
}

export interface DynamicTableProps {
  columns: DynamicTableColumn[];
  rows: Record<string, any>[];
  onChange: (rows: Record<string, any>[]) => void;
  onBuildDefaultRow: () => Record<string, any>;
  minRows?: number;
  footer?: React.ReactNode;
}

export function DynamicTable({
  columns,
  rows,
  onChange,
  onBuildDefaultRow,
  minRows = 0,
  footer,
}: DynamicTableProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const handleAdd = () => {
    haptic.light();
    onChange([...rows, onBuildDefaultRow()]);
  };

  const handleDelete = (idx: number) => {
    haptic.light();
    onChange(rows.filter((_, i) => i !== idx));
  };

  const handleChange = (idx: number, key: string, value: any) => {
    const updated = rows.map((row, i) => i === idx ? { ...row, [key]: value } : row);
    onChange(updated);
  };

  return (
    <View style={styles.container}>
      {rows.map((row, idx) => (
        <DynamicTableRow
          key={idx}
          index={idx}
          columns={columns}
          row={row}
          canDelete={rows.length > minRows}
          onChange={(key, value) => handleChange(idx, key, value)}
          onDelete={() => handleDelete(idx)}
        />
      ))}

      <Pressable
        style={styles.addBtn}
        onPress={handleAdd}
        {...a11y('სტრიქონის დამატება', undefined, 'button')}
      >
        <Ionicons name="add-circle-outline" size={18} color={theme.colors.accent} />
        <Text style={styles.addText}>+ სტრიქონის დამატება</Text>
      </Pressable>

      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

// ── Row sub-component ─────────────────────────────────────────────────────────

interface RowProps {
  index: number;
  columns: DynamicTableColumn[];
  row: Record<string, any>;
  canDelete: boolean;
  onChange: (key: string, value: any) => void;
  onDelete: () => void;
}

const DynamicTableRow = memo(function DynamicTableRow({
  index,
  columns,
  row,
  canDelete,
  onChange,
  onDelete,
}: RowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.numBadge}>
          <Text style={styles.numText}>{index + 1}</Text>
        </View>
        {canDelete && (
          <Pressable
            onPress={onDelete}
            hitSlop={10}
            style={styles.deleteBtn}
            {...a11y('სტრიქონის წაშლა', undefined, 'button')}
          >
            <Ionicons name="close" size={16} color={theme.colors.danger} />
          </Pressable>
        )}
      </View>

      {columns.map(col => {
        const rawVal = row[col.key];

        if (col.type === 'readonly') {
          const display = rawVal != null ? String(rawVal) : '—';
          return (
            <View key={col.key} style={styles.readonlyField}>
              <Text style={styles.readonlyLabel}>{col.label}</Text>
              <Text style={styles.readonlyValue}>{display}</Text>
            </View>
          );
        }

        return (
          <EditableCell
            key={col.key}
            col={col}
            value={rawVal}
            onChange={val => onChange(col.key, val)}
          />
        );
      })}
    </View>
  );
});

// ── Editable cell holds local draft to avoid re-render on every keystroke ────

function EditableCell({
  col,
  value,
  onChange,
}: {
  col: DynamicTableColumn;
  value: any;
  onChange: (val: any) => void;
}) {
  const [draft, setDraft] = useState<string>(
    value != null ? String(value) : '',
  );
  // Resync the draft when `value` changes from outside this cell — e.g. when
  // the parent list reuses this instance for a different row after a mid-list
  // delete (rows are keyed by index). Without this the cell would show the
  // previous row's stale text. Guarded by `lastEmitted` so in-progress numeric
  // typing (e.g. "1," which emits 1) isn't clobbered by the echo-back.
  const lastEmitted = useRef<any>(value);
  if (value !== lastEmitted.current) {
    lastEmitted.current = value;
    const next = value != null ? String(value) : '';
    if (next !== draft) setDraft(next);
  }

  const handleChange = (text: string) => {
    setDraft(text);
    if (col.type === 'number') {
      const n = parseFloat(text.replace(',', '.'));
      const v = isNaN(n) ? null : n;
      lastEmitted.current = v;
      onChange(v);
    } else {
      lastEmitted.current = text;
      onChange(text);
    }
  };

  return (
    <FloatingLabelInput
      label={col.label}
      value={draft}
      onChangeText={handleChange}
      keyboardType={col.keyboardType ?? (col.type === 'number' ? 'decimal-pad' : 'default')}
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    container: { gap: 8 },
    row: {
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    rowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    numBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.subtleSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numText: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft },
    deleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: theme.colors.dangerTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readonlyField: {
      paddingHorizontal: 4,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.hairline,
    },
    readonlyLabel: { fontSize: 10, color: theme.colors.inkFaint, marginBottom: 2 },
    readonlyValue: { fontSize: 13, color: theme.colors.ink, fontWeight: '600' },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
    },
    addText: { fontSize: 13, color: theme.colors.accent, fontWeight: '600' },
    footer: {
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: 10,
      marginTop: 4,
    },
  });
}
