# `pages/landing` — public marketing site sections (web-app)

## What this module does
Holds the sections for the **multi-page** public marketing site. Each route page
under `pages/` (`Landing` = Home, `About`, `Pricing`, `Legislation`, `Contact`) is a
thin wrapper that composes sections from here. Shared chrome (navbar/footer/overlays)
and the logged-in→`/home` redirect live in `components/layout/MarketingLayout.tsx`,
which wraps all five routes via `<Outlet/>` in `app/router.tsx`.

Light-only by design — these pages do **not** use `dark:` variants (the dashboard does).

## Public API (section exports, consumed by the page wrappers)
- `chrome.tsx` → `Navbar`, `Footer` — route-link navbar (NavLink) + footer; used by `MarketingLayout`.
- `faq.tsx` → `FAQ({ items, title? })` — reusable accordion; each page passes its own array.
- `home.tsx` → `Hero`, `PainSection`, `Transition`, `HowItWorks`.
- `home-features.tsx` → `FeaturesGrid` (incl. the 4 product pillars), `ForWho`.
- `home-cta.tsx` → `PriceTeaser`, `DownloadCTA`, `RegulationsTeaser`.
- `about.tsx` → `Mission`, `WhoWeAre`, `Team`, `Social`.
- `pricing.tsx` → `Pricing` (cards), `PricingComparison` (table).
- `legislation.tsx` → `LegislationHero`, `ArticleList` (reuses `REGULATIONS` from `lib/data/regulations`).
- `contact.tsx` → `ContactHero`, `ContactInfo` (the AI chat lives in `components/marketing/ChatWidget`).
- `marketing-data.ts` → all Georgian copy + `FAQItem` type. Edit content here, not in components.
- `shared.tsx` → `fadeUp`, `stagger`, `AppStoreBadge`, `PlayStoreBadge`, `PhoneMockup`, `appleIcon`, `APP_STORE_URL`.
- `overlays.tsx` → `StickyMobileBar`, `ExitIntentPopup`, `CookieBanner` (mounted by the layout).

## Internal files
Section components are presentational + framer-motion scroll reveals. No data fetching
except `legislation`/`home-cta` reading the static `REGULATIONS` array (titles/urls only —
**never** call `maybeRefreshRegulations` here; that needs a JWT).

## Gotchas
- **HashRouter + `#anchor` hrefs:** a plain `<a href="#features">` is hijacked into a route
  change (`/features` → NotFound). Use route `<Link>`/`scrollIntoView` buttons. Store badges
  use `APP_STORE_URL` (currently `#` placeholder → home; TODO real store URL).
- `/legislation` is the **public** regulations page — do not confuse with the **protected**
  `/regulations` dashboard route.
- Team/social/blog content are placeholders marked `// TODO: real` in `marketing-data.ts`.
- Keep files under the 200-line component target; that's why Home is split across 3 files.

## Canonical helpers
- Layout: `components/layout/MarketingLayout.tsx`. Routes: `app/routes.ts` (+ `router.tsx`).
- AI chat: `components/marketing/ChatWidget.tsx` → `lib/data/ai-chat.ts` → `ai-chat` Edge Function.
- `cn` from `@/lib/utils`; toasts from `sonner`.
