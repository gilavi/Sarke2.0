import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { routes } from '@/app/routes';
import { AppStoreBadge, PlayStoreBadge, APP_STORE_URL } from './shared';
import { ctaBand } from './marketing-data';

/**
 * Reusable bottom-of-page conversion band. `variant="download"` shows the app
 * store badges (Home); default shows register + contact buttons (other pages).
 */
export function CTABand({ variant = 'default' }: { variant?: 'default' | 'download' }) {
  return (
    <section className="bg-safety-700 py-24 px-5">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">{ctaBand.title}</h2>
          <p className="text-white/80 text-lg mb-10">{ctaBand.subtitle}</p>

          {variant === 'download' ? (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <AppStoreBadge href={APP_STORE_URL} light />
              <PlayStoreBadge light />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to={routes.register} className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-safety-700 hover:bg-safety-50 transition-colors">
                დაიწყე უფასოდ <ArrowRight size={16} />
              </Link>
              <Link to={routes.contact} className="inline-flex items-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                დაგვიკავშირდი
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
