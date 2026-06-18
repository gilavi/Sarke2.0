import '@testing-library/jest-dom/vitest';

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
