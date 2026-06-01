import { ContactHero, ContactInfo } from './landing/contact';
import { ChatWidget } from '@/components/marketing/ChatWidget';
import { FAQ } from './landing/faq';
import { contactFaqs } from './landing/marketing-data';

export default function Contact() {
  return (
    <>
      <ContactHero />
      <ChatWidget />
      <ContactInfo />
      <FAQ items={contactFaqs} />
    </>
  );
}
