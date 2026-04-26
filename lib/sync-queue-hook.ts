import { useEffect, useState } from 'react';
import { getPendingCount } from './sync-queue';

export function useSyncQueue(pollMs = 3000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      const c = await getPendingCount();
      if (mounted) setCount(c);
    };
    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [pollMs]);

  return count;
}
