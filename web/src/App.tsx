import { useEffect, useState } from 'react';
import { SignPage } from './pages/SignPage';
import { SuccessPage } from './pages/SuccessPage';
import { DeclinedPage } from './pages/DeclinedPage';
import { Brand } from './components/Brand';

/* --- Lazy-load the heavy 3D scene so it doesn't bloat the signing bundle --- */
import { lazy, Suspense } from 'react';
const SafetyGuidePage = lazy(() => import('./pages/SafetyGuidePage'));

/**
 * Hash-based routing — GitHub Pages serves a single index.html, and any path
 * other than / would 404 unless we put a custom 404 redirect in place. Hash
 * routes sidestep that entirely.
 *
 * Routes:
 *   /#/sign/<token>   — main signing page
 *   /#/success        — post-sign confirmation
 *   /#/declined       — post-decline confirmation
 *   /#/safety         — 3D construction safety guide
 *   anything else     — landing fallback
 */
export function App() {
  const [hash, setHash] = useState<string>(() => window.location.hash || '');

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (next: string) => {
    window.location.hash = next.replace(/^#/, '');
  };

  // Match #/sign/<token>
  const signMatch = /^#\/sign\/([A-Za-z0-9_-]{8,})$/.exec(hash);
  if (signMatch) {
    return <SignPage token={signMatch[1]} onNavigate={navigate} />;
  }
  if (hash === '#/success') return <SuccessPage />;
  if (hash === '#/declined') return <DeclinedPage />;

  /* 3D Safety Guide */
  if (hash === '#/safety') {
    return (
      <Suspense
        fallback={
          <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        }
      >
        <SafetyGuidePage />
      </Suspense>
    );
  }

  return (
    <div className="app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      <Brand />
      <div className="card center-card" style={{ flex: 1 }}>
        <div className="icon-circle icon-warn">?</div>
        <h1 className="title">ლინკი არასრული</h1>
        <p className="subtitle">
          გთხოვთ გახსნათ სრული ლინკი თქვენი SMS-დან. ფორმატი:{' '}
          <code>/#/sign/&lt;token&gt;</code>
        </p>
      </div>

      {/* Bottom Navigation */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: 560,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
          background: 'var(--card, #ffffff)',
          borderTop: '1px solid var(--hairline, #e8e1d4)',
          zIndex: 100,
          boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <button
          onClick={() => navigate('#/safety')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '6px 16px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--accent, #147a4f)',
            fontFamily: 'inherit',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          Safety Guide
        </button>
      </nav>
    </div>
  );
}
