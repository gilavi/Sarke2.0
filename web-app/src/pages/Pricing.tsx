import { Pricing as PricingCards, PricingComparison } from './landing/pricing';
import { FAQ } from './landing/faq';
import { pricingFaqs } from './landing/marketing-data';

export default function Pricing() {
  return (
    <>
      <PricingCards />
      <PricingComparison />
      <FAQ items={pricingFaqs} />
    </>
  );
}
