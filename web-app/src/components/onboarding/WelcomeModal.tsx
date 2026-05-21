import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FolderPlus, ClipboardCheck, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfetti } from '@/hooks/useConfetti';
import { useAuth } from '@/lib/auth';

const STEPS = [
  { title: 'მოგესალმებით Hubble-ში', desc: 'თქვენი შრომის უსაფრთხოების ცენტრალური პანელი.', icon: Shield },
  { title: 'თქვენი პირველი პროექტი', desc: 'შექმენით პროექტი და დაიწყეთ მისი მართვა.', icon: FolderPlus },
  { title: 'შემოწმების დაწყება', desc: 'ჩაატარეთ უსაფრთხოების შემოწმება რამდენიმე დაჭერით.', icon: ClipboardCheck },
  { title: 'მზად ხართ!', desc: 'ყველაფერი მზად არის. წარმატებები!', icon: PartyPopper },
];

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const fireConfetti = useConfetti();
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;
    const seen = localStorage.getItem('sarke-welcome-seen');
    if (!seen) setOpen(true);
  }, [session]);

  function close() {
    localStorage.setItem('sarke-welcome-seen', '1');
    setOpen(false);
    if (step === STEPS.length - 1) fireConfetti();
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else close();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-end">
                <button onClick={close} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <X size={16} />
                </button>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                    {(() => {
                      const Icon = STEPS[step].icon;
                      return <Icon size={28} />;
                    })()}
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{STEPS[step].title}</h3>
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{STEPS[step].desc}</p>
                </motion.div>
              </AnimatePresence>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <div key={i} className={`h-1.5 w-6 rounded-full transition ${i === step ? 'bg-brand-500' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
                  ))}
                </div>
                <Button onClick={next}>{step < STEPS.length - 1 ? 'შემდეგი' : 'დაწყება'}</Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
