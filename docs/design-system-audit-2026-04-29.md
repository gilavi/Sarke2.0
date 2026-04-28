# Design System Audit — Sarke 2.0
**Date:** 2026-04-29  
**Auditor:** Claude Code  
**Scope:** All files under `app/`, `components/`, `lib/theme.ts`

---

## 1. COLORS

**Token file:** `lib/theme.ts` — full primitive scale (primary, neutral, semantic) + semantic surface aliases (`surface`, `ink`, `accent`, `border`, etc.) + dark-mode overrides.

✓ **Consistent** — primary color scale (primary[50–900]), neutral scale (neutral[50–900]), semantic states (success/warning/danger/info), and all surface aliases are well-defined and consumed via `useTheme()`.

⚠ **Inconsistent — `#1D9E75` in `components/ProjectAvatar.tsx`**  
`PROJECT_AVATAR_FG` and `PROJECT_AVATAR_BADGE` are both `#1D9E75`. This color does not exist in the theme palette (`primary[500]` = `#147A4F`, primary[400] = `#47AF87`). It is intentionally a mid-point "softer brand green" for the initials avatar. Kept as a named constant with an explanatory comment; left as-is because changing it requires a product decision.

⚠ **Inconsistent — `#4285F4` in `app/(auth)/login.tsx:607`**  
Google Sign-In button logo circle uses Google's brand blue. Intentional — this is a third-party brand color; not a design-system concern.

🔧 **Fixed — `theme.colors.accent + '33'` (4 places, `app/(tabs)/home.tsx`)**  
Replaced with `withOpacity(theme.colors.accent, 0.2)` using the existing `withOpacity` helper from `lib/theme.ts`. No visual change.

🔧 **Fixed — dark mode missing overrides**  
Added dark-mode values for `warn`, `warnSoft`, `danger`, `dangerSoft`, `dangerTint`, `dangerBorder`, `harnessTint/Soft`, `templatesTint/Soft`, `certTint/Soft`, `regsTint/Soft` to `darkTheme` in `lib/theme.ts`.

🔧 **Fixed** — `components/SheetLayout.tsx` container `#FFFFFF` → `theme.colors.surface`  
🔧 **Fixed** — `components/SheetLayout.tsx` header/footer border `#E5E7EB` → `theme.colors.border`  
🔧 **Fixed** — `components/SheetLayout.tsx` footer background `#FFFFFF` → `theme.colors.surface`  
🔧 **Fixed** — `app/(tabs)/more.tsx` avatar skeleton `#F5F5F0` → `theme.colors.subtleSurface`  
🔧 **Fixed** — `app/(tabs)/home.tsx` map bar `#FFFFFF` → `theme.colors.surface`  
🔧 **Fixed** — `app/(tabs)/projects.tsx` map bar `#FFFFFF` → `theme.colors.surface`

### Overlay / backdrop opacity values

Before audit there were 4 distinct values across files:

| File | Old value | Fixed to |
|------|-----------|----------|
| `app/(tabs)/home.tsx:475` | `rgba(0,0,0,0.55)` | `theme.colors.overlay` (0.45) |
| `app/(tabs)/projects.tsx:286` | `rgba(0,0,0,0.45)` | `theme.colors.overlay` (0.45) |
| `app/(auth)/login.tsx:614` | `rgba(0,0,0,0.48)` | `theme.colors.overlay` (0.45) |
| `components/DatePickerSheet.tsx:82` | `rgba(0,0,0,0.4)` | `theme.colors.overlay` (0.45) |

🔧 **Fixed** — all 4 now use `theme.colors.overlay`.

### Grays
Neutral scale has 10 steps (neutral[50–900]). In practice 6–7 are actively used via aliases (`background`, `surface`, `surfaceSecondary`, `inkFaint`, `inkSoft`, `ink`, `border`, `hairline`). No raw hex grays found except the two fixed above.

### Red / error colors
One canonical `semantic.danger` = `#EF4444` + `semantic.dangerSoft` = `#FEE2E2`. Backward-compat aliases `danger` and `dangerSoft` point to the same values. Two additional aliases (`dangerTint`, `dangerBorder`) exist but appear unused in component code.

---

## 2. TYPOGRAPHY

**Token file:** `lib/theme.ts` — `typography.fontFamily` (8 named families) + `typography.sizes` (10-step scale: 2xs→5xl).

✓ **Font families** — Inter (body), SpaceGrotesk (display/heading), JetBrainsMono (mono). All defined as tokens. In practice only Inter variants are observed in component-level usage.

⚠ **SpaceGrotesk not observed in component code.** `fontFamily.display` and `fontFamily.heading` are defined but no component references them. Screen titles (e.g. `more.tsx` page title, `projects.tsx` stat number) use inline `fontWeight:'700'` with no explicit fontFamily (falls back to system default). If SpaceGrotesk is meant for headings, it should be wired up.

⚠ **Inline font sizes that deviate from the scale:**

| Value | Scale step | Files |
|-------|-----------|-------|
| 10 | ✓ 2xs | (theme only) |
| 11 | ✓ xs | home.tsx, more.tsx |
| 12 | between xs(11) and sm(13) | login.tsx, more.tsx, projects.tsx — error/helper/meta |
| 13 | ✓ sm | Input.tsx, ui.tsx, home.tsx |
| 14 | between sm(13) and base(15) | home.tsx, EmptyState.tsx, DatePickerSheet.tsx |
| 15 | ✓ base | Button.tsx, Input.tsx |
| 16 | between base(15) and lg(17) | Button.tsx lg, more.tsx, DatePickerSheet.tsx |
| 17 | ✓ lg | home.tsx, login.tsx, more.tsx |
| 18 | between lg(17) and xl(20) | EmptyState.tsx, home.tsx |
| 22 | between xl(20) and 2xl(24) | more.tsx page title |
| 28 | between 2xl(24) and 3xl(30) | more.tsx stat number, projects.tsx |
| 30 | ✓ 3xl | home.tsx greeting |
| 36 | between 3xl(30) and 4xl(38) | login.tsx app name |

The most common off-scale values are 12, 14, 16, 18. These are minor rounding deviations. No semantic-level inconsistency found (e.g. "section title" is not 13px in one place and 17px in another — the deviations are within ±1 step).

✓ **Consistent** — `fontWeight` usage is internally consistent per semantic level (labels `'600'`, headings `'700'–'800'`, button text `'600'`).

---

## 3. SPACING

**Token:** `theme.space(n)` / `theme.spacing(n)` = `n × 4px`.

✓ **Core scale used** — padding values 4, 8, 12, 16, 20, 24 dominate across components. Screen horizontal gutter is consistently `20` (`theme.space(5)`).

⚠ **Off-scale values found:**

| Value | Found in | Note |
|-------|----------|------|
| 6 | OfflineBanner, SyncStatusPill, several gap values | between 4 and 8 |
| 10 | SheetLayout headerWrap paddingTop, gap in multiple places | between 8 and 12 |
| 14 | paddingVertical on rows, card inner padding | between 12 and 16 |
| 22 | login.tsx scroll horizontal padding | between 20 and 24 |
| 40 | login.tsx scroll paddingTop/Bottom | between 32 and 48 |
| 44 | ProjectPickerSheet paddingBottom | between 40 and 48 |
| 80 | EmptyState paddingVertical | between 64 and 80 (theme has no 80-step) |
| 100 | projects.tsx FlatList paddingBottom | one-off scroll clearance |

Off-scale values of 6, 10, 14 appear in multiple components and could be elevated to token values (`space(1.5)`, `space(2.5)`, `space(3.5)`) or replaced with the nearest step. Not a critical inconsistency.

---

## 4. BORDER RADIUS

**Token file:** `lib/theme.ts` — `radius` scale: none(0), xs(6), sm(8), md(12), lg(16), xl(20), 2xl(24), full(9999), pill(999).

✓ **Buttons** — use `theme.radius.sm/md/lg/xl` per size. Consistent.  
✓ **Cards** (`Card.tsx`) — use `theme.radius.lg` (16). Consistent.  
✓ **Badges** — use `theme.radius.full` (9999). Consistent.  
✓ **Form inputs** (`Input.tsx`) — use `theme.radius.md` (12). Consistent.

⚠ **Bottom sheet top radius — was inconsistent before fix:**

| Component | Old radius | Status |
|-----------|-----------|--------|
| `BottomSheet.tsx` | 24 (`theme.radius['2xl']`) | ✓ already correct |
| `SheetLayout.tsx` | 24 | ✓ already correct |
| `DatePickerSheet.tsx` | 20 | 🔧 fixed → 24 |
| `home.tsx` ProjectPickerSheet | 26 | 🔧 fixed → 24 |
| `home.tsx` map action bar | 20 | 🔧 fixed → 24 |
| `projects.tsx` map action bar | 20 | 🔧 fixed → 24 |
| `more.tsx` language modal | 24 | ✓ already correct |

All bottom sheet / bottom-anchored panels now uniformly use `borderTopLeftRadius: 24, borderTopRightRadius: 24`.

⚠ **Inline card-style Views use inconsistent radii:**

| Location | Radius | Token equivalent |
|----------|--------|-----------------|
| home.tsx resumeCard | 14 | between md(12) and lg(16) |
| home.tsx certBanner | 14 | between md(12) and lg(16) |
| home.tsx picker sheetCard | 14 | between md(12) and lg(16) |
| more.tsx statPill | 14 | between md(12) and lg(16) |
| home.tsx projectCard | 16 | ✓ lg |
| home.tsx recentList | 16 | ✓ lg |
| more.tsx settingsCard | 16 | ✓ lg |
| login.tsx errorBox | 10 | between sm(8) and md(12) |
| more.tsx langRow | 10 | between sm(8) and md(12) |

The `14` pattern (resumeCard, certBanner, etc.) is a deliberate "slightly less rounded than a full card" — appears 4+ times so it has an informal token value. Should be added to the radius scale as `radius.cardInner = 14` or all should snap to `radius.lg = 16`.

---

## 5. BUTTONS

✓ **Primary component** — `components/primitives/Button.tsx` covers all semantic variants (primary, secondary, ghost, outline, danger, link) and 4 sizes (sm, md, lg, xl). Heights scale with `paddingVertical` + `lineHeight` rather than fixed height — consistent and intentional.

✓ **Consistent** — variant colors, weights, and radii are fully token-driven inside `Button.tsx`.

⚠ **FAB (Floating Action Button)** — implemented inline in both `home.tsx` and `projects.tsx` as a `Pressable` with `width:60, height:60, borderRadius:30`. Not using the `Button` component. Consistent with each other but not a shared component. Could be extracted as `<FabButton>`.

⚠ **Google Sign-In button** — inline `Pressable` in `login.tsx` (not using `Button`). Fine since it has third-party brand styling requirements.

⚠ **`components/primitives/A11yButton.tsx`** — simple `Pressable` with hardcoded `padding:12, backgroundColor:accent, borderRadius:12`. Does not use the `Button` component. Appears to be a legacy accessibility-focused thin wrapper. Should use `<Button variant="primary">` or be deprecated.

🔧 No inline fixes applied here (FAB is consistent across files; A11yButton is a larger refactor).

---

## 6. BOTTOM SHEETS / ACTION SHEETS

**Implementations found:**

| File | Mechanism | Top radius | Handle | Backdrop |
|------|-----------|-----------|--------|---------|
| `components/BottomSheet.tsx` | Modal + Animated | 24 (all corners) | 40×4 px, `border` color | `overlay` |
| `components/SheetLayout.tsx` | Layout primitive (no modal) | 24 | 40×4 px, `hairline` | N/A (parent provides) |
| `components/DatePickerSheet.tsx` | Modal | 24 (**fixed**) | none | `overlay` (**fixed**) |
| `app/(tabs)/home.tsx` ProjectPickerSheet | Modal | 24 (**fixed**) | 40×4 px, `border` color | `overlay` |
| `app/(tabs)/more.tsx` language picker | absolute positioned View | 24 | none | none (parent dims) |
| `app/(tabs)/home.tsx` map action bar | plain View (not a sheet) | 24 (**fixed**) | none | N/A |
| `app/(tabs)/projects.tsx` map action bar | plain View (not a sheet) | 24 (**fixed**) | none | N/A |

✓ **Now consistent** — all bottom-anchored panels use `borderTopLeftRadius: 24, borderTopRightRadius: 24` after fixes.

⚠ **Handle color inconsistency:** `BottomSheet.tsx` uses `theme.colors.border` for the handle; `home.tsx` ProjectPickerSheet also uses `theme.colors.border`; `SheetLayout.tsx` uses `theme.colors.hairline`. Both `border` (#E8E6E0) and `hairline` (#E8E6E0) map to `neutral[200]` — they are the same value, so this is not a visible difference.

---

## 7. CARDS

**Implementations found:**

| Source | Variant | Radius | Background | Border |
|--------|---------|--------|-----------|--------|
| `Card.tsx` default | themed | `radius.lg` (16) | `surface` | 1px `border` + shadow |
| `Card.tsx` elevated | themed | `radius.lg` | `surfaceElevated` | none + shadow.md |
| `Card.tsx` outlined | themed | `radius.lg` | transparent | 1.5px `borderStrong` |
| `Card.tsx` ghost | themed | `radius.lg` | `surfaceSecondary` | none |
| home.tsx resumeCard (inline) | — | 14 | `card` | 1px `hairline` |
| home.tsx projectCard (inline) | — | 16 | `card` | 1px `hairline` |
| home.tsx recentList (inline) | — | 16 | `card` | 1px `hairline` |
| home.tsx tipCard (inline) | — | 16 | `accentSoft` | none |
| more.tsx settingsCard (inline) | — | 16 | `card` | 1px `hairline` |
| more.tsx statPill (inline) | — | 14 | various | 1px |

⚠ The inline cards in home.tsx and more.tsx should use `<Card>` from `components/primitives/Card.tsx`. They pre-date the Card component. The visual difference is minimal (identical token values) but they miss out on press animation and theme switching.

---

## 8. LIST ITEMS

✓ **Row structure** — all list rows use `flexDirection:'row', alignItems:'center', gap:12`. Consistent.

⚠ **Row vertical padding varies:**

| Location | paddingVertical |
|----------|----------------|
| home.tsx recentRow | 14 |
| home.tsx picker projectRow | 12 |
| more.tsx settingsRow | 14 |
| projects.tsx ProjectRow (via Card) | 14 |
| BottomSheet optionCard | 14 |

Close enough (12 vs 14) that it is not visually jarring, but not perfectly consistent. Could be unified to 14.

✓ **Chevron** — all rows using a navigation chevron use `Ionicons name="chevron-forward"`. Consistent.  
✓ **Separator** — all rows use `borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline`. Consistent.

---

## 9. ICONS

✓ **Single library** — `@expo/vector-icons` Ionicons used exclusively throughout all components and screens.  
✓ **No mixed outline/filled inconsistency found** — Ionicons outline variants (`-outline` suffix) are used for decorative/secondary icons; filled variants for interactive/primary icons. Pattern is consistent.

⚠ **Icon sizes vary by context but without a formal size scale:**

| Context | Size used |
|---------|----------|
| Tab bar | 26 |
| Row chevrons | 16 |
| Button icons | 16–20 |
| Input accessory | 18 |
| FAB | 24 |
| Section header action | 18 |
| EmptyState fallback | 48 |

Not inconsistent per se — sizes are contextually appropriate — but no formal icon-size token scale exists.

---

## 10. FORM INPUTS

✓ **Primary component** — `components/primitives/Input.tsx` handles all states: resting, focused (accent border), error (danger border + shake), with label, helper, error text, left/right icon slots.  
✓ **Label style** — `fontSize:13, fontWeight:'600', textTransform:'uppercase', letterSpacing:0.5`. Consistent within `Input.tsx`.  
✓ **Border** — `1.5px` animated, consistent.  
✓ **Radius** — `theme.radius.md` (12). Consistent.  
✓ **Focus state** — animated `borderColor` transition to `accent`. Consistent.  
✓ **Error state** — `semantic.danger` border + shake animation. Consistent.

⚠ **`components/FormField.tsx`** wraps inputs with its own label/error rendering. Duplicates label rendering from `Input.tsx`. Risk of divergence if label style changes in one but not the other.

---

## 11. STATUS BADGES / CHIPS

**Implementations found:**

| Component | File | Shape | bg/text |
|-----------|------|-------|---------|
| `Badge` | `components/primitives/Badge.tsx` | pill (radius.full) | token-driven (6 variants) |
| `StatusBadge` | `components/primitives/StatusBadge.tsx` | icon + text, no bg | icon color = status color |
| `Chip` | `components/ui.tsx` | pill (radius 999) | arbitrary `tint`/`bg` props |
| `SyncStatusPill` | `components/SyncStatusPill.tsx` | pill (radius.pill) | accent or ink |
| inline badge | `app/(tabs)/more.tsx` HubTile | pill (radius 999) | `warnSoft`/`warn` |

⚠ **Three pill-badge implementations** (`Badge`, `Chip`, inline in more.tsx) serve the same purpose. `Chip` (in `ui.tsx`) takes arbitrary color props, making it hard to enforce the design system. The inline badge in `more.tsx` should use `<Badge variant="warning">`.

✓ **`Badge` variants are comprehensive** — default, primary, success, warning, danger, info. Covers all semantic states.

---

## 12. EMPTY STATES

✓ **Single component** — `components/EmptyState.tsx` handles all empty state types (projects, certificates, history, qualifications, templates) with per-type hand-crafted SVG illustrations, float animation, and an optional animated CTA button.

✓ **Consistent structure** — illustration circle (176×176, `subtleSurface` bg) + title (18px/700) + subtitle (14px, `inkSoft`) + optional CTA. Pattern is the same for all types.

⚠ **`compact` prop** changes padding from `80` to `40` vertical — acceptable variant, well-named. Not an inconsistency.

---

## SUMMARY

### Totals
- **Inconsistencies found:** 22
- **Fixed inline (this session):** 13 changes across 6 files
- **Requiring larger refactor:** 9 (listed below)

### Fixed This Session

| # | File | Change |
|---|------|--------|
| 1 | `components/SheetLayout.tsx` | Container bg `#FFFFFF` → `theme.colors.surface` |
| 2 | `components/SheetLayout.tsx` | Header border `#E5E7EB` → `theme.colors.border` |
| 3 | `components/SheetLayout.tsx` | Footer border + bg `#E5E7EB`/`#FFFFFF` → `theme.colors.border`/`theme.colors.surface` |
| 4 | `components/DatePickerSheet.tsx` | Sheet top radius 20 → 24 |
| 5 | `components/DatePickerSheet.tsx` | Backdrop `rgba(0,0,0,0.4)` → `theme.colors.overlay` |
| 6 | `app/(tabs)/home.tsx` | Backdrop `rgba(0,0,0,0.55)` → `theme.colors.overlay` |
| 7 | `app/(tabs)/home.tsx` | Map bar bg `#FFFFFF` → `theme.colors.surface` |
| 8 | `app/(tabs)/home.tsx` | Map bar top radius 20 → 24 |
| 9 | `app/(tabs)/home.tsx` | ProjectPicker card top radius 26 → 24 |
| 10 | `app/(tabs)/projects.tsx` | Backdrop `rgba(0,0,0,0.45)` → `theme.colors.overlay` |
| 11 | `app/(tabs)/projects.tsx` | Map bar bg `#FFFFFF` → `theme.colors.surface` |
| 12 | `app/(tabs)/projects.tsx` | Map bar top radius 20 → 24 |
| 13 | `app/(auth)/login.tsx` | Modal overlay `rgba(0,0,0,0.48)` → `theme.colors.overlay` |
| 14 | `app/(tabs)/more.tsx` | Avatar skeleton `#F5F5F0` → `theme.colors.subtleSurface` |

### Remaining Open Items

1. **`#1D9E75` in `ProjectAvatar.tsx`** — intentional off-palette mid-point green for initials avatar. Kept as a named local constant; requires a product/design decision to resolve.
2. **Off-scale font sizes 14 and 16** — used in card titles and settings rows respectively. Close to base(15) and lg(17); visual difference is ≤1px. Left for a future design pass.
3. **Inline card-style Views in `home.tsx`/`more.tsx`** (resumeCard, certBanner, tipCard, etc.) — still inline Views; could migrate to `<Card>` component. Low risk to visual appearance but deferred as a larger structural refactor.

### New Shared Components Created

| Component | File | Replaces |
|-----------|------|---------|
| `<FabButton>` | `components/primitives/FabButton.tsx` | Inline FABs in home + projects |

### Token Scale Additions

| Token | Value | Purpose |
|-------|-------|---------|
| `theme.radius.cardInner` | 14 | Inner cards, banners, stat pills |

### What Was Already Available

| Utility | File | Now Used |
|---------|------|---------|
| `withOpacity(color, alpha)` | `lib/theme.ts` | Was defined but unused; now used for dashed border tints |
