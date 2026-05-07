import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { MapPin, ExternalLink, ArrowRight, X } from 'lucide-react';

L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface ProjectPin {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
}

function FitBounds({ pins }: { pins: ProjectPin[] }) {
  const map = useMap();
  if (pins.length === 1) {
    map.setView([pins[0].latitude, pins[0].longitude], 15);
  } else if (pins.length > 1) {
    map.fitBounds(pins.map((p) => [p.latitude, p.longitude] as [number, number]), { padding: [40, 40] });
  }
  return null;
}

function MapClickDismiss({ onDismiss }: { onDismiss: () => void }) {
  useMapEvents({ click: onDismiss });
  return null;
}

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
      <div className={`flex items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-400 ${className ?? 'h-64'}`}>
        GPS კოორდინატები მითითებული არ არის
      </div>
    );
  }

  const center: [number, number] = [pins[0].latitude, pins[0].longitude];

  return (
    <div className={`relative overflow-hidden rounded-xl ${className ?? 'h-64 w-full'}`}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pins={pins} />
        <MapClickDismiss onDismiss={() => setSelected(null)} />
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.latitude, pin.longitude]}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                setSelected(pin);
              },
            }}
          />
        ))}
      </MapContainer>

      {/* Card overlay — rendered in React, full Tailwind support */}
      {selected && (
        <div className="absolute bottom-4 left-1/2 z-[1000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
          <div className="rounded-2xl bg-white shadow-xl ring-1 ring-black/8">
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  <div>
                    <p className="font-semibold text-neutral-900 leading-snug">{selected.name}</p>
                    {selected.address && (
                      <p className="mt-0.5 text-xs text-neutral-500">{selected.address}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
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
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    <ExternalLink size={14} />
                    Google Maps
                  </a>
                ) : (
                  <button
                    onClick={() => navigate(`/projects/${selected.id}`)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
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
    </div>
  );
}
