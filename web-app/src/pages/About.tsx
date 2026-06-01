import { Mission, WhoWeAre, Values, Team, Social } from './landing/about';
import { StatsBand } from './landing/home-proof';
import { FAQ } from './landing/faq';
import { CTABand } from './landing/cta';
import { aboutFaqs } from './landing/marketing-data';

export default function About() {
  return (
    <>
      <Mission />
      <StatsBand />
      <WhoWeAre />
      <Values />
      <Team />
      <Social />
      <FAQ items={aboutFaqs} />
      <CTABand />
    </>
  );
}
