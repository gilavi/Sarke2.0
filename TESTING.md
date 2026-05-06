# Testing Guide

This project uses a multi-layered testing stack:

- **Vitest** — unit tests, integration tests, service tests
- **Playwright** — end-to-end (E2E) tests against the web build
- **Supabase CLI** — local database for integration and E2E tests

## Prerequisites

- Node.js 20+
- Docker (for `supabase start`)
- Supabase CLI (installed via `npm install` — use `npx supabase`)

## Quick Start

```bash
# Install all dependencies (including dev)
npm install

# Start local Supabase (required for integration & E2E tests)
npx supabase start

# Run all tests
npm test

# Or run categories individually
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Test Categories

### 1. Unit Tests

**Command:** `npm run test:unit`

Covers pure logic, utilities, validators, guards, and formatters.

**Location:** `tests/unit/` and `__tests__/`

**Examples:**
- `tests/unit/validators.test.ts` — email & phone validation
- `tests/unit/guards.test.ts` — runtime type guards
- `tests/unit/formatDate.test.ts` — Georgian date formatting
- `tests/unit/errorMap.test.ts` — error message mapping
- `tests/unit/pdfName.test.ts` — PDF filename generation

### 2. Integration Tests

**Command:** `npm run test:integration`

**Location:** `tests/integration/`

#### Supabase Integration (`tests/integration/supabase/`)
Tests the connection to local Supabase and basic query behavior.

#### Service Layer (`tests/integration/services/`)
Tests data-fetching functions with mocked Supabase client.

#### Auth Flows (`tests/integration/auth/`)
Tests auth behaviors using mocked Supabase auth methods.

#### RLS Policies (`tests/integration/rls/`)
Verifies Row-Level Security policies:
- Anonymous users see **nothing**
- Authenticated users see **only their own** rows
- Cross-user data leakage is **impossible**

> ⚠️ **Important:** RLS and Supabase integration tests require `npx supabase start` to be running.

### 3. E2E Tests (Playwright)

**Command:** `npm run test:e2e`

**Location:** `e2e/`

Tests full user journeys in a real browser against the local dev server + local Supabase.

**Prerequisites:**
```bash
npx supabase start
npm run web        # in another terminal, or let Playwright start it
```

Playwright will automatically start the dev server if it's not running.

### 4. Coverage

**Command:** `npm run coverage`

Generates a coverage report with thresholds:
- Lines: 70%
- Functions: 70%
- Branches: 60%
- Statements: 70%

## Environment Variables

Test-specific environment variables are in `.env.test`:

```
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Override these in CI or local `.env.test.local` if your Supabase ports differ.

## Mocking Strategy

### Supabase Client

Use the mock factory in `tests/mocks/supabase.ts`:

```ts
import { createMockSupabaseClient } from '../mocks/supabase';

const mockClient = createMockSupabaseClient({
  auth: {
    signInWithPassword: vi.fn(() => Promise.resolve({ ... })),
  },
});
```

### React Native Modules

Common RN modules are pre-mocked in `tests/mocks/react-native.ts` (imported via `tests/setup.ts`).

Add new mocks there when testing components that import native modules.

## CI / GitHub Actions

The workflow `.github/workflows/test.yml` runs on every push/PR:

1. **Unit Tests** — fast, no external dependencies
2. **Integration Tests** — starts Supabase, runs DB migrations, tests against real local DB
3. **E2E Tests** — starts Supabase + dev server, runs Playwright

### Artifacts
- Coverage reports → `coverage-unit`
- Playwright HTML report → `playwright-report`
- Playwright screenshots on failure → `playwright-screenshots`

## Adding New Tests

### Unit test for a utility

```ts
// tests/unit/myUtil.test.ts
import { describe, it, expect } from 'vitest';
import { myUtil } from '../../lib/myUtil';

describe('myUtil', () => {
  it('does the thing', () => {
    expect(myUtil('input')).toBe('output');
  });
});
```

### Component test (web-compatible)

```ts
// tests/unit/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../../components/MyComponent';

describe('MyComponent', () => {
  it('renders', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

> **Note:** React Native components that depend on native modules (expo-image, reanimated, etc.) require mocking those modules. See `tests/mocks/react-native.ts` for examples.

### Service test

```ts
// tests/integration/services/myApi.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('myApi', () => {
  it('handles empty results', async () => {
    const mockFn = vi.fn().mockResolvedValue([]);
    const result = await mockFn();
    expect(result).toEqual([]);
  });

  it('throws on network error', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(mockFn()).rejects.toThrow('Network error');
  });
});
```

## Troubleshooting

### `supabase start` fails
- Ensure Docker is running
- Ensure port 54321-54328 are free
- Run `npx supabase stop` then `npx supabase start`

### Tests timeout connecting to Supabase
- Verify `supabase start` is running
- Check `.env.test` has correct `SUPABASE_URL`

### Playwright browser missing
- Run `npx playwright install chromium`

### React Native module not found in tests
- Add the module mock to `tests/mocks/react-native.ts`
- Or mock it inline in your test with `vi.mock('module-name', () => ({ ... }))`
