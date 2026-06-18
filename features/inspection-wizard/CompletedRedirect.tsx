import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { recordRedirect } from '../../lib/navigationGuard';

/**
 * Blank placeholder that fires a one-shot redirect to the inspection detail
 * screen. Used when the wizard route is hit for an already-completed
 * inspection - the canonical landing is `/inspections/[id]`, not here.
 */
export function CompletedRedirect({ id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    recordRedirect('wizard', 'detail');
    router.replace(`/inspections/${id}` as any);
  }, [id, router]);
  return null;
}
