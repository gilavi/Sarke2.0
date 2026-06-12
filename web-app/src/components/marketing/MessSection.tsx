import { useEffect, useRef, useCallback } from 'react';
import { XPDesktop, PhoneApp } from './MessSectionVisuals';

function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Scroll-driven morph: Windows XP desktop (chaos) → Hubble app (organized).
 * Section is 320vh tall; the inner stage is sticky so the animation plays
 * across the full scroll distance.
 */
export function MessSection() {
  const trackRef = useRef<HTMLElement>(null);

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const p = total > 0 ? clamp01(-rect.top / total) : 0;

    const win = track.querySelector<HTMLElement>('[data-win]');
    const app = track.querySelector<HTMLElement>('[data-app]');
    const docs = track.querySelectorAll<HTMLElement>('[data-doc]');
    const heads = track.querySelectorAll<HTMLElement>('[data-head]');
    const hint = track.querySelector<HTMLElement>('[data-hint]');
    const bar = track.querySelector<HTMLElement>('[data-bar]');

    if (win) {
      const se = ease(clamp01(p / 0.62));
      win.style.transform = `scale(${1 - 0.74 * se})`;
      win.style.opacity = (1 - clamp01((p - 0.46) / 0.16)).toFixed(3);
      win.style.filter = `blur(${9 * clamp01((p - 0.44) / 0.18)}px)`;
    }
    if (app) {
      const pe = ease(clamp01((p - 0.28) / 0.5));
      app.style.opacity = clamp01((p - 0.42) / 0.2).toFixed(3);
      app.style.transform = `scale(${0.46 + 0.54 * pe})`;
    }
    docs.forEach((d, i) => {
      const e = clamp01((p - (0.66 + i * 0.035)) / 0.13);
      d.style.opacity = e.toFixed(3);
      d.style.transform = `translateY(${(1 - e) * 12}px)`;
    });
    if (heads[0] && heads[1]) {
      const after = p >= 0.5;
      heads[0].style.opacity = after ? '0' : '1';
      heads[0].style.transform = after ? 'translateY(-16px)' : 'translateY(0)';
      heads[1].style.opacity = after ? '1' : '0';
      heads[1].style.transform = after ? 'translateY(0)' : 'translateY(16px)';
    }
    if (hint) hint.style.opacity = p > 0.06 ? '0' : '1';
    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    requestAnimationFrame(update);
    const t = setTimeout(update, 400);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      clearTimeout(t);
    };
  }, [update]);

  return (
    <section ref={trackRef as React.RefObject<HTMLElement>} style={{ position: 'relative', height: '320vh', background: '#141414' }}>
      {/* Sticky viewport animates as user scrolls */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

        {/* Subtle grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />

        {/* Warm orange glow behind center */}
        <div style={{ position: 'absolute', left: '50%', top: '54%', transform: 'translate(-50%,-50%)', width: 760, height: 760, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,90,31,.13), rgba(20,20,20,0) 62%)', pointerEvents: 'none' }} />

        {/* Brand tag */}
        <div style={{ position: 'absolute', top: 30, left: 56, zIndex: 9, display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: '#FF5A1F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 12 }}>H</div>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '.24em', textTransform: 'uppercase', color: '#73736b' }}>Hubble · შრომის უსაფრთხოება</span>
        </div>

        {/* Swapping headlines */}
        <div style={{ position: 'absolute', top: 66, left: 0, right: 0, zIndex: 9, textAlign: 'center', padding: '0 24px' }}>
          <div style={{ position: 'relative', height: 104 }}>
            <div data-head style={{ position: 'absolute', inset: 0, opacity: 1, transition: 'opacity .55s, transform .55s' }}>
              <div style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 900, letterSpacing: '-.035em', color: '#F2F1EC' }}>ეს შენი კომპიუტერი.</div>
              <div style={{ fontSize: 16, color: '#8f8f87', marginTop: 12 }}>Word, PDF, სკანერი. ვერც ერთ აქტს ვერ პოულობ.</div>
            </div>
            <div data-head style={{ position: 'absolute', inset: 0, opacity: 0, transform: 'translateY(16px)', transition: 'opacity .55s, transform .55s' }}>
              <div style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 900, letterSpacing: '-.035em', color: '#F2F1EC' }}>ეს <span style={{ color: '#E6FF4D' }}>Hubble</span>.</div>
              <div style={{ fontSize: 16, color: '#8f8f87', marginTop: 12 }}>ერთი შემოწმება ერთი აქტი. დათარიღებული, თავის პროექტში.</div>
            </div>
          </div>
        </div>

        {/* Morph stage */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 200, bottom: 30, zIndex: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <XPDesktop />
          <PhoneApp />
        </div>

        {/* Scroll hint */}
        <div data-hint style={{ position: 'absolute', left: '50%', bottom: '4%', transform: 'translateX(-50%)', zIndex: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'opacity .4s' }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#73736b' }}>გადააფურცლე</span>
          <span className="animate-ms-bob" style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,.22)', color: '#F2F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</span>
        </div>

        {/* Scroll progress bar */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,.07)', zIndex: 8 }}>
          <div data-bar style={{ height: '100%', background: '#FF5A1F', transform: 'scaleX(0)', transformOrigin: 'left', willChange: 'transform' }} />
        </div>
      </div>
    </section>
  );
}
