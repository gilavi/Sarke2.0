import { useRef } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'hubble-pending-create';

function readStored<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeStored<T>(data: T | null) {
  if (data) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Returns pendingCreate data from navigation state (with sessionStorage fallback)
 * and a ref-guarded lazyCreate helper that prevents double-invocation on fast clicks.
 */
export function usePendingCreate<T>() {
  const { state } = useLocation();
  const inflightRef = useRef(false);

  // Prefer navigation state, fallback to sessionStorage
  const pendingCreate = (state?.pendingCreate ?? readStored<T>() ?? null) as T | null;

  async function lazyCreate(createFn: (data: T) => Promise<{ id: string }>): Promise<string | null> {
    if (!pendingCreate || inflightRef.current) return null;
    inflightRef.current = true;
    try {
      const created = await createFn(pendingCreate);
      writeStored(null);
      return created.id;
    } catch (err) {
      inflightRef.current = false;
      throw err;
    }
  }

  return { pendingCreate, lazyCreate };
}

export function setPendingCreate<T>(data: T) {
  writeStored(data);
}
