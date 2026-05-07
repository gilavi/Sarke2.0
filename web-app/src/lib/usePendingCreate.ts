import { useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Returns pendingCreate data from navigation state and a ref-guarded
 * lazyCreate helper that prevents double-invocation on fast clicks.
 *
 * Usage: after calling the returned `lazyCreate`, caller is responsible for
 * saving the first mutation and navigating to the real detail URL.
 */
export function usePendingCreate<T>() {
  const { state } = useLocation();
  const inflightRef = useRef(false);

  const pendingCreate = (state?.pendingCreate ?? null) as T | null;

  async function lazyCreate(createFn: (data: T) => Promise<{ id: string }>): Promise<string | null> {
    if (!pendingCreate || inflightRef.current) return null;
    inflightRef.current = true;
    try {
      const created = await createFn(pendingCreate);
      return created.id;
    } catch (err) {
      inflightRef.current = false;
      throw err;
    }
  }

  return { pendingCreate, lazyCreate };
}
