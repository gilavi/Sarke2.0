import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar, Footer } from '@/pages/landing/chrome';
import { StickyMobileBar, ExitIntentPopup, CookieBanner } from '@/pages/landing/overlays';

/**
 * Shared chrome for every public marketing page (/, /about, /pricing,
 * /legislation, /contact). Renders the navbar + footer + overlays once and
 * hosts the per-page sections via <Outlet />.
 *
 * Logged-in visitors are bounced to /home — marketing chrome (login/register
 * CTAs) is irrelevant once authenticated, matching the prior Landing behavior.
 */
export function MarketingLayout() {
  const { session } = useAuth();
  if (session) return <Navigate to="/home" replace />;

  return (
    <div className="font-sans antialiased">
      <Navbar />
      <Suspense fallback={<div className="min-h-screen bg-[#F5F3EE]" />}>
        <Outlet />
      </Suspense>
      <Footer />
      <StickyMobileBar />
      <ExitIntentPopup />
      <CookieBanner />
    </div>
  );
}
