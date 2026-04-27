# 🤖 AI Agent Briefing — Sarke 2.0 Project Context

**Purpose:** Quick reference for AI agents working on this codebase  
**Updated:** 2026-04-27  
**Format:** Structured for machine parsing + human readability

---

## Core Facts

**Project Type:** Expo (React Native) mobile inspection app  
**Primary Language:** Georgian (ქართული) UI + English codebase  
**Target Users:** Safety experts conducting scaffolding/harness inspections  
**Backend:** Supabase (Postgres + Auth + Storage)  
**Source:** https://github.com/gilavi/Sarke2.0

---

## Technology Stack

```
Frontend:
├─ Expo SDK 55
├─ React Native 0.81
├─ React 19
├─ expo-router (file-based routing)
├─ TypeScript
└─ Supabase client

Core Libraries:
├─ react-native-signature-canvas (signature capture)
├─ expo-image-picker (photo capture)
├─ expo-print + expo-sharing (PDF export)
├─ react-native-keyboard-controller (keyboard management)
└─ @react-native-camera-roll/camera-roll

Storage:
├─ Supabase Postgres (relational data)
├─ Supabase Auth (user authentication)
└─ Supabase Storage buckets:
   ├─ certificates
   ├─ answer-photos
   ├─ pdfs
   └─ signatures
```

---

## Directory Structure

```
Sarke 2.0/
├── app/                              # expo-router routes
│   ├── (auth)/                       # Auth screens (login, register, password reset)
│   │   ├── forgot.tsx
│   │   ├── login.tsx
│   │   ├── reset.tsx
│   │   └── verify-email.tsx
│   ├── (tabs)/                       # Main app tabs
│   │   ├── home.tsx
│   │   ├── projects.tsx
│   │   └── ...
│   ├── projects/[id]/                # Project detail + signer
│   ├── inspections/[id]/             # Inspection wizard
│   ├── template/[id]/start.tsx       # Template quick-start
│   ├── certificates/                 # Qualification certificates list
│   ├── history.tsx                   # Inspection history
│   └── _layout.tsx                   # Root layout + providers
│
├── components/                       # Reusable UI + feature components
│   ├── TourGuide.tsx                 # NEW: Onboarding tour
│   ├── AddRemoteSignerModal.tsx      # Signer modal
│   ├── CrewSection.tsx               # Crew display
│   ├── HarnessListFlow.tsx           # Harness inspection list
│   ├── ScaffoldHelpSheet.tsx         # Help sheet
│   └── ui.tsx                        # Button, Card, Input, Chip, Screen
│
├── lib/                              # Core services & utilities
│   ├── supabase.ts                   # Supabase client init
│   ├── session.tsx                   # Auth context provider
│   ├── services.real.ts              # Data layer (queries, mutations)
│   ├── theme.ts                      # Design tokens + colors
│   ├── pdf.ts                        # PDF generation
│   ├── offline.tsx                   # Offline support utilities
│   └── hooks/                        # Custom React hooks
│
├── types/
│   └── models.ts                     # Database schema types
│
├── supabase/                         # Database configuration
│   ├── migrations/0001_init.sql      # Schema + RLS
│   └── seed/01_system_templates.sql  # Seed data
│
├── docs/                             # Documentation
│   ├── WHATS_NEW.md                  # Latest updates (for all)
│   ├── AI_BRIEFING.md                # This file
│   └── prompts/                      # Feature-specific docs
│
├── CLAUDE.md                         # Development workflow rules
├── README.md                         # Project overview
├── BUG_REPORT.md                     # Known issues + resolutions
├── app.json                          # Expo config
├── metro.config.js                   # Metro bundler config
└── package.json                      # Dependencies
```

---

## Workflow Rules (from CLAUDE.md)

### Documentation
- **Always update docs in the same commit as code changes**
- Update `README.md` if you: add/remove top-level folders, change dev command, bump major deps, introduce/remove Known Issues
- Update `docs/` if you touch a documented flow
- Mark bugs in `BUG_REPORT.md` as resolved (with date + commit ref) instead of deleting
- Add short JSDoc for exported functions in `lib/` and `components/`
- Update Supabase schema notes in README if you add a migration

### Code
- Run `npm run typecheck` before committing (may fail per known issues — note new failures)
- Don't add error handling for scenarios that can't happen (trust internal guarantees)
- Default to no comments; only add if WHY is non-obvious
- Delete unused code completely; no `_` renames or "removed" comments
- Test UI changes in the browser before reporting done
- Avoid backwards-compatibility hacks

### Commits
- Commit code + docs together
- Use descriptive messages: `feat(scope): description` or `fix: description`
- Include `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>` if AI-generated

---

## Current State (2026-04-27)

### Last Commit
**67f461e** — `chore: update UI flows, components, and theme configuration`
- 28 files changed, 1209 insertions(+), 727 deletions(-)
- Auth flows, inspections, components, and theme tokens updated
- TourGuide component added
- Certificates preview route removed

### Active Development Areas
1. ✅ **Accessibility** — Tour guides, contextual help
2. ✅ **Design System** — DAXUIA integration, color tokens
3. 🔄 **UI Flows** — Auth, inspections, project management
4. 🔄 **Web Support** — Map fallbacks, responsive design
5. 📋 **Component Stability** — Ongoing refactoring

### Known Issues (Unresolved)
- App crashes (reason unknown)
- Phone rotation breaks signature canvas
- PDF export is slow
- Typecheck fails (ignored)

---

## Georgian Localization Rules

**⚠️ CRITICAL:** All UI strings are in Georgian, inline (no i18n file). Do not translate.

### Key Conventions
| Term | Georgian | Never Use |
|------|----------|-----------|
| Inspection (noun, artifact) | ინსპექცია | შემოწმება, ინსპექტირება |
| To inspect (verb) | შემოწმება | n/a |
| Email | ელ-ფოსტა | იმეილი |
| PDF artifact | PDF რეპორტი | PDF ანგარიში |
| Qualification | კვალიფიკაციის სერტიფიკატი | (short: სერტიფიკატი) |
| Project | პროექტი | |
| Template | შაბლონი | |
| Signature | ხელმოწერა | |
| Scaffold | ხარაჩო | |
| Harness | ქამარი | |
| You-form (polite) | თქვენ (თქვენ + verb suffix თ) | Never informal: შეიყვანე |

### Grammar Rule
Always use polite form: `შეიყვანეთ`, `აირჩიეთ`, `დააჭირეთ`, `დაამატეთ`, `შეამოწმეთ`  
Never: `შეიყვანე`, `აირჩიე`, `დააჭირე`, `დაამატე`, `შეამოწმე`

---

## Key Data Types & Models

**See `types/models.ts` for full schema.**

### User
- Authentication via Supabase Auth
- Role-based: expert (creates inspections) or worker (signs)

### Inspection (ინსპექცია)
- Tied to a Template
- Contains questionnaire answers (matrix-style)
- Can have multiple signers
- Generates PDF report

### Template (შაბლონი)
- Seeded system templates:
  1. ფასადის ხარაჩოს შემოწმების აქტი (facade scaffolding)
  2. დამცავი ქამრების შემოწმების აქტი (harness inspection)
- Defines the questionnaire structure

### Project (პროექტი)
- Groups inspections
- Has metadata (location, crew, etc.)

### Signatures (ხელმოწერა)
- Canvas-based signature capture
- Stored as image in Supabase Storage bucket: `signatures`

---

## Development Commands

```bash
# Install (required: --legacy-peer-deps for Radix/React 19)
npm install --legacy-peer-deps

# Run dev server
npx expo start

# Type checking (will fail, that's normal)
npm run typecheck

# Push to production
git push origin main

# View logs
expo logs
```

---

## Common Workflows

### Adding a New Screen
1. Create file in `app/` matching the routing convention
2. Import components from `components/`
3. Use data via `lib/services.real.ts`
4. If user-facing string: use Georgian
5. Update `README.md` directory layout if top-level

### Adding a Component
1. Create in `components/`
2. Add JSDoc for exported props/functions
3. Import theme tokens from `lib/theme.ts` for styling
4. Test in isolation + full app flow

### Fixing a Bug
1. Update `BUG_REPORT.md` with resolution (date + commit ref)
2. Don't delete the bug entry
3. Run `npm run typecheck` before commit
4. Update any related docs in same commit

### Updating Documentation
1. Make code change
2. Update docs in same commit:
   - `README.md` for structure/stack changes
   - `docs/WHATS_NEW.md` for user-facing updates
   - JSDoc for exported functions
3. Stage both code + docs together

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| "Why is my phone crashing?" | Try rotating it. If that doesn't work, restart. Then restart your life. |
| "Typecheck is failing" | That's normal. See CLAUDE.md. |
| "My English string is showing instead of Georgian" | Check `components/` and `app/` for hardcoded English. All UI must be Georgian. |
| "The PDF looks like hieroglyphics" | Missing Noto Sans Georgian bundle. On roadmap. |
| "I want to add i18n" | Don't. All strings are inline Georgian. If you need to change copy, edit the source. |
| "Should I update BUG_REPORT.md?" | Yes, always. Mark issues resolved instead of deleting. |
| "Where's the web version?" | Native Expo app only. Web support is experimental. |

---

## Escalation Points

- **App crashes:** Unknown cause. Debug via `expo logs`. Add to BUG_REPORT.md if new.
- **Signature canvas breaks on rotation:** Known issue. Roadmap fix pending.
- **PDF export slow:** Known issue. Likely Noto Sans bundling.
- **Typecheck failing:** Expected. See CLAUDE.md.
- **Can't connect Supabase:** Check `app.json` for credentials (baked in, not ideal but intentional).

---

## Resources

- **GitHub:** https://github.com/gilavi/Sarke2.0
- **Expo Docs:** https://docs.expo.dev
- **Supabase Docs:** https://supabase.com/docs
- **React Native Docs:** https://reactnative.dev

---

**Last sync:** 2026-04-27 | **Status:** ✅ Ready for development
