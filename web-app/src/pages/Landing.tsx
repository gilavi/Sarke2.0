import { memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  Navbar,
  Hero,
  PainSection,
  HowItWorks,
  FeaturesGrid,
  Pricing,
  FAQ,
  FinalCTA,
  Footer,
} from './landing/sections';
import { StickyMobileBar, ExitIntentPopup, CookieBanner } from './landing/overlays';

export default memo(function Landing() {
  const { session } = useAuth();
  if (session) return <Navigate to="/home" replace />;

  return (
    <div className="font-sans antialiased">
      <Navbar />
      <Hero />
      <PainSection />
      <HowItWorks />
      <FeaturesGrid />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
      <StickyMobileBar />
      <ExitIntentPopup />
      <CookieBanner />
    </div>
  );
});
