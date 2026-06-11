import React from 'react';
import { motion } from 'framer-motion';
import { fadeUp, stagger, AppStoreBadge, PhoneMockup, APP_STORE_URL } from './shared';
import { painPoints, steps } from './marketing-data';

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-offwhite" style={{ paddingTop: 112, paddingBottom: 80 }}>
      {/* Orbital rings backdrop — positioned on right half */}
      <div className="pointer-events-none absolute" style={{ right: 'calc(50% - 500px)', top: '50%', transform: 'translateY(-50%)', width: 760, height: 760 }}>
        <div className="absolute inset-0 rounded-full animate-hub-spin" style={{ border: '1.5px dashed rgba(20,20,20,.12)' }} />
        <div className="animate-hub-spin-rev" style={{ position: 'absolute', inset: 90, border: '1.5px solid rgba(20,20,20,.09)', borderRadius: '50%' }} />
        <div className="absolute inset-0 animate-hub-spin">
          <span className="absolute bg-safety-500 rounded-full" style={{ width: 13, height: 13, top: -6, left: '50%' }} />
        </div>
        <div className="animate-hub-spin-rev" style={{ position: 'absolute', inset: 90 }}>
          <span className="absolute rounded-full" style={{ width: 11, height: 11, bottom: -5, left: '50%', background: '#E6FF4D', border: '1px solid rgba(20,20,20,.2)' }} />
        </div>
      </div>

      <div
        className="relative mx-auto"
        style={{ maxWidth: 1280, padding: '36px 56px 72px', display: 'grid', gridTemplateColumns: '1fr 1.08fr', gap: 24, alignItems: 'center', minHeight: 720 }}
      >
        {/* ── Left copy ── */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col">
          <motion.div variants={fadeUp}>
            <span
              className="inline-flex items-center gap-2 text-[13px] font-semibold rounded-full mb-6"
              style={{ color: '#9a4a23', background: 'rgba(255,90,31,.1)', border: '1px solid rgba(255,90,31,.25)', padding: '7px 14px' }}
            >
              <span className="w-[7px] h-[7px] rounded-full bg-safety-500 animate-hub-blink" />
              შრომის უსაფრთხოება ჯიბეში
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            style={{ margin: '0 0 22px', fontSize: 58, lineHeight: 1.02, fontWeight: 900, letterSpacing: '-0.035em', color: '#141414' }}
          >
            მთელი<br />
            უსაფრთხოება —<br />
            <span className="text-safety-500">ერთ აპში.</span>
          </motion.h1>

          <motion.p variants={fadeUp} style={{ margin: '0 0 34px', fontSize: 19, lineHeight: 1.6, color: '#56564f', maxWidth: '42ch' }}>
            ინსტრუქტაჟი, რისკის შეფასება და დოკუმენტები — ველზე მომუშავე ადამიანის ხელში. მარტივად, ქართულად, ყოველდღე.
          </motion.p>

          <motion.div variants={fadeUp} className="flex gap-3.5 items-center mb-10">
            <AppStoreBadge href={APP_STORE_URL} />
            <button
              onClick={() => document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 transition-colors"
              style={{ border: '1px solid rgba(20,20,20,.2)', color: '#141414', fontWeight: 600, fontSize: 17, padding: '16px 26px', borderRadius: 14, background: 'transparent' }}
            >
              დემოს ნახვა
            </button>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center gap-4">
            <div className="flex">
              {[{ bg: '#C9C8C0' }, { bg: '#B0AFA6' }, { bg: '#FF5A1F', label: '+' }].map((a, i) => (
                <span
                  key={i}
                  style={{ width: 38, height: 38, borderRadius: '50%', background: a.bg, border: '2px solid #F2F1EC', marginRight: i < 2 ? -12 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}
                >
                  {a.label}
                </span>
              ))}
            </div>
            <span style={{ fontSize: 14, color: '#7a7a72' }}>450+ კომპანია ენდობა Hubble-ს</span>
          </motion.div>
        </motion.div>

        {/* ── Right: phone + web dashboard ── */}
        <div className="relative" style={{ height: 660 }}>
          {/* Web dashboard panel (behind, different float rhythm) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="animate-hub-float-b"
            style={{ position: 'absolute', right: 8, top: 60, width: 430, borderRadius: 16, overflow: 'hidden', background: '#fff', border: '1px solid rgba(20,20,20,.1)', boxShadow: '0 40px 80px rgba(20,20,20,.18)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 14px', borderBottom: '1px solid rgba(20,20,20,.07)', background: '#F7F6F2' }}>
              {['#E0DFD8', '#E0DFD8', '#E0DFD8'].map((c, i) => (
                <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
              ))}
              <span style={{ marginLeft: 10, fontSize: 11, color: '#9a9a93', fontFamily: '"JetBrains Mono", monospace' }}>app.hubble.ge/dashboard</span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: '#7a7a72', marginBottom: 3 }}>ობიექტების მიმოხილვა</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#141414', marginBottom: 14 }}>დაცულობა 98.4%</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 88 }}>
                {[54, 70, 62, 88, 76, 92, 68].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 3 ? '#FF5A1F' : i === 5 ? '#141414' : '#E0DFD8', borderRadius: '6px 6px 0 0' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <div style={{ flex: 1, background: '#F2F1EC', borderRadius: 10, padding: '9px 11px' }}>
                  <div style={{ fontSize: 11, color: '#7a7a72' }}>აქტიური</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#141414' }}>24 ობიექტი</div>
                </div>
                <div style={{ flex: 1, background: '#F2F1EC', borderRadius: 10, padding: '9px 11px' }}>
                  <div style={{ fontSize: 11, color: '#7a7a72' }}>ღია რისკი</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#FF5A1F' }}>3</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Phone (foreground, primary float) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="animate-hub-float"
            style={{ position: 'absolute', left: 0, top: 0, zIndex: 4 }}
          >
            <PhoneMockup />
          </motion.div>

          {/* Toast notification */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="animate-hub-float-b"
            style={{ position: 'absolute', left: -12, bottom: 54, zIndex: 6, background: '#fff', border: '1px solid rgba(20,20,20,.08)', borderRadius: 14, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11, boxShadow: '0 22px 44px rgba(20,20,20,.16)' }}
          >
            <span style={{ width: 34, height: 34, borderRadius: 10, background: '#E6FF4D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#1A1A1A' }}>✓</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#141414' }}>ინსტრუქტაჟი დასრულდა</div>
              <div style={{ fontSize: 11, color: '#9a9a93' }}>ობიექტი №4 · ახლახ</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── App screens band ─────────────────────────────────────────────────────────
function AppScreenPhone({ header, headerBg, children }: { header: React.ReactNode; headerBg?: string; children: React.ReactNode }) {
  return (
    <div style={{ width: 264, height: 540, borderRadius: 42, background: '#000', padding: 10, boxShadow: '0 36px 70px rgba(0,0,0,.45)', margin: '0 auto' }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 34, overflow: 'hidden', background: '#F2F1EC', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 18px 12px', background: headerBg || 'transparent', color: headerBg ? '#fff' : undefined }}>
          {header}
        </div>
        {children}
      </div>
    </div>
  );
}

export function AppScreensBand() {
  return (
    <section className="bg-offwhite pb-24 px-5">
      <div className="mx-auto" style={{ maxWidth: 1280 }}>
        <div className="bg-graphite rounded-[30px] relative overflow-hidden" style={{ padding: '64px 40px', display: 'flex', gap: 36, justifyContent: 'center', alignItems: 'flex-start' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

          {/* Screen A: Checklist */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0 }} className="relative text-center" style={{ position: 'relative' }}>
            <AppScreenPhone header={<><div style={{ fontSize: 12, opacity: 0.85 }}>ინსტრუქტაჟი</div><div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>სიმაღლეზე მუშაობა</div></>} headerBg="#FF5A1F">
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                {[
                  { done: true, text: 'დამცავი ღვედი შემოწმებულია' },
                  { done: true, text: 'ჩაფხუტი და სათვალე' },
                  { done: false, text: 'ხარაჩოს მდგრადობა' },
                  { done: false, text: 'სიგნალიზაცია აქტიური' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid rgba(20,20,20,.07)', borderRadius: 13, padding: 11 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 7, background: row.done ? '#E6FF4D' : 'transparent', border: row.done ? 'none' : '2px solid #c4c3bd', color: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>
                      {row.done ? '✓' : ''}
                    </span>
                    <span style={{ fontSize: 13, color: '#141414', textAlign: 'left' }}>{row.text}</span>
                  </div>
                ))}
                <div style={{ marginTop: 'auto', background: '#1A1A1A', color: '#fff', borderRadius: 13, padding: 13, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>დადასტურება</div>
              </div>
            </AppScreenPhone>
            <div className="mt-5 text-white text-base font-extrabold">ინსტრუქტაჟი</div>
            <div style={{ color: '#8a8a82', fontSize: 13, maxWidth: 230, margin: '6px auto 0' }}>ციფრული ჩეკლისტი, ხელმოწერით — ქაღალდის გარეშე.</div>
          </motion.div>

          {/* Screen B: Risk map (staggered up) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }} className="text-center" style={{ transform: 'translateY(-22px)' }}>
            <AppScreenPhone header={<><div style={{ fontSize: 12, color: '#7a7a72' }}>ობიექტი №4</div><div style={{ fontSize: 18, fontWeight: 900, color: '#141414', letterSpacing: '-0.02em' }}>რისკის რუკა</div></>}>
              <div style={{ margin: '0 16px', height: 180, borderRadius: 16, background: 'linear-gradient(135deg,#E8E7E0,#D8D7CF)', position: 'relative', overflow: 'hidden', border: '1px solid rgba(20,20,20,.06)' }}>
                <div style={{ position: 'absolute', left: 34, top: 40, width: 18, height: 18, borderRadius: '50%', background: '#FF5A1F', boxShadow: '0 0 0 6px rgba(255,90,31,.2)' }} />
                <div style={{ position: 'absolute', right: 46, top: 84, width: 16, height: 16, borderRadius: '50%', background: '#E6FF4D', boxShadow: '0 0 0 6px rgba(230,255,77,.3)' }} />
                <div style={{ position: 'absolute', left: 80, bottom: 34, width: 14, height: 14, borderRadius: '50%', background: '#1A1A1A' }} />
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { color: '#FF5A1F', text: 'მაღალი — ელ. კვანძი', time: 'ახლა' },
                  { color: '#E6FF4D', text: 'საშუალო — სველი იატაკი', time: '1სთ' },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid rgba(20,20,20,.07)', borderRadius: 12, padding: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#141414', flex: 1, textAlign: 'left' }}>{r.text}</span>
                    <span style={{ fontSize: 11, color: '#9a9a93' }}>{r.time}</span>
                  </div>
                ))}
              </div>
            </AppScreenPhone>
            <div className="mt-5 text-white text-base font-extrabold">რისკის შეფასება</div>
            <div style={{ color: '#8a8a82', fontSize: 13, maxWidth: 230, margin: '6px auto 0' }}>ცოცხალი რუკა — სად, რა, რამდენად საშიში.</div>
          </motion.div>

          {/* Screen C: Documents */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} className="text-center">
            <AppScreenPhone header={<><div style={{ fontSize: 12, color: '#7a7a72' }}>არქივი</div><div style={{ fontSize: 18, fontWeight: 900, color: '#141414', letterSpacing: '-0.02em' }}>დოკუმენტები</div></>}>
              <div style={{ padding: '4px 16px 14px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                {[
                  { icon: 'PDF', iconBg: 'rgba(255,90,31,.12)', iconColor: '#FF5A1F', title: 'უსაფრთხოების ჟურნალი', sub: 'განახლდა დღეს' },
                  { icon: '▤', iconBg: 'rgba(20,20,20,.08)', iconColor: '#141414', title: 'ინსტრუქტაჟის აქტი', sub: '42 ხელმოწერა' },
                  { icon: '▤', iconBg: 'rgba(20,20,20,.08)', iconColor: '#141414', title: 'რისკის რეესტრი', sub: 'PDF · 1.2MB' },
                ].map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', border: '1px solid rgba(20,20,20,.07)', borderRadius: 13, padding: 11 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: d.iconBg, color: d.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{d.icon}</span>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#141414' }}>{d.title}</div>
                      <div style={{ fontSize: 11, color: '#9a9a93' }}>{d.sub}</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 'auto', background: '#E6FF4D', color: '#1A1A1A', borderRadius: 13, padding: 13, textAlign: 'center', fontSize: 14, fontWeight: 800 }}>ექსპორტი</div>
              </div>
            </AppScreenPhone>
            <div className="mt-5 text-white text-base font-extrabold">დოკუმენტები</div>
            <div style={{ color: '#8a8a82', fontSize: 13, maxWidth: 230, margin: '6px auto 0' }}>ყველაფერი ერთ ადგილას — ინსპექციისთვის მზად.</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Pain section ─────────────────────────────────────────────────────────────
export function PainSection() {
  return (
    <section className="bg-graphite-900 py-24 px-5">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-3xl sm:text-4xl font-bold text-white mb-14"
        >
          სიტუაცია ნაცნობია?
        </motion.h2>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {painPoints.map(p => (
            <motion.div key={p.text} variants={fadeUp} className="rounded-2xl border border-graphite-700 bg-graphite-800 p-7">
              <div className="text-4xl mb-4">{p.emoji}</div>
              <p className="text-concrete text-base leading-relaxed font-medium">{p.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Transition to solutions ───────────────────────────────────────────────────
export function Transition() {
  return (
    <section className="bg-graphite-900 pb-24 px-5">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true }}
          className="h-px bg-gradient-to-r from-transparent via-safety-500 to-transparent mb-8"
        />
        <motion.p
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-xl font-semibold text-safety-400"
        >
          HUBBLE ამოხსნის ამ პრობლემებს
        </motion.p>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-5 bg-white">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-3xl sm:text-4xl font-bold text-neutral-900 mb-16"
        >
          როგორ მუშაობს
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="flex flex-col gap-4"
            >
              <div className="text-6xl font-black text-safety-100 leading-none select-none">{s.n}</div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 mb-1">{s.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
