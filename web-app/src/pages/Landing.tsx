import { memo } from 'react';
import { Hero, PainSection, Transition, HowItWorks } from './landing/home';
import { LogoCloud, StatsBand, Testimonials } from './landing/home-proof';
import { ValueShowcase } from './landing/home-showcase';
import { FeaturesGrid, ForWho } from './landing/home-features';
import { TrustSecurity } from './landing/trust';
import { PriceTeaser, RegulationsTeaser } from './landing/home-cta';
import { CTABand } from './landing/cta';

/**
 * Home page sections. Navbar, Footer and overlays come from <MarketingLayout>;
 * this component is just the ordered list of home sections (the layout's auth
 * guard already redirects logged-in users to /home).
 */
export default memo(function Landing() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <StatsBand />
      <PainSection />
      <Transition />
      <HowItWorks />
      <ValueShowcase />
      <FeaturesGrid />
      <TrustSecurity />
      <Testimonials />
      <ForWho />
      <PriceTeaser />
      <RegulationsTeaser />
      <CTABand variant="download" />
    </>
  );
});
