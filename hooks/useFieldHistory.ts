import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_HISTORY = 12;

function storageKey(userId: string, fieldKey: string): string {
  return `field-history:${userId}:${fieldKey}`;
}

export function useFieldHistory(userId: string | null | undefined, fieldKey: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load history on mount / when userId or fieldKey changes
  useEffect(() => {
    if (!userId || !fieldKey) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    AsyncStorage.getItem(storageKey(userId, fieldKey))
      .then(raw => {
        if (cancelled) return;
        if (!raw) {
          setSuggestions([]);
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setSuggestions(parsed.filter((v: unknown) => typeof v === 'string' && v.trim()));
          }
        } catch {
          setSuggestions([]);
        }
      })
      .catch(() => setSuggestions([]));
    return () => { cancelled = true; };
  }, [userId, fieldKey]);

  const addToHistory = useCallback(
    async (value: string) => {
      if (!userId || !fieldKey || !value?.trim()) return;
      const key = storageKey(userId, fieldKey);
      let current: string[] = [];
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) current = parsed;
        }
      } catch {
        // ignore
      }
      // Remove existing and add to front
      const cleaned = current.filter(v => v !== value.trim());
      const next = [value.trim(), ...cleaned].slice(0, MAX_HISTORY);
      await AsyncStorage.setItem(key, JSON.stringify(next));
      setSuggestions(next);
    },
    [userId, fieldKey],
  );

  return { suggestions, addToHistory };
}
