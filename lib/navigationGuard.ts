// Navigation oscillation guard — prevents infinite redirect loops between two screens
// when local and server state diverge.

interface RedirectEvent {
  from: string;
  to: string;
  ts: number;
}

const MAX_OSCILLATIONS = 2; // more than 2 redirects between same pair = oscillation
const OSCILLATION_WINDOW_MS = 5000;

let redirectHistory: RedirectEvent[] = [];

function pruneOld() {
  const now = Date.now();
  redirectHistory = redirectHistory.filter(e => now - e.ts < OSCILLATION_WINDOW_MS);
}

/** Call this BEFORE executing a redirect. */
export function recordRedirect(from: string, to: string): void {
  pruneOld();
  redirectHistory.push({ from, to, ts: Date.now() });
}

/** Returns true if the same from→to pair has redirected more than MAX_OSCILLATIONS times recently. */
export function isOscillating(from: string, to: string): boolean {
  pruneOld();
  const pairCount = redirectHistory.filter(
    e => e.from === from && e.to === to
  ).length;
  return pairCount > MAX_OSCILLATIONS;
}

/** Returns true if ANY pair involving these two screens has oscillated. */
export function isAnyOscillationBetween(a: string, b: string): boolean {
  pruneOld();
  const count = redirectHistory.filter(
    e => (e.from === a && e.to === b) || (e.from === b && e.to === a)
  ).length;
  return count > MAX_OSCILLATIONS;
}

export function clearRedirectHistory(): void {
  redirectHistory = [];
}
