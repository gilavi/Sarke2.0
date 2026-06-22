import '@testing-library/jest-dom';
import { vi } from 'vitest';

// react-native-reanimated and react-native-worklets are aliased in vitest.config.ts
// to their stubs/mocks so TurboModule init crashes don't occur in jsdom.

// jsdom does not implement matchMedia or ResizeObserver; mock them for component
// tests that check media queries or observe element sizes.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// framer-motion's `whileInView` uses IntersectionObserver; jsdom doesn't ship one.
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = '';
  thresholds = [];
}
window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
