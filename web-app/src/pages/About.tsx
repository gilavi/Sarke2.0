import { Mission, WhoWeAre, Team, Social } from './landing/about';
import { FAQ } from './landing/faq';
import { aboutFaqs } from './landing/marketing-data';

export default function About() {
  return (
    <>
      <Mission />
      <WhoWeAre />
      <Team />
      <Social />
      <FAQ items={aboutFaqs} />
    </>
  );
}
