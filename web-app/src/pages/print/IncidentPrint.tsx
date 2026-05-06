import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getIncident,
  signedIncidentPhotoUrl,
  INCIDENT_TYPE_LABEL,
} from '@/lib/data/incidents';
import { getProject } from '@/lib/data/projects';
import { useAuth } from '@/lib/auth';
import { A4_PRINT_STYLES, printAfterRender, urlToDataUrl } from '@/lib/printable';

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function IncidentPrint() {
  const { id } = useParams();
  const { profile, user } = useAuth();

  const incidentQ = useQuery({
    queryKey: ['incident', id],
    queryFn: () => getIncident(id!),
    enabled: !!id,
  });

  const projectQ = useQuery({
    queryKey: ['project', incidentQ.data?.project_id],
    queryFn: () => getProject(incidentQ.data!.project_id),
    enabled: !!incidentQ.data?.project_id,
  });

  const photosQ = useQuery({
    queryKey: ['incidentPhotosData', id, incidentQ.data?.photos],
    queryFn: async () => {
      const paths = incidentQ.data?.photos ?? [];
      const urls = await Promise.all(
        paths.map((p) => signedIncidentPhotoUrl(p).catch(() => null)),
      );
      const datas = await Promise.all(
        urls.map((u) => (u ? urlToDataUrl(u).catch(() => null) : null)),
      );
      return datas.filter((d): d is string => !!d);
    },
    enabled: !!incidentQ.data && (incidentQ.data.photos?.length ?? 0) > 0,
  });

  const ready =
    incidentQ.isSuccess &&
    projectQ.isSuccess &&
    (incidentQ.data?.photos?.length ? photosQ.isSuccess : true);

  useEffect(() => {
    if (ready) printAfterRender(700);
  }, [ready]);

  if (!incidentQ.data) {
    return <p style={{ padding: 24 }}>{incidentQ.isLoading ? 'იტვირთება…' : 'ვერ მოიძებნა.'}</p>;
  }

  const item = incidentQ.data;
  const project = projectQ.data;
  const inspectorName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
    user?.email ||
    '—';

  return (
    <>
      <style>{A4_PRINT_STYLES}</style>
      <div className="print-toolbar no-print">
        <button onClick={() => window.history.back()}>დახურვა</button>
        <button className="primary" onClick={() => window.print()}>
          ბეჭდვა
        </button>
      </div>
      <div className="doc">
        <h1>ინციდენტის აქტი</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          {INCIDENT_TYPE_LABEL[item.type] ?? item.type} · {fmt(item.date_time)}
        </p>

        <h2>1. პროექტი</h2>
        <div className="field">
          <span className="field-label">დასახელება:</span> {project?.name || '—'}
        </div>
        <div className="field">
          <span className="field-label">კომპანია:</span> {project?.company_name || '—'}
        </div>
        <div className="field">
          <span className="field-label">მისამართი:</span> {project?.address || '—'}
        </div>

        <h2>2. დროება და ადგილი</h2>
        <div className="field">
          <span className="field-label">თარიღი:</span> {new Date(item.date_time).toLocaleString('ka-GE')}
        </div>
        <div className="field">
          <span className="field-label">ადგილი:</span> {item.location || '—'}
        </div>

        {item.type !== 'nearmiss' && (
          <>
            <h2>3. დაშავებული</h2>
            <div className="field">
              <span className="field-label">სახელი:</span> {item.injured_name || '—'}
            </div>
            <div className="field">
              <span className="field-label">თანამდებობა:</span> {item.injured_role || '—'}
            </div>
          </>
        )}

        <h2>4. ინციდენტის აღწერა</h2>
        <div className="field">{item.description || '—'}</div>

        <h2>5. მიზეზი</h2>
        <div className="field">{item.cause || '—'}</div>

        <h2>6. გატარებული ღონისძიებები</h2>
        <div className="field">{item.actions_taken || '—'}</div>

        {item.witnesses.length > 0 && (
          <>
            <h2>7. მოწმეები</h2>
            <ol style={{ marginTop: 0, paddingLeft: 20 }}>
              {item.witnesses.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ol>
          </>
        )}

        {(photosQ.data?.length ?? 0) > 0 && (
          <>
            <h2>8. ფოტოები</h2>
            <div className="photo-grid">
              {photosQ.data!.map((src, i) => (
                <img key={i} src={src} alt={`photo ${i + 1}`} />
              ))}
            </div>
          </>
        )}

        <div className="signature-block">
          <div>
            ინსპექტორი: {inspectorName}
            <br />
            ხელმოწერა / თარიღი:
          </div>
        </div>
      </div>
    </>
  );
}
