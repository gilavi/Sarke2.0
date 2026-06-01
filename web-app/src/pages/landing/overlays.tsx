import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Check, Cookie } from 'lucide-react';
import { routes } from '@/app/routes';
import { appleIcon } from './shared';

// ─── Sticky mobile bar ────────────────────────────────────────────────────────
export function StickyMobileBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fn = () => setVisible(window.scrollY > window.innerHeight * 0.75);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-neutral-200 px-4 py-3 flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 shrink-0">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <p className="flex-1 min-w-0 text-sm font-semibold text-neutral-900 truncate">HUBBLE — გადმოწერე უფასოდ</p>
          <Link
            to={routes.register}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d={appleIcon} /></svg>
            სცადე
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Exit intent popup ────────────────────────────────────────────────────────
export function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const fn = (e: MouseEvent) => { if (e.clientY <= 20) setShow(true); };
    document.addEventListener('mouseleave', fn);
    return () => document.removeEventListener('mouseleave', fn);
  }, [dismissed]);

  const dismiss = () => { setShow(false); setDismissed(true); };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: POST to Formspree / Supabase leads table
    setSubmitted(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="hidden md:flex fixed inset-0 z-50 items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="relative rounded-3xl bg-white p-8 w-full max-w-md mx-4"
          >
            <button onClick={dismiss} className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 transition-colors">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 shrink-0">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-neutral-900">დაველოდე!</p>
                <p className="text-sm text-neutral-500">3 PDF უფასოდ →</p>
              </div>
            </div>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <p className="text-sm text-neutral-600 mb-1">მიიღე HUBBLE-ს შესახებ განახლებები პირველ რიგში:</p>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="შენი ელ.ფოსტა" required
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <button type="submit" className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
                  გამომიგზავნე
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 mb-1">
                  <Check size={22} className="text-brand-600" />
                </div>
                <p className="font-semibold text-neutral-900">მადლობა!</p>
                <p className="text-sm text-neutral-500">ჩვენ გამოგიგზავნით განახლებებს</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Cookie banner ────────────────────────────────────────────────────────────
export function CookieBanner() {
  const [accepted, setAccepted] = useState(() => localStorage.getItem('cookie-accepted') === 'true');
  if (accepted) return null;
  const accept = () => { localStorage.setItem('cookie-accepted', 'true'); setAccepted(true); };
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:bottom-4 md:left-4 md:right-auto md:max-w-sm md:rounded-2xl border-t md:border border-neutral-200 bg-white px-5 py-4">
      <div className="flex items-start gap-3">
        <Cookie size={17} className="shrink-0 text-neutral-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-600 mb-3">
            ვებ-გვერდი იყენებს Cookies-ებს სერვისის გასაუმჯობესებლად.{' '}
            <Link to="/terms" className="text-brand-600 hover:underline">დაწვრილებით</Link>
          </p>
          <div className="flex gap-2">
            <button onClick={accept} className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">
              მიღება
            </button>
            <button onClick={accept} className="rounded-lg px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors">
              დახურვა
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
