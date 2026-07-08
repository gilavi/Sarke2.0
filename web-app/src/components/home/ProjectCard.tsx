import { Link } from 'react-router-dom';
import type { Project } from '@/lib/data/projects';
import { routes } from '@/app/routes';
import { osmTileUrl } from '@/lib/mapTile';

function projectInitials(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  return Array.from(trimmed).slice(0, 2).join('').toLocaleUpperCase('ka-GE');
}

/**
 * Home project card — a compact, whole-card link to the project detail page.
 * Map-tile header (desaturated OSM tile fading toward the bottom-left, same
 * treatment as the /projects card), logo/initials disc top-left and the
 * name + address bottom-left over the card surface.
 */
export function ProjectCard({ project }: { project: Project }) {
  const title = project.company_name || project.name;
  const tileUrl =
    project.latitude != null && project.longitude != null
      ? osmTileUrl(project.latitude, project.longitude)
      : null;

  return (
    <Link
      to={routes.projects.detail(project.id)}
      aria-label={`პროექტი: ${title}`}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="relative flex h-[148px] w-full flex-col justify-between overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 transition-colors group-hover:border-[var(--text-muted)]">
        {tileUrl ? (
          <>
            <img
              src={tileUrl}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover grayscale"
              style={{
                opacity: 0.85,
                WebkitMaskImage:
                  'radial-gradient(135% 135% at 100% 0%, #000 0%, rgba(0,0,0,0.45) 45%, transparent 78%)',
                maskImage:
                  'radial-gradient(135% 135% at 100% 0%, #000 0%, rgba(0,0,0,0.45) 45%, transparent 78%)',
              }}
            />
            <span className="absolute left-[80%] top-[28%] h-2 w-2 animate-pulse rounded-full bg-brand-500 ring-2 ring-white dark:ring-neutral-900" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-[var(--bg-hover)] dark:from-brand-950/30 dark:to-[var(--bg-hover)]" />
        )}

        {/* Logo / initials disc (top-left) */}
        <div className="relative z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900/40">
          {project.logo ? (
            <img src={project.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
              {projectInitials(title)}
            </span>
          )}
        </div>

        {/* Name + address (bottom-left) */}
        <div className="relative z-10 min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
            {title}
          </p>
          {project.address ? (
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">{project.address}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
