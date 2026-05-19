import { useState, useEffect } from 'react';
import { MapPin, X, Check } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons broken by Vite's asset pipeline
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  value: string;
  onChange: (address: string) => void;
  onCoords?: (lat: number | null, lng: number | null) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  id?: string;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export function AddressInput({ value, onChange, onCoords, initialLat, initialLng, id }: Props) {
  const [open, setOpen] = useState(false);
  const [marker, setMarker] = useState<[number, number] | null>(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null,
  );

  useEffect(() => {
    if (initialLat != null && initialLng != null) setMarker([initialLat, initialLng]);
  }, [initialLat, initialLng]);

  async function pick(lat: number, lng: number) {
    setMarker([lat, lng]);
    onCoords?.(lat, lng);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      );
      const data = await res.json();
      if (data.display_name) onChange(data.display_name);
    } catch {
      onChange(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }

  const center: [number, number] = marker ?? [41.6938, 44.8015];

  return (
    <>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="მისამართი"
          className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 pr-9 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="რუკაზე არჩევა"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-600 dark:hover:bg-neutral-800 dark:hover:text-brand-400"
        >
          <MapPin size={14} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-neutral-950">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
            >
              <X size={18} />
            </button>
            <div className="flex-1">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">რუკაზე არჩევა</p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                {marker ? 'მდებარეობა არჩეულია' : 'დააჭირეთ მდებარეობის ასარჩევად'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={!marker}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={13} />
              არჩევა
            </button>
          </div>

          {/* Map */}
          <div className="flex-1 overflow-hidden">
            <MapContainer
              center={center}
              zoom={marker ? 15 : 13}
              className="h-full w-full"
              style={{ height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ClickHandler onPick={pick} />
              {marker && <Marker position={marker} />}
            </MapContainer>
          </div>
        </div>
      )}
    </>
  );
}
