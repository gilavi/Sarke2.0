import { useEffect, useState } from 'react';
import { SignPage } from './pages/SignPage';
import { SuccessPage } from './pages/SuccessPage';
import { DeclinedPage } from './pages/DeclinedPage';
import SafetyGuidePage from './pages/SafetyGuidePage';

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
    return <SafetyGuidePage />;
  }

  // No signing token in URL — redirect to the dashboard at /app/
  window.location.replace('/app/');
  return null;
}
