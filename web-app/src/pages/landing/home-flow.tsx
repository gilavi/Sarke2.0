import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Kicker, SectionHeading } from './shared';

/**
 * FlowSection — the pinned "ქაღალდიდან PDF-მდე — ოთხ ნაბიჯში" workflow. A sticky
 * device on the left cross-fades between four screens while the reader scrolls the
 * four step blocks on the right; each step owns an IntersectionObserver sentinel
 * that drives the active index. Below `md` it collapses to a normal stacked list
 * with the phone pinned to the top.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { num: '01', title: 'აირჩიე შაბლონი', desc: '10+ მზა შაბლონი — ხარაჩო, ქამარი, ბობკატი, ექსკავატორი. ერთი შეხება და ფორმა მზადაა.' },
  { num: '02', title: 'შეავსე ობიექტზევე', desc: 'მონიშნე პუნქტები, დაამატე GPS ფოტო და კომენტარი — პირდაპირ მოედანზე, ოფლაინაც.' },
  { num: '03', title: 'მოაწერე ხელი', desc: 'ხელმოწერა პირდაპირ ეკრანზე — შემსრულებელი და ხელმძღვანელი, PDF-ში ჩაშენებული.' },
  { num: '04', title: 'მიიღე PDF 30 წამში', desc: 'დაცული, დათარიღებული, SHA256-ით დამოწმებული დოკუმენტი — ინსპექციისთვის მზად.' },
];

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pb-1 pt-3.5 text-[12px] font-bold text-[#141414]">
      <span>9:41</span>
      <span className="text-[10px]">▮▮▮ ▾</span>
    </div>
  );
}
function Row({ done, active, text }: { done?: boolean; active?: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[12px] border bg-white p-2.5" style={active ? { borderColor: '#FF5A1F', background: '#FFF3EE' } : { borderColor: 'rgba(20,20,20,.07)' }}>
      <span className="grid h-5 w-5 flex-none place-items-center rounded-[6px] text-[12px] font-black" style={done ? { background: '#E6FF4D', color: '#1A1A1A' } : { border: '2px solid #c4c3bd' }}>{done ? '✓' : ''}</span>
      <span className="text-[13px]" style={{ color: '#141414', fontWeight: active ? 700 : 400 }}>{text}</span>
    </div>
  );
}
function Foot({ bg, fg, children }: { bg: string; fg: string; children: string }) {
  return (
    <div className="mt-auto px-3.5 pb-4 pt-3">
      <div className="rounded-[13px] py-3 text-center text-[14px] font-extrabold" style={{ background: bg, color: fg }}>{children}</div>
    </div>
  );
}

function FlowScreen({ i }: { i: number }) {
  if (i === 0)
    return (
      <>
        <StatusBar />
        <div className="px-3.5 pb-3 pt-2"><div className="text-[11px] font-semibold text-[#FF5A1F]">შაბლონები</div><div className="text-[17px] font-black text-[#141414]">აირჩიე ტიპი</div></div>
        <div className="flex flex-1 flex-col gap-2 px-3.5">
          <Row active text="ფასადის ხარაჩო" />
          <Row text="უსაფრთხოების ქამარი" />
          <Row text="ბობკატი" />
          <Row text="ექსკავატორი" />
        </div>
        <Foot bg="#1A1A1A" fg="#fff">დაწყება</Foot>
      </>
    );
  if (i === 1)
    return (
      <>
        <StatusBar />
        <div className="px-3.5 pb-3 pt-2"><div className="text-[11px] font-semibold text-[#7a7a72]">შევსება · ხარაჩო №4</div><div className="text-[17px] font-black text-[#141414]">ჩეკლისტი</div></div>
        <div className="flex flex-1 flex-col gap-2 px-3.5">
          <Row done text="ფასადის ხარაჩო" />
          <Row done text="დამცავი ბარიერი" />
          <Row text="ანკერების სიმაგრე" />
          <div className="relative h-[82px] overflow-hidden rounded-[12px] border border-black/[0.06]" style={{ background: 'linear-gradient(135deg,#D8D7CF,#bdbcb4)' }}>
            <div className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF5A1F]" style={{ boxShadow: '0 0 0 6px rgba(255,90,31,.25)' }} />
            <div className="absolute bottom-[7px] left-[7px] rounded-[7px] bg-[#141414]/80 px-2 py-1 font-mono text-[9px] text-white">⌖ GPS ფოტო</div>
          </div>
        </div>
        <Foot bg="#E6FF4D" fg="#1A1A1A">შემდეგი</Foot>
      </>
    );
  if (i === 2)
    return (
      <>
        <StatusBar />
        <div className="px-3.5 pb-3 pt-2"><div className="text-[11px] font-semibold text-[#7a7a72]">დადასტურება</div><div className="text-[17px] font-black text-[#141414]">მოაწერე ხელი</div></div>
        <div className="flex flex-1 flex-col px-3.5 pt-1">
          <div className="flex flex-1 flex-col justify-end rounded-[13px] border border-black/[0.07] bg-white p-3.5">
            <svg width="120" height="58" viewBox="0 0 120 58" fill="none">
              <motion.path d="M6 42 C20 8,30 52,44 30 S70 6,82 36 S104 48,116 16" stroke="#1A1A1A" strokeWidth="2.6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeInOut' }} />
            </svg>
            <div className="mt-1.5 h-px bg-[#c4c3bd]" />
            <div className="mt-1.5 text-[10px] text-[#9a9a93]">შემსრულებელი · გ. მელაძე</div>
          </div>
        </div>
        <Foot bg="#FF5A1F" fg="#fff">დადასტურება</Foot>
      </>
    );
  return (
    <>
      <StatusBar />
      <div className="rounded-b-[22px] px-3.5 pb-3 pt-2" style={{ background: '#FF5A1F', color: '#fff' }}><div className="text-[11px] font-semibold opacity-85">მზადაა</div><div className="text-[17px] font-black text-white">PDF გენერირდა</div></div>
      <div className="flex-1 p-3.5">
        <div className="flex h-full flex-col rounded-[13px] border border-black/[0.07] bg-white p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[#1A1A1A] text-[10px] font-black text-white">PDF</span>
            <div className="text-[12px] font-extrabold text-[#141414]">უსაფრთხოების აქტი</div>
          </div>
          {['90%', '70%', '82%'].map((w, k) => <div key={k} className="mb-2 h-[7px] rounded bg-[#E8E6E0]" style={{ width: w }} />)}
          <div className="mt-auto flex items-center gap-2 text-[11px] font-bold text-[#FF5A1F]"><span>⌖ 41.7151</span><span className="text-[#9a9a93]">· SHA256</span></div>
        </div>
      </div>
      <Foot bg="#1A1A1A" fg="#fff">გაზიარება</Foot>
    </>
  );
}

export function FlowSection() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)); }),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    stepRefs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="bg-offwhite px-5 pb-24 pt-16">
      <div className="mx-auto mb-2 max-w-2xl text-center">
        <Kicker>როგორ მუშაობს</Kicker>
        <SectionHeading className="mt-4">ქაღალდიდან PDF-მდე — ოთხ ნაბიჯში</SectionHeading>
      </div>

      <div className="mx-auto grid max-w-5xl items-start gap-8 md:grid-cols-2 md:gap-16">
        {/* sticky media */}
        <div className="sticky top-24 z-[1] hidden justify-center md:flex" style={{ top: 'calc(50vh - 300px)' }}>
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-[52px]" style={{ background: 'radial-gradient(circle at 50% 38%, rgba(255,90,31,.16), transparent 62%)', filter: 'blur(10px)' }} />
            <div className="relative" style={{ width: 272, height: 556, borderRadius: 46, background: '#0D0D0D', padding: 10, boxShadow: '0 50px 100px rgba(20,20,20,.28)' }}>
              <div className="absolute left-1/2 top-[18px] z-10 h-[22px] w-[88px] -translate-x-1/2 rounded-b-[14px] bg-[#0D0D0D]" />
              <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-[#F2F1EC]">
                <div className="absolute -top-3 right-2 z-[8] rounded-full bg-[#1A1A1A] px-3 py-1.5 font-mono text-[11px] font-semibold text-white" style={{ boxShadow: '0 10px 24px rgba(20,20,20,.22)' }}>{STEPS[active].num} / 04</div>
                <AnimatePresence mode="wait">
                  <motion.div key={active} className="absolute inset-0 flex flex-col" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease: EASE }}>
                    <FlowScreen i={active} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* steps */}
        <div className="flex flex-col">
          {STEPS.map((s, i) => (
            <div
              key={s.num}
              ref={el => (stepRefs.current[i] = el)}
              data-i={i}
              className="flex min-h-[46vh] flex-col justify-center transition-opacity duration-500 md:min-h-[78vh]"
              style={{ opacity: active === i ? 1 : 0.34 }}
            >
              <div className="mb-4 inline-flex items-center gap-2.5 font-mono text-[13px] font-semibold tracking-[0.12em] text-safety-500">
                <span className="h-px w-7 bg-safety-500" />
                {s.num} / 04
              </div>
              <h3 className="mb-4 text-[clamp(26px,3.6vw,40px)] font-black leading-[1.05] tracking-[-0.04em] text-neutral-900">{s.title}</h3>
              <p className="max-w-[40ch] text-[17px] leading-relaxed text-neutral-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
