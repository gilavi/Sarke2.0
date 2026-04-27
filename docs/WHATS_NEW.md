# 📰 What's New — Sarke 2.0 Status & Updates

**Last Updated:** 2026-04-27  
**Status:** Active Development  
**Branch:** `main` (stable)

---

## 🔄 Latest Changes (This Session)

### Commits
- **67f461e** (2026-04-27) — `chore: update UI flows, components, and theme configuration`
  - Updated auth flows: `forgot.tsx`, `login.tsx`, `reset.tsx`, `verify-email.tsx`
  - Refactored home, projects, and inspection flows
  - Added **TourGuide component** (`components/TourGuide.tsx`)
  - Added **metro.config.js** for React Native configuration
  - Updated theme tokens (`lib/theme.ts`) and services (`lib/services.real.ts`)
  - Modernized component styling (AddRemoteSignerModal, CrewSection, HarnessListFlow, ScaffoldHelpSheet)
  - Removed deprecated certificates preview route (`app/certificates/preview.tsx` ✂️)
  - **28 files changed**, 1209 insertions(+), 727 deletions(-)

---

## 📊 Recent Feature Timeline

| Date | Commit | Feature |
|------|--------|---------|
| 2026-04-27 | 67f461e | UI flows & theme updates, TourGuide component added |
| 2026-04-26 | d85c322 | Web map fallbacks + accessibility hooks hardening |
| 2026-04-25 | d264415 | UX improvements: cooldown persistence, wizard caching, color tokens |
| 2026-04-20 | 06c4983 | DAXUIA design system integration (merged) |
| 2026-04-15 | a091d3d | Matrix-style inspection flow (ქამარი) |

---

## 🎯 Current Focus Areas

### ✅ Completed
1. **Accessibility** — Tour guide implementation, contextual help (9-card swipeable tour on first use)
2. **Design System** — DAXUIA integration with color tokens and theme consistency
3. **Inspection Flows** — Matrix-style questionnaire for harness/scaffold inspections
4. **Component Library** — Modernized UI components with consistent styling
5. **Network Resilience** — Improved offline handling and error recovery

### 🔨 In Progress / Near-term
1. **Web Support** — Map fallbacks and web-specific optimizations
2. **Component Stability** — Refactoring tour guide, signer modals, and flow components
3. **PDF Generation** — Testing and improving PDF export reliability

### 🚀 Known Roadmap Items
- Signature capture UX improvements (currently looks like seismograph output)
- Comment sheets on wizard steps
- Profile/settings screen (beyond sign-out)
- Bundle Noto Sans Georgian for proper PDF rendering
- Fix app crashes on rotation during signature capture

---

## 📂 Key Files & Recent Changes

### Components
| File | Status | Change |
|------|--------|--------|
| `components/TourGuide.tsx` | ✨ NEW | Swipeable tour guide for onboarding |
| `components/AddRemoteSignerModal.tsx` | 🔄 Updated | Modernized styling |
| `components/CrewSection.tsx` | 🔄 Updated | UI refinements |
| `components/HarnessListFlow.tsx` | 🔄 Updated | Flow component updates |
| `components/ScaffoldHelpSheet.tsx` | 🔄 Updated | Help sheet improvements |

### Screens
| File | Status | Change |
|------|--------|--------|
| `app/(auth)/*.tsx` | 🔄 Updated | Auth flow modernization |
| `app/(tabs)/home.tsx` | 🔄 Updated | Home screen refresh |
| `app/(tabs)/projects.tsx` | 🔄 Updated | Projects list improvements |
| `app/inspections/[id]/wizard.tsx` | 🔄 Updated | Wizard component updates |
| `app/projects/[id]/signer.tsx` | 🔄 Updated | Signer flow refinements |
| `app/certificates/preview.tsx` | ❌ DELETED | Route removed |

### Configuration & Theme
| File | Status | Change |
|------|--------|--------|
| `lib/theme.ts` | 🔄 Updated | Color tokens refresh |
| `lib/services.real.ts` | 🔄 Updated | Service layer updates |
| `metro.config.js` | ✨ NEW | Metro bundler configuration |
| `app.json` | 🔄 Updated | App configuration |

---

## 📋 Active Branches

| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Production-ready code | ✅ Current & Stable |
| `ios-legacy` | Native SwiftUI port | 🪦 Archived (RIP) |

---

## 🧪 Testing Status

### Dev Server
- **Port:** 8085 (or auto-assigned if busy)
- **Tunnel:** ✅ Connected
- **Metro Bundler:** ✅ Ready
- **QR Code:** Available via `npx expo start`

### Known Issues (Unresolved)
1. App crashes (reason: unknown — we're as confused as you)
2. Phone rotation during signature capture breaks canvas alignment
3. PDF export is slow (3-5 business days on a fast phone)
4. `npm install` downloads internet twice
5. Typecheck fails silently (we ignore it as a lifestyle choice)

---

## 🤖 For AI Agents

### Quick Context
- **Tech Stack:** Expo SDK 55 + React Native 0.81 + React 19 + Supabase
- **Language:** Georgian (ქართული) — all UI strings are inline, no i18n file
- **Routing:** expo-router (file-based, see `app/` directory)
- **Key Dependencies:**
  - `react-native-signature-canvas` (signatures)
  - `expo-print` + `expo-sharing` (PDFs)
  - `expo-image-picker` (photo capture)
  - `react-native-keyboard-controller` (keyboard management)

### Documentation to Read
1. **[README.md](../README.md)** — Main project overview, stack, directory layout
2. **[Copy Style Guide](../README.md#-copy-style-guide-georgian-ui)** — Georgian UI text conventions
3. **[types/models.ts](../types/models.ts)** — Database schema + TypeScript types
4. **[lib/services.real.ts](../lib/services.real.ts)** — Data layer + Supabase operations
5. **[CLAUDE.md](../CLAUDE.md)** — Development workflow, documentation rules, known issues

### Common Tasks
- **Run locally:** `npm install --legacy-peer-deps && npx expo start`
- **Type check:** `npm run typecheck` (will fail, that's normal)
- **Update docs:** Do it in the same commit as code changes (see CLAUDE.md)
- **Mark bugs fixed:** Update `BUG_REPORT.md` instead of deleting entries

### Recent Changes to Be Aware Of
- **TourGuide added** — onboarding tour for new users (persisted in AsyncStorage under `haraco_tour_seen`)
- **Certificates preview route removed** — use list view instead
- **Theme tokens refreshed** — check `lib/theme.ts` for latest color/spacing values
- **Metro config added** — may affect bundling behavior on different OSs

---

## 📞 Support & Escalation

| Question | Answer |
|----------|--------|
| Why is my laptop fan screaming? | Expo bundler is probably bundling. It's normal. |
| Why does typecheck fail? | We ignore it as a lifestyle choice. See CLAUDE.md. |
| Where's the native iOS app? | Dead, on `ios-legacy` branch. RIP. |
| How do I update documentation? | Do it in the same commit as code changes. See CLAUDE.md. |
| Should I commit changes to `BUG_REPORT.md`? | Yes, mark issues resolved instead of deleting them. |

---

## 🗓️ Session Notes

**2026-04-27 Session:**
- Dev server restarted and running on port 8085
- Main branch is 1 commit ahead (67f461e)
- All changes committed and pushed to origin/main
- Documentation updated with What's New briefing
- Ready for next iteration

---

_For more details, see [README.md](../README.md) or reach out to the team._
