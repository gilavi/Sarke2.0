import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getIncident,
  signedIncidentPdfUrl,
  signedIncidentPhotoUrl,
  INCIDENT_TYPE_LABEL,
} from '@/lib/data/incidents';

export default function IncidentDetail() {
  const { id } = useParams();
  const { data: item, error: queryError, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => getIncident(id!),
    enabled: !!id,
  });
  const { data: photoUrls = [] } = useQuery({
    queryKey: ['incidentPhotos', id, item?.photos],
    queryFn: async () =>
      Promise.all((item?.photos ?? []).map((p) => signedIncidentPhotoUrl(p).catch(() => ''))),
    enabled: !!item && item.photos.length > 0,
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const error = actionError ?? (queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null);

  async function openPdf() {
    if (!item?.pdf_url) return;
    try {
      setOpening(true);
      const url = await signedIncidentPdfUrl(item.pdf_url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(false);
    }
  }

  if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (!item) return <p className="text-sm text-neutral-500">ინციდენტი ვერ მოიძებნა.</p>;

  return (
    <div className="space-y-6">
      <header>
        <Link to="/incidents" className="text-sm text-brand-600 hover:underline">
          ← ინციდენტები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
          {INCIDENT_TYPE_LABEL[item.type] ?? item.type}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {new Date(item.date_time).toLocaleString('ka-GE')} · {item.location || '—'}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">დაშავებული</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-neutral-700">
          <div>სახელი: {item.injured_name || '—'}</div>
          <div>როლი: {item.injured_role || '—'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">აღწერა</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-neutral-700">
          <section>
            <div className="text-xs font-semibold uppercase text-neutral-500">აღწერა</div>
            <div>{item.description || '—'}</div>
          </section>
          <section>
            <div className="text-xs font-semibold uppercase text-neutral-500">მიზეზი</div>
            <div>{item.cause || '—'}</div>
          </section>
          <section>
            <div className="text-xs font-semibold uppercase text-neutral-500">გატარებული ღონისძიებები</div>
            <div>{item.actions_taken || '—'}</div>
          </section>
          {item.witnesses.length > 0 && (
            <section>
              <div className="text-xs font-semibold uppercase text-neutral-500">მოწმეები</div>
              <ul className="list-disc pl-5">
                {item.witnesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </section>
          )}
        </CardContent>
      </Card>

      {item.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ფოტოები ({item.photos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {photoUrls.map((url, i) =>
                url ? (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="aspect-square w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div
                    key={i}
                    className="aspect-square w-full rounded-lg bg-neutral-100"
                  />
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {item.pdf_url && (
        <Button type="button" onClick={() => void openPdf()} disabled={opening}>
          {opening ? 'იხსნება…' : 'PDF რეპორტი'}
        </Button>
      )}
    </div>
  );
}
