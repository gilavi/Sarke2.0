---
sidebar_position: 2
---

# 📰 What's New

**Last updated:** April 27, 2026  
**Status:** Active Development — TestFlight 1.1.0 in flight  

---

## Latest Release — v1.1.0 (April 27, 2026)

Marketing version bumped `1.0.0 → 1.1.0` for TestFlight. Five commits shipped together.

#### ქამარი (harness) inspection subflow — `d8457ba`
- New `components/wizard/kamari/KamariFlow.tsx`: count screen → traffic-light overview grid → per-belt detail modal with accordion problem reporting.
- Persists into the existing `component_grid` `Answer.grid_values` shape, so reports/PDFs keep working unchanged.
- Exit-modal & wizard polish, project + templates screen tweaks.

#### Regulations data layer + UI refresh — `018dc40`
- Content extracted from the screen into `lib/regulations.ts` so it can be reused/tested.
- Tab UI rebuilt on top of it.

#### Qualifications: bottom-sheet add flow — `485f51b`
- Removed `app/qualifications/new.tsx`. Adding a qualification no longer pushes a route — uses `AddQualificationSheet` in place.
- Required-types catalogue lives in `app/qualifications/requiredTypes.ts`.

#### Inspection results redesign — `c6fa3ec`
- Problems-first layout, hero status badge, modal preview before export.

#### A11yText typography pass — `f782037`
- Consistent text component across all screens for accessibility & sizing.

---

## Recent Features (Last 5 Commits)

| Date | Feature | Status |
|------|---------|--------|
| Apr 27 | v1.1.0: ქამარი subflow, regulations refactor, qualifications sheet, results redesign, A11y typography | ✅ Merged |
| Apr 27 | UI flows & theme updates, TourGuide component | ✅ Merged |
| Apr 26 | Web map fallbacks + accessibility hooks | ✅ Merged |
| Apr 25 | UX improvements: cooldown persistence, wizard caching, color tokens | ✅ Merged |
| Apr 20 | DAXUIA design system integration | ✅ Merged |

---

## Current Development Focus

### ✅ Completed This Quarter
1. **Accessibility** — Tour guide, contextual help, A11yText typography pass across all screens
2. **Design System** — DAXUIA integration with color tokens
3. **Inspection Flows** — ქამარი (harness) subflow promoted; results screen redesigned (problems-first)
4. **Qualifications** — Standalone /new page replaced with in-place bottom-sheet add flow
5. **Regulations** — Data extracted to `lib/regulations.ts`, UI refreshed
6. **Component Library** — Modernized UI with consistent styling
7. **Network Resilience** — Improved offline handling

### 🔨 In Progress
1. **Web Support** — Map fallbacks, responsive optimizations
2. **Component Stability** — Tour guide, signer modals, flow refinements
3. **PDF Reliability** — Testing and performance improvements

### 🚀 Planned
- Signature capture UX improvements (cleaner canvas output)
- Comment sheets on wizard steps
- Profile/settings screen (beyond sign-out)
- Noto Sans Georgian bundling for PDFs
- Rotation handling during signature capture

---

## Known Issues Being Tracked

| Issue | Status | Impact |
|-------|--------|--------|
| App crashes (cause unknown) | 🔍 Investigating | High |
| Phone rotation breaks signature canvas | 🔄 Roadmap | Medium |
| PDF export is slow | 🔄 Investigating | Medium |
| Typecheck failures | 🔄 Accepted (lifestyle choice) | Low |
| npm install downloads internet twice | 🤷 Peer deps | Low |

See [BUG_REPORT.md](https://github.com/gilavi/Sarke2.0/blob/main/BUG_REPORT.md) for full list.

---

## Development Roadmap

```
Q2 2026
├─ ✅ Accessibility improvements
├─ ✅ Design system integration
├─ 🔄 Web support & responsiveness
├─ 🔄 Component refinements
└─ 🚀 PDF & signature UX

Q3 2026
├─ 🚀 Settings/profile screen
├─ 🚀 Comment sheets
├─ 🚀 Signature canvas improvements
└─ 🚀 Georgian font bundling
```

---

## How to Get Started

### For Developers
1. Read [Getting Started](./getting-started.md)
2. Install: `npm install --legacy-peer-deps`
3. Run: `npx expo start`
4. Scan QR code with Expo Go on your phone

### For AI Agents
1. Check the [GitHub repo briefing](https://github.com/gilavi/Sarke2.0/blob/main/docs/AI_BRIEFING.md)
2. Review this site's [architecture](./architecture.md) guide
3. See [contributing](./contributing.md) for workflow rules

---

## Resources

- **GitHub Repository**: [gilavi/Sarke2.0](https://github.com/gilavi/Sarke2.0)
- **Main Branch**: [branch/main](https://github.com/gilavi/Sarke2.0/tree/main)
- **Docs Branch**: [branch/docs/site](https://github.com/gilavi/Sarke2.0/tree/docs/site)
- **Issue Tracker**: [GitHub Issues](https://github.com/gilavi/Sarke2.0/issues)

---

## Questions?

- See the relevant section in this docs site
- Check [BUG_REPORT.md](https://github.com/gilavi/Sarke2.0/blob/main/BUG_REPORT.md) for known issues
- Review [CLAUDE.md](https://github.com/gilavi/Sarke2.0/blob/main/CLAUDE.md) for development workflow
