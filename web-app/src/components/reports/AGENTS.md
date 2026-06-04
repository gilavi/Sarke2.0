# components/reports

## What this module does

UI pieces for the **report detail** page (`pages/ReportDetail.tsx`) — slide-based
visual safety reports. Extracted from the page so it stays under the file-size
target and so each slide can own its editing state and animation.

## Public API

- **`SlideCard`** — one report slide.
  - Props: `slide`, `index`, `editable` (draft mode), `imageUrl?`, `onSave(patch) => Promise`, `onRemove()`, `isRemoving?`.
  - In draft mode the title/description are **controlled** inputs. On blur it calls
    `onSave`; if `onSave` rejects, the field **reverts to the last-saved value** and a
    toast is shown. Local edits resync to the server value via the "store previous
    value during render" pattern (no effect), so an unchanged refetch never clobbers
    an in-progress edit.
  - It is a framer-motion `layout` item with a spring entrance/exit, so the parent
    list animates add/remove when wrapped in `<AnimatePresence>`.

## Internal files

- `SlideCard.tsx` — the only component here today.

## Gotchas

- `onSave` **must reject on failure** (pass `mutateAsync`, not `mutate`) — the revert
  logic depends on the rejection.
- The delete button is the parent's responsibility to defer (the page shows a sonner
  undo toast and only commits the destructive delete — which also removes the storage
  blob — when the undo window elapses). `SlideCard` just calls `onRemove()`.
- The delete button carries an `aria-label`; keep it when editing.

## Canonical helpers it consumes

- `@/lib/errors` → `toastError` (humanized error toast on a failed field save).
- `@/lib/animations` → `SPRING` (entrance/exit spring).
