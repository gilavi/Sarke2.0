import { memo, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CirclePlus, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../primitives/A11yText';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import { FloatingLabelInput } from '../inputs/FloatingLabelInput';
import { useTheme, type Theme } from '../../lib/theme';

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
  /**
   * When set, the row card header shows this column's value (e.g. "N1") as the
   * card title instead of the ordinal "#1" number badge, and the column is not
   * rendered again as a field below. Use for tables whose rows already carry a
   * meaningful display id, so the badge + a readonly "ID" cell don't duplicate
   * the same datum.
   */
  titleColumnKey?: string;
}

export function DynamicTable({
  columns,
  rows,
  onChange,
  onBuildDefaultRow,
  minRows = 0,
  footer,
  titleColumnKey,
}: DynamicTableProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  // The add Button and the danger delete IconButton each fire their own press
  // haptic (Light / Heavy), so these handlers stay haptic-free.
  const handleAdd = () => {
    onChange([...rows, onBuildDefaultRow()]);
  };

  const handleDelete = (idx: number) => {
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
          titleColumnKey={titleColumnKey}
          onChange={(key, value) => handleChange(idx, key, value)}
          onDelete={() => handleDelete(idx)}
        />
      ))}

      <Button
        title={t('generalEquipment.addRow')}
        variant="ghost"
        size="sm"
        leftIcon={CirclePlus}
        onPress={handleAdd}
        style={styles.addBtn}
      />

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
  titleColumnKey?: string;
  onChange: (key: string, value: any) => void;
  onDelete: () => void;
}

const DynamicTableRow = memo(function DynamicTableRow({
  index,
  columns,
  row,
  canDelete,
  titleColumnKey,
  onChange,
  onDelete,
}: RowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  // When a title column is configured, the row's own display id (e.g. "N1")
  // becomes the card header and that column is dropped from the field list -
  // so we don't show both the "#1" badge and a readonly "ID: N1" cell.
  const titleValue =
    titleColumnKey != null && row[titleColumnKey] != null
      ? String(row[titleColumnKey])
      : null;
  const fieldColumns = titleColumnKey
    ? columns.filter(c => c.key !== titleColumnKey)
    : columns;

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        {titleValue != null ? (
          <Text style={styles.rowTitle}>{titleValue}</Text>
        ) : (
          <View style={styles.numBadge}>
            <Text style={styles.numText}>{index + 1}</Text>
          </View>
        )}
        {canDelete && (
          <IconButton
            icon={Trash2}
            onPress={onDelete}
            a11yLabel={t('generalEquipment.deleteRow')}
            variant="danger"
            size="sm"
          />
        )}
      </View>

      {fieldColumns.map(col => {
        const rawVal = row[col.key];

        if (col.type === 'readonly') {
          const display = rawVal != null ? String(rawVal) : '-';
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
  // Resync the draft when `value` changes from outside this cell - e.g. when
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
    rowTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.ink },
    readonlyField: {
      paddingHorizontal: 4,
      paddingVertical: 6,
    },
    readonlyLabel: { fontSize: 10, color: theme.colors.inkFaint, marginBottom: 2 },
    readonlyValue: { fontSize: 13, color: theme.colors.ink, fontWeight: '600' },
    addBtn: {
      alignSelf: 'flex-start',
      marginVertical: 8,
    },
    footer: {
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: 10,
      marginTop: 4,
    },
  });
}
