import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom implements neither matchMedia nor ResizeObserver, both of which Mantine
// touches at render time (MantineProvider's color-scheme hook calls matchMedia;
// several components observe size). Provide inert mocks so component tests can
// render inside a MantineProvider. See web-app/src/test-utils.tsx.
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
