import { memo } from 'react';
import { HeroSection } from '@/components/marketing/HeroSection';
import { MessSection } from '@/components/marketing/MessSection';
import { PainSection, Transition } from './landing/home';
import { FlowSection } from './landing/home-flow';
import { LogoCloud, StatsBand, Testimonials } from './landing/home-proof';
import { ValueShowcase } from './landing/home-showcase';
import { FeaturesGrid, ForWho } from './landing/home-features';
import { TrustSecurity } from './landing/trust';
import { BrandStatement } from './landing/home-statement';
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
      <HeroSection />
      <MessSection />
      <LogoCloud />
      <StatsBand />
      <PainSection />
      <Transition />
      <FlowSection />
      <ValueShowcase />
      <FeaturesGrid />
      <TrustSecurity />
      <Testimonials />
      <ForWho />
      <BrandStatement />
      <PriceTeaser />
      <RegulationsTeaser />
      <CTABand variant="download" />
    </>
  );
});
