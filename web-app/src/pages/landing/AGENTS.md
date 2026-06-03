# `pages/landing` — public marketing site sections (web-app)

## What this module does
Holds the sections for the **multi-page** public marketing site. Each route page
under `pages/` (`Landing` = Home, `About`, `Pricing`, `Legislation`, `Contact`) is a
thin wrapper that composes sections from here. Shared chrome (navbar/footer/overlays)
and the logged-in→`/home` redirect live in `components/layout/MarketingLayout.tsx`,
which wraps all five routes via `<Outlet/>` in `app/router.tsx`.

Light-only by design — these pages do **not** use `dark:` variants (the dashboard does).

## Brand palette (Hubble brand board)
The marketing site uses the **Hubble brand-board** palette (tokens in
`tailwind.config.ts`), which is distinct from the dashboard's emerald `brand` scale:
- `safety-*` — SAFETY ORANGE (`#FF5A1F` at 500): primary action / accent — buttons,
  links (`safety-600/700`), icon chips (`bg-safety-50` + `text-safety-600`), active nav,
  the orange CTA band (`safety-700`).
- `hivis` — HI-VIS YELLOW (`#E6FF4D`): high-energy spotlight, used **sparingly** —
  eyebrow "sticker" pills (`bg-hivis text-graphite-900`) and the stats numbers.
- `graphite-*` — warm near-black (`graphite-900` `#161614` for dark sections,
  `graphite-800` cards, `graphite-700` borders): every dark band.
- `offwhite` (`#F2F1EC`) — warm page background; `concrete` (`#D6D6D1`) — muted body
  text / borders on graphite.

Do **not** reintroduce `brand-*` (green) or the old dark-green hexes (`#0F2318`,
`#0A1C12`, `#147A4F`, `#75C3A5`, …) here — those are the dashboard/`web/` identity.
Only this folder + `components/layout/MarketingLayout` + `components/marketing/ChatWidget`
carry the board palette.

**Logo:** `HubbleLogo` (in `shared.tsx`) — the Hubble H-monogram (rounded square + diagonal
wave), a single `fill="currentColor"` evenodd SVG path so it recolors via text color.
Navbar/footer render it in `text-graphite-900` next to the `HUBBLE` wordmark; the mobile
bar / exit popup use it white-on-`safety-500` tiles. `public/favicon.svg` is the same mark
as the orange app-icon tile. To replace with an official vector, swap the single `<path d>`
in `HubbleLogo` (keep the `0 0 120 112` viewBox or update both call sites' aspect).

**Pattern system:** `components/marketing/BrandPattern.tsx` — the board's "orbital paths"
motif. `OrbitRings` (concentric rings + orange/hi-vis orbiting dots, `currentColor`),
`DotGrid` (dot texture, `currentColor`, pass a unique `id` per instance), and the sticker
badges `HazardSticker` / `RoundSticker`. All decorative + `aria-hidden`; the caller tints
rings/grids via text color (`text-graphite-900/[0.06]` on light, `text-white/[0.06]` on dark)
and positions them absolutely inside a `relative overflow-hidden` section.

## Public API (section exports, consumed by the page wrappers)
- `chrome.tsx` → `Navbar`, `Footer` — route-link navbar (NavLink) + footer; used by `MarketingLayout`.
- `faq.tsx` → `FAQ({ items, title? })` — reusable accordion; each page passes its own array.
- `home.tsx` → `Hero`, `PainSection`, `Transition`, `HowItWorks`.
- `home-features.tsx` → `FeaturesGrid` (incl. the 4 product pillars), `ForWho`.
- `home-cta.tsx` → `PriceTeaser`, `DownloadCTA`, `RegulationsTeaser`.
- `home-statement.tsx` → `BrandStatement` — editorial graphite band ("safety isn't a slogan…") with the orbital motif + a hazard sticker.
- `about.tsx` → `Mission`, `WhoWeAre`, `Team`, `Social`.
- `pricing.tsx` → `Pricing` (cards), `PricingComparison` (table).
- `legislation.tsx` → `LegislationHero`, `ArticleList` (reuses `REGULATIONS` from `lib/data/regulations`).
- `contact.tsx` → `ContactHero`, `ContactInfo` (the AI chat lives in `components/marketing/ChatWidget`).
- `marketing-data.ts` → all Georgian copy + `FAQItem` type. Edit content here, not in components.
- `shared.tsx` → `HubbleLogo` (brand mark), `fadeUp`, `stagger`, `AppStoreBadge`, `PlayStoreBadge`, `PhoneMockup`, `appleIcon`, `APP_STORE_URL`.
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
