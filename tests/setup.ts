import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// lucide-react-native@1.20.0 ships a broken ESM internal import (its barrel
// imports `LucideProvider` from ./context.mjs, which only exports
// `useLucideContext`), so importing the real package throws under vitest. Mock
// it globally to the icon stub so every component test that pulls in icons can
// render. Per-file `vi.mock('lucide-react-native', …)` calls still take
// precedence where a test needs the same stub. See tests/mocks/rn-ui.ts.
vi.mock('lucide-react-native', async () => (await import('./mocks/rn-ui')).lucideMock());

// React Native / react-native-web modules reference the global __DEV__ flag.
if (typeof (globalThis as any).__DEV__ === 'undefined') {
  (globalThis as any).__DEV__ = false;
}

// Mock global fetch for Supabase tests if needed
if (!globalThis.fetch) {
  const { fetch } = require('cross-fetch');
  globalThis.fetch = fetch;
}

// Polyfill for React Native AsyncStorage in Node environment
class MockAsyncStorage {
  private store: Record<string, string> = {};

  async getItem(key: string): Promise<string | null> {
    return this.store[key] ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store[key] = value;
  }

  async removeItem(key: string): Promise<void> {
    delete this.store[key];
  }

  async clear(): Promise<void> {
    this.store = {};
  }
}

(globalThis as any).__mockAsyncStorage = new MockAsyncStorage();

// Suppress console.error for expected test errors
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('act('))
  ) {
    return;
  }
  originalError.call(console, ...args);
};
