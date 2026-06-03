import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, User, FolderPlus, ClipboardCheck, Route } from 'lucide-react';
import { useConfetti } from '@/hooks/useConfetti';

const ITEMS = [
  { id: 'profile', label: 'დასრულეთ პროფილი', icon: User },
  { id: 'project', label: 'შექმენით პირველი პროექტი', icon: FolderPlus },
  { id: 'inspection', label: 'ჩაატარეთ პირველი შემოწმება', icon: ClipboardCheck },
  { id: 'tour', label: 'გაიარეთ ტური', icon: Route },
];

export function QuickWinChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(false);
  const fireConfetti = useConfetti();

  useEffect(() => {
    const saved = localStorage.getItem('hubble-checklist');
    if (saved) {
      try { setChecked(JSON.parse(saved)); } catch {}
    }
    const d = localStorage.getItem('hubble-checklist-dismissed');
    if (d) setDismissed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('hubble-checklist', JSON.stringify(checked));
    const allDone = ITEMS.every((i) => checked[i.id]);
    if (allDone && Object.keys(checked).length > 0) {
      fireConfetti();
      setTimeout(() => setDismissed(true), 2000);
      localStorage.setItem('hubble-checklist-dismissed', '1');
    }
  }, [checked, fireConfetti]);

  if (dismissed) return null;

  const doneCount = ITEMS.filter((i) => checked[i.id]).length;
  const progress = doneCount / ITEMS.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">საწყისი ნაბიჯები</h3>
        <button onClick={() => { setDismissed(true); localStorage.setItem('hubble-checklist-dismissed', '1'); }} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <X size={14} />
        </button>
      </div>
      <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
        <motion.div className="h-1.5 rounded-full bg-brand-500" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} />
      </div>
      <div className="space-y-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const isDone = checked[item.id];
          return (
            <button
              key={item.id}
              onClick={() => setChecked((c) => ({ ...c, [item.id]: !c[item.id] }))}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${isDone ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-300' : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800'}`}
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded border ${isDone ? 'border-brand-500 bg-brand-500 text-white' : 'border-neutral-300 dark:border-neutral-600'}`}>
                {isDone && <Check size={12} />}
              </div>
              <Icon size={14} className="text-neutral-400" />
              <span className={isDone ? 'line-through opacity-70' : ''}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
