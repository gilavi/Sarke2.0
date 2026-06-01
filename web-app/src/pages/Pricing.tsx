import { Pricing as PricingCards, PricingComparison } from './landing/pricing';
import { TrustSecurity } from './landing/trust';
import { FAQ } from './landing/faq';
import { CTABand } from './landing/cta';
import { pricingFaqs } from './landing/marketing-data';

export default function Pricing() {
  return (
    <>
      <PricingCards />
      <PricingComparison />
      <TrustSecurity />
      <FAQ items={pricingFaqs} />
      <CTABand />
    </>
  );
}
