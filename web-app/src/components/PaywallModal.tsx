import { Modal } from '@mantine/core';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PDF_FREE_LIMIT } from '@/lib/pdfGate';

const FEATURES = [
  'შეუზღუდავი PDF გენერაცია',
  'ყველა შაბლონი',
  'ისტორია და არქივი',
  'პრიორიტეტული მხარდაჭერა',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Headline override — defaults to "{LIMIT} უფასო PDF ამოიწურა" */
  headline?: string;
}

/**
 * Shown when the user exhausts their free PDF limit (or clicks "Upgrade" from
 * the subscription card). Mirrors the mobile components/PaywallModal.tsx —
 * unlike mobile (which opens an SFAuthenticationSession) the web variant
 * navigates to the existing /subscribe route in-place.
 */
export function PaywallModal({ open, onOpenChange, headline }: Props) {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    onOpenChange(false);
    navigate('/subscribe');
  };

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      size="md"
      radius="lg"
      centered
      withCloseButton
    >
      <div className="flex flex-col items-center pt-2 text-center">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-3xl font-black text-white">
            S
          </div>
          <span className="absolute -bottom-1 -right-2 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-2 ring-white">
            პრო
          </span>
        </div>

        <h2 className="mt-4 font-display text-2xl font-bold text-neutral-900">
          {headline ?? `${PDF_FREE_LIMIT} უფასო PDF ამოიწურა`}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          განაგრძეთ შეუზღუდავი შემოწმებებით და PDF რეპორტებით
        </p>

        <ul className="mt-5 w-full space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-neutral-800">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5">
          <div className="font-display text-3xl font-extrabold text-neutral-900">₾19 / თვეში</div>
          <div className="mt-1 text-xs text-neutral-500">გამოწერის გაუქმება ნებისმიერ დროს</div>
        </div>

        <div className="mt-5 w-full space-y-2">
          <Button onClick={handleSubscribe} className="w-full" size="lg">
            გამოწერის გააქტიურება
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            მოგვიანებით
          </Button>
        </div>
      </div>
    </Modal>
  );
}
