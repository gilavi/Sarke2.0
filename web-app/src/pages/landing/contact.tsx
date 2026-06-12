import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Mail, Check, Send } from 'lucide-react';

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function ContactHero() {
  return (
    <section className="bg-offwhite pt-32 pb-16 px-5">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl sm:text-5xl font-bold text-neutral-900 mb-4 leading-tight">
            დაგვიკავშირდი
          </h1>
          <p className="text-lg text-neutral-500 leading-relaxed">
            გაქვს შეკითხვა? ჰკითხე AI ასისტენტს მყისიერი პასუხისთვის, ან მოგვწერე გიპასუხებთ
            სამუშაო დღეებში 24 საათის განმავლობაში.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Contact form + info ─────────────────────────────────────────────────────────
export function ContactInfo() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: POST to Supabase leads table / Formspree.
    setSubmitted(true);
  };

  return (
    <section className="py-20 px-5 bg-white">
      <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Form */}
        <div>
          <h2 className="text-xl font-bold text-neutral-900 mb-6">მოგვწერე</h2>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="სახელი" required
                className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-safety-500 focus:ring-2 focus:ring-safety-100"
              />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ელ.ფოსტა" required
                className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-safety-500 focus:ring-2 focus:ring-safety-100"
              />
              <textarea
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="შენი შეტყობინება" required rows={4}
                className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-safety-500 focus:ring-2 focus:ring-safety-100"
              />
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-safety-500 py-3 text-sm font-semibold text-white hover:bg-safety-600 transition-colors">
                <Send size={15} /> გაგზავნა
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-safety-100 bg-safety-50/50 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-safety-100">
                <Check size={22} className="text-safety-600" />
              </div>
              <p className="font-semibold text-neutral-900">მადლობა!</p>
              <p className="text-sm text-neutral-500">მალე დაგიკავშირდებით.</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-neutral-900">სხვა გზები</h2>
          <a href="mailto:hello@hubble.ge" className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 hover:border-safety-300 transition-colors">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-safety-50">
              <Mail size={18} className="text-safety-600" />
            </div>
            <div>
              <p className="text-xs text-neutral-400">ელ.ფოსტა</p>
              <p className="text-sm font-semibold text-neutral-900">hello@hubble.ge</p>
            </div>
          </a>
          <p className="text-sm text-neutral-500 leading-relaxed">
            კორპორატიული ტარიფი ან დემო? მოგვწერე და მოვაწყობთ ინდივიდუალურ შეხვედრას შენი
            გუნდისთვის.
          </p>
        </div>
      </div>
    </section>
  );
}
