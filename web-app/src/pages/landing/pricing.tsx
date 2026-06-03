import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';
import { routes } from '@/app/routes';
import { freeFeatures, proFeatures, pricingComparison } from './marketing-data';

// ─── Pricing cards ──────────────────────────────────────────────────────────────
export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-5 bg-white pt-32">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">მარტივი ფასი</h1>
          <p className="text-neutral-500">არანაირი დამალული საკომისიო</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-2xl border-2 border-neutral-200 bg-white p-8"
          >
            <p className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-1">უფასო</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-black text-neutral-900">₾0</span>
              <span className="text-neutral-500 text-sm">/ თვეში</span>
            </div>
            <ul className="space-y-3 mb-8">
              {freeFeatures.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-neutral-700">
                  <Check size={16} className="text-safety-500 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link to={routes.register} className="block w-full rounded-xl border-2 border-neutral-200 py-3 text-center text-sm font-semibold text-neutral-700 hover:border-safety-300 hover:text-safety-700 transition-colors">
              დაიწყე უფასოდ
            </Link>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="rounded-2xl border-2 border-safety-500 bg-safety-500 p-8 relative overflow-hidden"
          >
            <span className="absolute top-4 right-4 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white uppercase tracking-wide">
              პოპულარული
            </span>
            <p className="text-sm font-semibold text-safety-200 uppercase tracking-wide mb-1">PRO</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-black text-white">₾19</span>
              <span className="text-safety-200 text-sm">/ თვეში</span>
            </div>
            <ul className="space-y-3 mb-8">
              {proFeatures.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-white">
                  <Check size={16} className="text-safety-200 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link to={routes.register} className="block w-full rounded-xl bg-white py-3 text-center text-sm font-semibold text-safety-700 hover:bg-safety-50 transition-colors">
              PRO-ს სცადე
            </Link>
            <p className="mt-3 text-center text-xs text-safety-200">BOG-ით გადახდა</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Comparison table ─────────────────────────────────────────────────────────────
function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={16} className="mx-auto text-safety-500" />;
  if (value === false) return <Minus size={16} className="mx-auto text-neutral-300" />;
  return <span className="text-sm text-neutral-700">{value}</span>;
}

export function PricingComparison() {
  return (
    <section className="py-24 px-5 bg-offwhite">
      <div className="mx-auto max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-2xl sm:text-3xl font-bold text-neutral-900 mb-10"
        >
          დეტალური შედარება
        </motion.h2>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-5 py-4 text-left font-semibold text-neutral-700">ფუნქცია</th>
                <th className="px-5 py-4 text-center font-semibold text-neutral-700 w-28">უფასო</th>
                <th className="px-5 py-4 text-center font-semibold text-safety-700 w-28">PRO</th>
              </tr>
            </thead>
            <tbody>
              {pricingComparison.map((row, i) => (
                <tr key={row.feature} className={i % 2 ? 'bg-neutral-50/50' : ''}>
                  <td className="px-5 py-3.5 text-neutral-700">{row.feature}</td>
                  <td className="px-5 py-3.5 text-center"><Cell value={row.free} /></td>
                  <td className="px-5 py-3.5 text-center"><Cell value={row.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-center text-sm text-neutral-500">
          <X size={14} className="inline -mt-0.5 mr-1 text-neutral-400" />
          5-ზე მეტი სპეციალისტისთვის — <a href="mailto:hello@hubble.ge" className="text-safety-600 hover:underline">კორპორატიული ტარიფი</a>
        </p>
      </div>
    </section>
  );
}
