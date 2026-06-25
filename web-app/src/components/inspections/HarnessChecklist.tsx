import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { SegmentedControl } from '@/components/wizard/SegmentedControl';

/**
 * Per-item checklist content (one harness/item at a time). Rendered inside the
 * shared WizardContent, so it owns no padding/max-width of its own. Rows read as
 * an AUDIT LEDGER: [label fills width] · [monochrome seg control right-aligned],
 * hairline divider between rows.
 */
type GridValues = Record<string, Record<string, string>>;
type CellOpt = 'ok' | 'bad' | 'na';

const STATUS_OPTIONS = [
  { label: 'კი', value: 'ok' },
  { label: 'არა', value: 'bad' },
  { label: 'N/A', value: 'na' },
];

export function HarnessChecklist({
  itemLabel,
  activeIdx,
  activeRow,
  statusCols,
  values,
  naSet,
  hasComment,
  onSelect,
  onComment,
}: {
  itemLabel: string;
  activeIdx: number;
  activeRow: string;
  statusCols: string[];
  values: GridValues;
  naSet: Set<string>;
  hasComment: boolean;
  onSelect: (row: string, col: string, opt: CellOpt) => void;
  onComment: (row: string, value: string) => void;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeRow}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
      >
        <h2 className="text-neutral-900 dark:text-neutral-100" style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          {itemLabel} {activeIdx + 1}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>შეამოწმეთ ყველა პუნქტი</p>

        <div role="list">
          {statusCols.map((col) => {
            const current = values[activeRow]?.[col] ?? '';
            const key = `${activeRow}|${col}`;
            const selected = current === 'ok' ? 'ok' : current === 'bad' ? 'bad' : naSet.has(key) ? 'na' : null;
            return (
              <ChecklistRow
                key={col}
                label={col}
                selected={selected}
                onSelect={(opt) => onSelect(activeRow, col, opt)}
              />
            );
          })}
        </div>

        {hasComment && (
          <div className="mt-6">
            <Textarea
              label="კომენტარი"
              value={values[activeRow]?.['კომენტარი'] ?? ''}
              onChange={(e) => onComment(activeRow, e.target.value)}
              placeholder="შეიყვანეთ კომენტარი..."
              rows={3}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ChecklistRow({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: string | null;
  onSelect: (opt: CellOpt) => void;
}) {
  const handleKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'y' || k === '1') {
      e.preventDefault();
      onSelect('ok');
    } else if (k === 'n' || k === '2') {
      e.preventDefault();
      onSelect('bad');
    } else if (k === '3' || k === ' ') {
      e.preventDefault();
      onSelect('na');
    }
  };

  return (
    <div
      role="listitem"
      tabIndex={0}
      onKeyDown={handleKey}
      className="grid items-center gap-4 rounded outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      style={{
        gridTemplateColumns: 'minmax(0,1fr) auto',
        paddingTop: 12,
        paddingBottom: 12,
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <span className="min-w-0 text-sm text-neutral-800 dark:text-neutral-200">{label}</span>
      <div className="justify-self-end">
        <SegmentedControl options={STATUS_OPTIONS} selected={selected} onSelect={(v) => onSelect(v as CellOpt)} />
      </div>
    </div>
  );
}
