import { FileText } from 'lucide-react';
import { LegalDocPage } from '@/components/LegalDocPage';
import { termsKa, termsEn } from '@/lib/terms';

/** Public terms & conditions — linked from the marketing footer, the cookie
 *  banner, Account, and the mobile app's terms screen ("full text"). */
export default function Terms() {
  return <LegalDocPage ka={termsKa} en={termsEn} icon={FileText} />;
}
