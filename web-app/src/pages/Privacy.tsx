import { ShieldCheck } from 'lucide-react';
import { LegalDocPage } from '@/components/LegalDocPage';
import { privacyKa, privacyEn } from '@/lib/privacy';

/** Public privacy policy - the URL submitted to App Store Connect. */
export default function Privacy() {
  return <LegalDocPage ka={privacyKa} en={privacyEn} icon={ShieldCheck} />;
}
