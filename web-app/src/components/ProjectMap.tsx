import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ExternalLink, ArrowRight, X } from 'lucide-react';

export interface ProjectPin {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
}

/* ─── Component ─── */

interface ProjectMapProps {
  pins: ProjectPin[];
  singlePin?: boolean;
  className?: string;
}

export default function ProjectMap({ pins, singlePin = false, className }: ProjectMapProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<ProjectPin | null>(null);

  if (pins.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500 ${className ?? 'h-64'}`}
      >
        GPS კოორდინატები მითითებული არ არის
      </div>
    );
  }

  const firstPin = pins[0];
  const embedUrl = `https://maps.google.com/maps?q=${firstPin.latitude},${firstPin.longitude}&z=${singlePin ? 15 : 13}&output=embed`;

  return (
    <div className={`relative overflow-hidden rounded-xl ${className ?? 'h-72 w-full'}`}>
      <iframe
        src={embedUrl}
        title="Map"
        className="h-full w-full border-0"
        style={{ filter: 'grayscale(0)' }}
        loading="lazy"
        allowFullScreen
      />

      {/* Selected pin card */}
      {selected && (
        <div className="absolute bottom-4 left-1/2 z-[1000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
          <div className="rounded-2xl bg-white ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
                  <div>
                    <p className="font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
                      {selected.name}
                    </p>
                    {selected.address && (
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{selected.address}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="shrink-0 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                {singlePin ? (
                  <a
                    href={`https://maps.google.com/?q=${selected.latitude},${selected.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
                  >
                    <ExternalLink size={14} />
                    Google Maps
                  </a>
                ) : (
                  <button
                    onClick={() => navigate(`/projects/${selected.id}`)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
                  >
                    პროექტის გახსნა
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pin selector chips (only for multi-pin) */}
      {!singlePin && pins.length > 1 && (
        <div className="absolute bottom-3 left-3 right-3 z-[500] flex gap-2 overflow-x-auto pb-1">
          {pins.map((pin) => (
            <button
              key={pin.id}
              onClick={() => setSelected(pin)}
              className="shrink-0 rounded-full border border-neutral-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur transition hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              <span className="flex items-center gap-1">
                <MapPin size={10} className="text-brand-500" />
                {pin.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Top-right link */}
      <a
        href={`https://maps.google.com/?q=${firstPin.latitude},${firstPin.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-3 top-3 z-[500] rounded-lg border border-neutral-200 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur transition hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200 dark:hover:bg-neutral-900"
      >
        Google Maps-ზე გახსნა →
      </a>
    </div>
  );
}
