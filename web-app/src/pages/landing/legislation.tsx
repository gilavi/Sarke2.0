import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, FileText } from 'lucide-react';
import { REGULATIONS } from '@/lib/data/regulations';
import { fadeUp, stagger } from './shared';
import { blogArticles } from './marketing-data';

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function LegislationHero() {
  return (
    <section className="bg-offwhite pt-32 pb-20 px-5">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-safety-500 mb-6">
            <BookOpen size={22} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-neutral-900 mb-5 leading-tight">
            კანონმდებლობა
          </h1>
          <p className="text-lg text-neutral-500 leading-relaxed">
            საქართველოს შრომის უსაფრთხოების კანონმდებლობა — ძირითადი დოკუმენტები, ტექნიკური
            რეგლამენტები და პრაქტიკული სტატიები ერთ ადგილას.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Official documents + blog ─────────────────────────────────────────────────────
export function ArticleList() {
  return (
    <section className="py-20 px-5 bg-white">
      <div className="mx-auto max-w-5xl">
        {/* Official regulations */}
        <h2 className="text-xl font-bold text-neutral-900 mb-6">ოფიციალური დოკუმენტები</h2>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20"
        >
          {REGULATIONS.map(item => (
            <motion.a
              key={item.id}
              variants={fadeUp}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-neutral-200 bg-white p-6 hover:border-safety-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-safety-50">
                  <FileText size={17} className="text-safety-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <h3 className="flex-1 text-sm font-semibold text-neutral-900 leading-snug">{item.title}</h3>
                    <ExternalLink size={15} className="shrink-0 text-neutral-400 group-hover:text-safety-600 transition-colors" />
                  </div>
                  <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* Blog articles */}
        <h2 className="text-xl font-bold text-neutral-900 mb-6">სტატიები</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {blogArticles.map((a, i) => (
            <motion.a
              key={i}
              href={a.url}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col rounded-2xl border border-neutral-200 bg-white overflow-hidden hover:border-safety-300 transition-colors"
            >
              <div className="aspect-video bg-gradient-to-br from-safety-50 to-safety-100 flex items-center justify-center">
                <BookOpen size={28} className="text-safety-300" />
              </div>
              <div className="p-5">
                <time className="text-xs text-neutral-400">{a.date}</time>
                <h3 className="mt-1 font-bold text-neutral-900 text-sm leading-snug">{a.title}</h3>
                <p className="mt-2 text-xs text-neutral-500 leading-relaxed">{a.excerpt}</p>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
