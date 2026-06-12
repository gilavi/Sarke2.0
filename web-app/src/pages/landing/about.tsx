import { motion } from 'framer-motion';
import { Target, Heart, Zap, ShieldCheck, MapPin, type LucideIcon } from 'lucide-react';
import { fadeUp, stagger } from './shared';
import { teamMembers, socialLinks } from './marketing-data';

const VALUES: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: Zap, title: 'სიმარტივე', desc: 'ხელსაწყო, რომელსაც სპეციალისტი წუთებში ითვისებს ზედმეტი ნაბიჯების გარეშე.' },
  { Icon: ShieldCheck, title: 'კანონიერება', desc: 'ყველაფერი აგებულია ქართულ კანონმდებლობაზე დოკუმენტი ინსპექციისთვის მზადაა.' },
  { Icon: Heart, title: 'ნდობა', desc: 'მონაცემი შენია. დაცული, კონფიდენციალური და ყოველთვის ხელმისაწვდომი.' },
  { Icon: MapPin, title: 'ადგილობრივი', desc: 'ქართველი გუნდი, ქართული ბაზრის რეალური საჭიროებებიდან.' },
];

// ─── Values ─────────────────────────────────────────────────────────────────────
export function Values() {
  return (
    <section className="py-24 px-5 bg-offwhite">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-2xl sm:text-3xl font-bold text-neutral-900 mb-14"
        >
          რა გვმართავს
        </motion.h2>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {VALUES.map(({ Icon, title, desc }) => (
            <motion.div key={title} variants={fadeUp} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-safety-50">
                <Icon size={20} className="text-safety-600" />
              </div>
              <h3 className="font-bold text-neutral-900 mb-1 text-sm">{title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Mission (რატო ვაკეთებთ) ──────────────────────────────────────────────────────
export function Mission() {
  return (
    <section className="bg-offwhite pt-32 pb-24 px-5">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-safety-500 mb-6">
            <Target size={22} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-neutral-900 mb-6 leading-tight">
            რატომ ვაკეთებთ HUBBLE-ს
          </h1>
          <p className="text-lg text-neutral-500 leading-relaxed">
            შრომის უსაფრთხოება სიცოცხლეებს იცავს მაგრამ ქაღალდის ბიუროკრატია სპეციალისტებს
            მთავარი საქმისგან აშორებს. ჩვენ გვჯერა, რომ შემოწმება უნდა იყოს სწრაფი, დოკუმენტი 
            კანონიერი, ხოლო სპეციალისტი ობიექტზე და არა ოფისში. HUBBLE სწორედ ამას აკეთებს.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Who we are (ვინ ვართ) ─────────────────────────────────────────────────────────
export function WhoWeAre() {
  return (
    <section className="py-24 px-5 bg-white">
      <div className="mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="flex items-center gap-2 mb-4">
            <Heart size={20} className="text-safety-600" />
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">ვინ ვართ</h2>
          </div>
          <div className="space-y-4 text-neutral-500 leading-relaxed">
            <p>
              HUBBLE შეიქმნა საქართველოში, შრომის უსაფრთხოების მოქმედ სპეციალისტებთან ერთად.
              თითოეული ფუნქცია იბადება რეალური ობიექტური საჭიროებიდან და არა აბსტრაქტული იდეიდან.
            </p>
            <p>
              ჩვენი გუნდი აერთიანებს უსაფრთხოების ექსპერტიზასა და თანამედროვე ტექნოლოგიას, რათა
              ქართულ ბაზარს შევთავაზოთ ხელსაწყო, რომელიც მართლა ესმის ადგილობრივ კონტექსტსა და
              კანონმდებლობას.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Team (თიმი) placeholder cards ─────────────────────────────────────────────────
export function Team() {
  return (
    <section className="py-24 px-5 bg-offwhite">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-2xl sm:text-3xl font-bold text-neutral-900 mb-14"
        >
          გუნდი
        </motion.h2>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {teamMembers.map((m, i) => (
            <motion.div key={i} variants={fadeUp} className="rounded-2xl border border-neutral-200 bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-safety-100 text-lg font-bold text-safety-700">
                {m.initials}
              </div>
              <p className="font-semibold text-neutral-900 text-sm">{m.name}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{m.role}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Social (სოციალ) placeholder links ─────────────────────────────────────────────
export function Social() {
  return (
    <section className="py-24 px-5 bg-white">
      <div className="mx-auto max-w-2xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3"
        >
          გამოგვყევი
        </motion.h2>
        <p className="text-neutral-500 mb-10">სიახლეები, რჩევები და განახლებები სოციალურ ქსელებში.</p>
        <div className="flex items-center justify-center gap-4">
          {socialLinks.map(({ Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-neutral-600 hover:border-safety-300 hover:text-safety-600 transition-colors"
            >
              <Icon size={20} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
