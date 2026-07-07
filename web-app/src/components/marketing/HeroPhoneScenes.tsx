import { motion } from 'framer-motion';

/**
 * The four "living" hero screens + their floating-chip payloads, consumed by
 * `HeroPhone`. Split out to keep the stage shell under the component line target.
 * Purely presentational mock UI — `aria-hidden` is applied by the parent stage.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── per-scene chips ──────────────────────────────────────────────────────────
export const CHIP1 = [
  { i: '✓', t: 'PDF გენერირდა', s: '30 წამში', bg: '#E6FF4D', fg: '#1A1A1A' },
  { i: '✓', t: '42 ხელმოწერა', s: 'ინსტრუქტაჟი დასრულდა', bg: '#FF5A1F', fg: '#fff' },
  { i: '▦', t: '98.4% დაცული', s: 'ობიექტები მონიტორინგზე', bg: '#1A1A1A', fg: '#E6FF4D' },
  { i: '✓', t: 'ხელმოწერილია', s: 'ბრძანება №12-უ', bg: '#FF5A1F', fg: '#fff' },
];
export const CHIP2 = [
  { i: '⌖', t: 'GPS მიმაგრებულია' },
  { i: '✓', t: '42/42 დაესწრო' },
  { i: '▲', t: '+12% კვირაში' },
  { i: '✓', t: 'დამტკიცებულია' },
];

// ─── screen primitives ────────────────────────────────────────────────────────
function Row({ done, text }: { done?: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[13px] border border-black/[0.07] bg-white p-3">
      <span
        className="grid h-[22px] w-[22px] flex-none place-items-center rounded-[7px] text-[13px] font-black"
        style={done ? { background: '#E6FF4D', color: '#1A1A1A' } : { border: '2px solid #c4c3bd' }}
      >
        {done ? '✓' : ''}
      </span>
      <span className="text-[13px] text-[#141414]">{text}</span>
    </div>
  );
}
function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pb-1 pt-3.5 text-[12px] font-bold text-[#141414]">
      <span>9:41</span>
      <span className="text-[10px]">▮▮▮ ▾</span>
    </div>
  );
}
function Head({ ek, ti, ekColor = '#7a7a72' }: { ek: string; ti: string; ekColor?: string }) {
  return (
    <div className="px-[18px] pb-3 pt-2">
      <div className="text-[11px] font-semibold" style={{ color: ekColor }}>{ek}</div>
      <div className="mt-0.5 text-[19px] font-black tracking-[-0.02em] text-[#141414]">{ti}</div>
    </div>
  );
}

// ─── the four scenes ──────────────────────────────────────────────────────────
function SceneAct() {
  return (
    <>
      <StatusBar />
      <div className="rounded-b-[22px] px-[18px] pb-3 pt-2" style={{ background: '#FF5A1F', color: '#fff' }}>
        <div className="text-[11px] font-semibold opacity-85">შემოწმების აქტი</div>
        <div className="mt-0.5 text-[19px] font-black tracking-[-0.02em] text-white">ხარაჩო · ობიექტი №4</div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <Row done text="ფასადის ხარაჩო შემოწმდა" />
        <Row done text="დამცავი ბარიერი" />
        <Row done text="GPS ფოტო · 6 ცალი" />
        <div className="flex items-center gap-2.5 rounded-[13px] bg-[#1A1A1A] p-3">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] text-[15px] font-black" style={{ background: '#E6FF4D', color: '#1A1A1A' }}>✓</span>
          <div className="flex-1">
            <div className="text-[13px] font-extrabold text-white">ხელმოწერილია</div>
            <div className="font-mono text-[10px] text-[#b8b8b0]">SHA256 · #HB-2418</div>
          </div>
        </div>
      </div>
      <div className="mt-auto px-4 pb-[18px] pt-3">
        <div className="rounded-[13px] bg-[#1A1A1A] py-3 text-center text-[14px] font-extrabold text-white">PDF · 30წმ</div>
      </div>
    </>
  );
}
function SceneBriefing() {
  return (
    <>
      <StatusBar />
      <Head ek="ინსტრუქტაჟი" ti="სიმაღლეზე მუშაობა" ekColor="#FF5A1F" />
      <div className="flex flex-1 flex-col gap-2.5 px-4">
        <Row done text="დამცავი ღვედი შემოწმდა" />
        <Row done text="ჩაფხუტი და სათვალე" />
        <Row text="ხარაჩოს მდგრადობა" />
        <Row text="სიგნალიზაცია აქტიური" />
        <div className="mt-1 flex items-center gap-2.5 px-0.5">
          <div className="flex">
            <span className="h-6 w-6 rounded-full border-2 border-[#F2F1EC] bg-[#C9C8C0]" />
            <span className="-ml-2 h-6 w-6 rounded-full border-2 border-[#F2F1EC] bg-[#B0AFA6]" />
            <span className="-ml-2 grid h-6 w-6 place-items-center rounded-full border-2 border-[#F2F1EC] bg-[#FF5A1F] text-[9px] font-extrabold text-white">+39</span>
          </div>
          <span className="text-[12px] text-[#7a7a72]">42 ხელმოწერა</span>
        </div>
      </div>
      <div className="mt-auto px-4 pb-[18px] pt-3">
        <div className="rounded-[13px] py-3 text-center text-[14px] font-extrabold" style={{ background: '#E6FF4D', color: '#1A1A1A' }}>დადასტურება</div>
      </div>
    </>
  );
}
function SceneReport() {
  const bars = [50, 68, 58, 90, 74, 96];
  return (
    <>
      <StatusBar />
      <Head ek="ობიექტების მიმოხილვა" ti="რეპორტი" />
      <div className="flex-1 px-4 pt-1.5">
        <div className="text-[30px] font-black tracking-[-0.03em] text-[#141414]">98.4%</div>
        <div className="mb-3.5 text-[12px] text-[#7a7a72]">საშუალო დაცულობა</div>
        <div className="mb-3.5 flex h-24 items-end gap-[7px]">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t-[5px]"
              style={{ height: `${h}%`, background: i === 3 ? '#FF5A1F' : i === 5 ? '#1A1A1A' : '#E0DFD8', transformOrigin: 'bottom' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: EASE }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-[12px] border border-black/[0.07] bg-white p-2.5">
            <div className="text-[11px] text-[#7a7a72]">აქტიური</div>
            <div className="text-[17px] font-black text-[#141414]">24</div>
          </div>
          <div className="flex-1 rounded-[12px] border border-black/[0.07] bg-white p-2.5">
            <div className="text-[11px] text-[#7a7a72]">ღია რისკი</div>
            <div className="text-[17px] font-black text-[#FF5A1F]">3</div>
          </div>
        </div>
      </div>
      <div className="mt-auto px-4 pb-[18px] pt-3">
        <div className="rounded-[13px] bg-[#1A1A1A] py-3 text-center text-[14px] font-extrabold text-white">ექსპორტი PDF</div>
      </div>
    </>
  );
}
function SceneOrder() {
  return (
    <>
      <StatusBar />
      <div className="rounded-b-[22px] px-[18px] pb-3 pt-2" style={{ background: '#1A1A1A', color: '#fff' }}>
        <div className="font-mono text-[11px] text-[#b8b8b0]">ბრძანება №12-უ · 2026</div>
        <div className="mt-0.5 text-[19px] font-black tracking-[-0.02em] text-white">შრომის უსაფრთხოება</div>
      </div>
      <div className="flex-1 p-4">
        <div className="flex h-full flex-col rounded-[14px] border border-black/[0.07] bg-white p-4">
          {['75%', '92%', '60%', '84%'].map((w, i) => (
            <div key={i} className="mb-2.5 h-2 rounded bg-[#E8E6E0]" style={{ width: w }} />
          ))}
          <div className="mt-auto flex items-end justify-between">
            <div>
              <svg width="92" height="40" viewBox="0 0 92 40" fill="none">
                <motion.path
                  d="M4 28 C14 6, 20 36, 30 20 S46 4, 54 24 S70 34, 88 12"
                  stroke="#1A1A1A" strokeWidth="2.4" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeInOut', delay: 0.2 }}
                />
              </svg>
              <div className="mt-0.5 h-px w-[84px] bg-[#c4c3bd]" />
              <div className="mt-[3px] text-[9px] text-[#9a9a93]">ხელმძღვანელი</div>
            </div>
            <motion.div
              className="grid h-12 w-12 place-items-center rounded-full text-center text-[8px] font-extrabold leading-[1.05]"
              style={{ border: '2px solid #FF5A1F', color: '#FF5A1F', rotate: -12 }}
              initial={{ opacity: 0, scale: 1.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
            >
              დამტ-კიცებ.
            </motion.div>
          </div>
        </div>
      </div>
      <div className="mt-auto px-4 pb-[18px] pt-3">
        <div className="rounded-[13px] py-3 text-center text-[14px] font-extrabold" style={{ background: '#FF5A1F', color: '#fff' }}>ხელმოწერა</div>
      </div>
    </>
  );
}

export const SCENES = [SceneAct, SceneBriefing, SceneReport, SceneOrder];
