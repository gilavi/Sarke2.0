/** Windows XP desktop and phone app visuals for the Mess Section morph. */

export function XPDesktop() {
  const docIcon = (headerBg: string) => (
    <div style={{ position: 'relative', width: 34, height: 42 }}>
      <div style={{ position: 'absolute', inset: 0, background: '#fff', border: '1px solid #bdbcb4', borderRadius: 3, boxShadow: '0 1px 2px rgba(0,0,0,.3)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 9, background: headerBg, borderRadius: '2px 2px 0 0' }} />
      <div style={{ position: 'absolute', top: 15, left: 5, right: 5, height: 2, background: '#dcdbd3' }} />
      <div style={{ position: 'absolute', top: 20, left: 5, right: 9, height: 2, background: '#dcdbd3' }} />
      <div style={{ position: 'absolute', top: 25, left: 5, right: 7, height: 2, background: '#dcdbd3' }} />
    </div>
  );

  const folderIcon = () => (
    <div style={{ position: 'relative', width: 46, height: 36 }}>
      <div style={{ position: 'absolute', top: 2, left: 3, width: 20, height: 9, background: '#e8aa33', borderRadius: '3px 5px 0 0' }} />
      <div style={{ position: 'absolute', top: 8, left: 0, width: 46, height: 28, background: 'linear-gradient(#ffd877,#f1b53e)', border: '1px solid #d59a1f', borderRadius: '3px 4px 4px 4px' }} />
      <div style={{ position: 'absolute', top: 8, left: 0, width: 46, height: 9, background: 'linear-gradient(rgba(255,255,255,.6),rgba(255,255,255,0))', borderRadius: '3px 4px 0 0' }} />
    </div>
  );

  const iconStyle = { width: 96, display: 'flex' as const, flexDirection: 'column' as const, alignItems: 'center' as const, gap: 5 };
  const labelStyle = { fontSize: 11, color: '#fff', textAlign: 'center' as const, lineHeight: 1.2, textShadow: '0 1px 2px rgba(0,0,0,.75)', wordBreak: 'break-word' as const };

  return (
    <div data-win style={{ position: 'absolute', width: 'min(1140px,90vw)', height: 'min(660px,100%)', borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(0,0,0,.35)', boxShadow: '0 50px 120px rgba(0,0,0,.6)', willChange: 'transform,opacity,filter', background: 'linear-gradient(#2f63b8 0%, #5a8fd6 40%, #9fc3ea 60%, #cfe2f2 66%)' }}>
      {/* Bliss hills */}
      <div style={{ position: 'absolute', left: '-12%', right: '-12%', bottom: 30, height: '48%', background: 'linear-gradient(#a4d05a,#5d9a2f 58%,#4a832a)', borderRadius: '50% 50% 0 0 / 90% 90% 0 0' }} />
      <div style={{ position: 'absolute', left: '-22%', right: '-6%', bottom: 30, height: '31%', background: 'linear-gradient(#92c64e,#56882b)', borderRadius: '50% 42% 0 0 / 100% 78% 0 0', opacity: 0.92 }} />
      {/* Clouds */}
      <div style={{ position: 'absolute', top: '9%', left: '15%', width: 170, height: 52, background: 'radial-gradient(closest-side, rgba(255,255,255,.92), rgba(255,255,255,0))', filter: 'blur(2px)' }} />
      <div style={{ position: 'absolute', top: '17%', right: '18%', width: 210, height: 62, background: 'radial-gradient(closest-side, rgba(255,255,255,.82), rgba(255,255,255,0))', filter: 'blur(3px)' }} />
      {/* Desktop icons */}
      <div style={{ position: 'absolute', top: 20, left: 20, display: 'grid', gridAutoFlow: 'column', gridTemplateRows: 'repeat(4, auto)', gap: '16px 10px' }}>
        <div style={{ ...iconStyle, padding: '5px 4px', background: 'rgba(49,106,197,.3)', border: '1px dotted rgba(255,255,255,.7)', borderRadius: 4 }}>
          {folderIcon()}<span style={labelStyle}>ფაილები</span>
        </div>
        <div style={iconStyle}>{docIcon('#3a6fc4')}<span style={labelStyle}>შემოწმების აქტი 123523423ასდსადსა.docx</span></div>
        <div style={iconStyle}>{docIcon('#d14b3c')}<span style={labelStyle}>ახალი დოკუმენტი (3) საბოლოო_FINAL_v2.pdf</span></div>
        <div style={iconStyle}>{docIcon('#3a6fc4')}<span style={labelStyle}>asdf фыв инструктаж.docx</span></div>
        <div style={iconStyle}>{docIcon('#3a8f3a')}<span style={labelStyle}>უსახელო ცხრილი.xlsx</span></div>
        <div style={iconStyle}>
          <div style={{ position: 'relative', width: 38, height: 32, background: '#fff', border: '1px solid #bdbcb4', borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,.3)' }}>
            <div style={{ position: 'absolute', inset: 2, background: 'linear-gradient(#bfe0f5,#eaf6ff)' }} />
            <div style={{ position: 'absolute', right: 5, top: 4, width: 7, height: 7, borderRadius: '50%', background: '#ffd23f' }} />
            <div style={{ position: 'absolute', left: 2, right: 2, bottom: 2, height: 12, background: 'linear-gradient(#7cb83f,#4f8f27)' }} />
          </div>
          <span style={labelStyle}>ეკრანის ანაბეჭდი 2024-01-12.png</span>
        </div>
        <div style={iconStyle}>{folderIcon()}<span style={labelStyle}>Новая папка (2)</span></div>
        <div style={iconStyle}>{docIcon('#3a6fc4')}<span style={labelStyle}>ჩემი დოკუმენტები FINAL FINAL.docx</span></div>
      </div>
      {/* Luna taskbar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 30, display: 'flex', alignItems: 'stretch', background: 'linear-gradient(#3f8cf3 0%, #2b6ed6 9%, #2461cf 92%, #1c4fb0)', borderTop: '1px solid #6aa7f8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: '100%', padding: '0 18px 0 11px', background: 'linear-gradient(#67c267,#3f9b3f 52%,#2e7d2e)', borderRadius: '0 11px 11px 0', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45)' }}>
          <span style={{ width: 17, height: 17, borderRadius: 5, background: 'radial-gradient(circle at 32% 30%,#fff,#d6efd6)' }} />
          <span style={{ fontStyle: 'italic', fontWeight: 800, fontSize: 14, color: '#fff', textShadow: '0 1px 1px rgba(0,0,0,.45)' }}>start</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', background: 'linear-gradient(#2f7bdf,#1f5bc0)', borderLeft: '1px solid #1c4fae', color: '#fff', fontSize: 12 }}>
          <span style={{ width: 11, height: 11, borderRadius: 2, background: 'rgba(255,255,255,.7)' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(255,255,255,.7)' }} />
          <span style={{ fontWeight: 600, letterSpacing: '.02em' }}>18:43</span>
        </div>
      </div>
    </div>
  );
}

function ActRow({ emoji, title, sub, status, date, statusBg, iconBg }: { emoji: string; title: string; sub: string; status: string; date: string; statusBg: string; iconBg: string }) {
  return (
    <div data-doc style={{ opacity: 0, transform: 'translateY(12px)', display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid rgba(20,20,20,.06)', borderRadius: 16, padding: '11px 12px', marginBottom: 9 }}>
      <span style={{ position: 'relative', flexShrink: 0, width: 42, height: 42, borderRadius: 13, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>
        {emoji}
        <span style={{ position: 'absolute', right: -3, bottom: -3, width: 17, height: 17, borderRadius: '50%', background: statusBg, border: '2px solid #fff', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{status}</span>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#a3a39b' }}>შემოწმება</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#141414', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#a3a39b' }}>{sub}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 11, color: '#a3a39b' }}>{date}</div>
        <div style={{ fontSize: 16, color: '#c4c3bd', lineHeight: 1 }}>›</div>
      </div>
    </div>
  );
}

export function PhoneApp() {
  const monoLabel = { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#a3a39b', padding: '6px 4px' };
  return (
    <div data-app style={{ position: 'absolute', width: 324, height: 'min(636px,100%)', borderRadius: 46, background: '#000', padding: 11, boxShadow: '0 60px 120px rgba(0,0,0,.62)', opacity: 0, transform: 'scale(.46)', willChange: 'transform,opacity' }}>
      <div style={{ position: 'absolute', top: 21, left: '50%', transform: 'translateX(-50%)', width: 106, height: 25, background: '#000', borderRadius: '0 0 16px 16px', zIndex: 4 }} />
      <div style={{ width: '100%', height: '100%', borderRadius: 37, overflow: 'hidden', background: '#F4F3EE', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px 0', fontSize: 14, fontWeight: 700, color: '#141414', flexShrink: 0 }}>
          <span>18:43</span><span style={{ fontSize: 11 }}>▮▮▮ ▾ ▰</span>
        </div>
        <div style={{ padding: '13px 22px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#141414', letterSpacing: '-.02em' }}>სალამო, გიორგი</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px 6px', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3c3c38', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF5A1F' }} />ბოლო აქტები
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1F8A5B' }}>ყველა</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: '0 16px', minHeight: 0 }}>
          <div data-doc style={{ opacity: 0, transform: 'translateY(12px)', ...monoLabel }}>დღეს</div>
          <ActRow emoji="🦺" title="დამცავი ქამრები" sub="Kheladze testing" status="✓" date="2 ივნ" statusBg="#1F8A5B" iconBg="rgba(255,90,31,.12)" />
          <ActRow emoji="🏗️" title="ფასადის ხარაჩო" sub="Kheladze testing" status="⏳" date="2 ივნ" statusBg="#E5A23B" iconBg="rgba(230,255,77,.3)" />
          <div data-doc style={{ opacity: 0, transform: 'translateY(12px)', ...monoLabel }}>გუშინ</div>
          <ActRow emoji="🔗" title="ამწე მოწყ. / სლინგი" sub="Kheladze testing" status="✓" date="29 მაი" statusBg="#1F8A5B" iconBg="rgba(20,20,20,.06)" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', padding: '9px 14px 15px', borderTop: '1px solid rgba(20,20,20,.07)', background: '#fff', flexShrink: 0 }}>
          {[['⌂', 'მთავარი', '#1F8A5B'], ['▭', 'პროექტები', '#a3a39b'], ['▤', 'რეგულაციები', '#a3a39b'], ['▦', 'კალენდარი', '#a3a39b'], ['⋯', 'მეტი', '#a3a39b']].map(([icon, label, color]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 9, fontWeight: label === 'მთავარი' ? 700 : 400 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
