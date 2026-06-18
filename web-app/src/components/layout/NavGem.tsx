import type { NavIcon } from './navItems';

/**
 * Flat rail icon (refined-flat + glass). A single Phosphor glyph: a muted
 * outline at rest and a tinted solid (`weight="fill"`) when active; hover tints
 * it and gives a gentle spring lift. No tile / 3D extrusion - all styling and
 * animation live in the `.nav-gem` block in `index.css`, and the host
 * `.rail-link` supplies the per-item `--tint` var.
 *
 * @param icon    the Phosphor icon component for this nav item.
 * @param active  whether this item's route is active (renders the solid glyph).
 */
export function NavGem({ icon: Icon, active }: { icon: NavIcon; active: boolean }) {
  return (
    <span className="nav-gem" data-active={active ? '' : undefined} aria-hidden="true">
      <Icon className="nav-gem__icon" size={20} weight={active ? 'fill' : 'regular'} />
    </span>
  );
}
