# Tests

Pure-logic tests for the highest-risk modules. Uses Node's built-in test runner
(no Jest install) so we can exercise the offline-merge and validator logic
without pulling in React Native's test harness.

## Running

```sh
npm test
```

## Scope

These tests cover **pure functions only** — no React, no AsyncStorage, no
Supabase. Modules that mix in those concerns are exercised at their pure core
(extracted helpers, e.g. `stripServerFields`, `toErrorMessage`, validators).

When we add Jest + `jest-expo` later, these tests can be re-pointed at it
without rewriting the assertions — `node:test` and Jest share the same
`describe`/`it` shape.
