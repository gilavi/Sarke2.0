import { memo } from 'react';
import { Hero, PainSection, Transition, HowItWorks } from './landing/home';
import { FeaturesGrid, ForWho } from './landing/home-features';
import { PriceTeaser, DownloadCTA, RegulationsTeaser } from './landing/home-cta';

/**
 * Home page sections. Navbar, Footer and overlays come from <MarketingLayout>;
 * this component is just the ordered list of home sections (the layout's auth
 * guard already redirects logged-in users to /home).
 */
export default memo(function Landing() {
  return (
    <>
      <Hero />
      <PainSection />
      <Transition />
      <HowItWorks />
      <FeaturesGrid />
      <ForWho />
      <PriceTeaser />
      <DownloadCTA />
      <RegulationsTeaser />
    </>
  );
});
