---
sidebar_position: 2
---

# 📰 What's New

**Last updated:** April 27, 2026  
**Status:** Active Development  

---

## Latest Release

### Commit 8ff6932 — April 27, 2026
**chore: update UI flows, components, and theme configuration**

#### Changes
- 🎨 **UI Flows Modernized**
  - Auth flows: `forgot.tsx`, `login.tsx`, `reset.tsx`, `verify-email.tsx`
  - Home, projects, and inspection flows refreshed
  - Project detail and signer flows improved

- ✨ **New Components**
  - **TourGuide** — Swipeable onboarding tour (9-card guidance on first use)
  - Persisted in AsyncStorage under `haraco_tour_seen`

- 🎭 **Component Updates**
  - AddRemoteSignerModal — modernized styling
  - CrewSection — UI refinements
  - HarnessListFlow — flow improvements
  - ScaffoldHelpSheet — help sheet enhancements

- 🎨 **Theme & Configuration**
  - Color tokens refreshed (`lib/theme.ts`)
  - Services layer updates (`lib/services.real.ts`)
  - Metro bundler config added (`metro.config.js`)
  - App configuration (`app.json`)

- ❌ **Removed**
  - Deprecated certificates preview route

#### Impact
- **28 files changed**, 1209 insertions(+), 727 deletions(-)
- All changes pushed to `main` branch

---

## Recent Features (Last 5 Commits)

| Date | Feature | Status |
|------|---------|--------|
| Apr 27 | UI flows & theme updates, TourGuide component | ✅ Merged |
| Apr 26 | Web map fallbacks + accessibility hooks | ✅ Merged |
| Apr 25 | UX improvements: cooldown persistence, wizard caching, color tokens | ✅ Merged |
| Apr 20 | DAXUIA design system integration | ✅ Merged |
| Apr 15 | Matrix-style inspection flow (ქამარი) | ✅ Merged |

---

## Current Development Focus

### ✅ Completed This Quarter
1. **Accessibility** — Tour guide implementation, contextual help system
2. **Design System** — DAXUIA integration with color tokens
3. **Inspection Flows** — Matrix-style questionnaire for harness/scaffold
4. **Component Library** — Modernized UI with consistent styling
5. **Network Resilience** — Improved offline handling

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
