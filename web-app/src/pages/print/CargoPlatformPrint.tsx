import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getCargoPlatformInspection,
  cpTotalWeight,
  CP_ITEMS,
  CP_SECTION_LABELS,
  CP_VERDICT_LABEL,
  CP_RESULT_LABEL,
} from '@/lib/data/cargoPlatform';
import { getProject } from '@/lib/data/projects';
import { A4_PRINT_STYLES, printAfterRender } from '@/lib/printable';
import { signedInspectionPhotoUrl } from '@/lib/photoUpload';

const GUARDRAIL_LABEL: Record<string, string> = {
  none: 'არ აქვს',
  complete: 'სრულია',
  non_standard: 'არასტანდარტული',
  standard: 'სტანდარტული',
};

export default function CargoPlatformPrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  const inspQ = useQuery({
    queryKey: ['cargoPlatformInspection', id],
    queryFn: () => getCargoPlatformInspection(id!),
    enabled: !!id,
  });
  const projQ = useQuery({
    queryKey: ['project', inspQ.data?.projectId],
    queryFn: () => getProject(inspQ.data!.projectId),
    enabled: !!inspQ.data?.projectId,
  });

  const ready = inspQ.isSuccess && projQ.isSuccess;
  useEffect(() => {
    if (ready && !isPreview) printAfterRender(500);
  }, [ready, isPreview]);

  const [signedPhotos, setSignedPhotos] = useState<string[]>([]);
  useEffect(() => {
    const paths = inspQ.data?.summaryPhotos ?? [];
    if (!paths.length) return;
    Promise.all(paths.map(signedInspectionPhotoUrl))
      .then(setSignedPhotos)
      .catch(() => {});
  }, [inspQ.data?.summaryPhotos]);

  if (!inspQ.data) {
    return <p style={{ padding: 24 }}>{inspQ.isLoading ? 'იტვირთება…' : 'ვერ მოიძებნა.'}</p>;
  }

  const item = inspQ.data;
  const p = projQ.data;
  const totalWeight = cpTotalWeight(item.cargo);

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
        <h1>ტვირთის მიმღები პლატფორმის შემოწმების აქტი</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          {item.company || p?.name || '—'} ·{' '}
          {new Date(item.inspectionDate).toLocaleDateString('ka-GE')}
        </p>

        {/* Section I — General info */}
        <h2>I. ზოგადი ინფორმაცია</h2>
        <div className="field"><span className="field-label">პროექტი:</span> {p?.name || '—'}</div>
        <div className="field"><span className="field-label">კომპანია:</span> {item.company || '—'}</div>
        <div className="field"><span className="field-label">მისამართი:</span> {item.address || '—'}</div>
        <div className="field"><span className="field-label">ინსპექტორი:</span> {item.inspectorName || '—'}</div>
        <div className="field"><span className="field-label">სართული / ზონა:</span> {item.floorZone || '—'}</div>
        <div className="field">
          <span className="field-label">შემ. თარიღი:</span>{' '}
          {new Date(item.inspectionDate).toLocaleDateString('ka-GE')}
        </div>

        {/* Section II — Platform ID */}
        <h2>II. პლატფორმის იდენტიფიკაცია</h2>
        <table>
          <tbody>
            <tr><td style={{ width: '50%', fontWeight: 600 }}>ტიპი / მოდელი</td><td>{item.platformTypeModel || '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>სიგრძე (მ)</td><td>{item.platformLength ?? '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>სიგანე (მ)</td><td>{item.platformWidth ?? '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>ფერი / განსხვ.</td><td>{item.platformColorDesc || '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>გვ. მოაჯირი</td><td>{item.sideGuardrail ? GUARDRAIL_LABEL[item.sideGuardrail] : '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>წინა მოაჯირი</td><td>{item.frontGuardrail ? GUARDRAIL_LABEL[item.frontGuardrail] : '—'}</td></tr>
            <tr><td style={{ fontWeight: 600 }}>მოაჯირის სიმ.</td><td>{item.guardrailHeight ? GUARDRAIL_LABEL[item.guardrailHeight] : '—'}</td></tr>
          </tbody>
        </table>

        {/* Section III — Cargo */}
        <h2>III. ტვირთის იდენტიფიკაცია</h2>
        {item.cargo.length === 0 ? (
          <p>—</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '8mm' }}>#</th>
                <th>ტვირთის დასახელება</th>
                <th style={{ width: '36mm' }}>საერთო წონა (კგ)</th>
              </tr>
            </thead>
            <tbody>
              {item.cargo.map((row, i) => (
                <tr key={row.id}>
                  <td>{i + 1}</td>
                  <td>{row.name || '—'}</td>
                  <td>{row.total_weight_kg ?? '—'}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ fontWeight: 700, textAlign: 'right' }}>სულ:</td>
                <td style={{ fontWeight: 700 }}>{totalWeight.toLocaleString('ka-GE')} კგ</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Section IV — Checklist */}
        <h2>IV. პლატფორმის შემოწმება</h2>
        {(['A', 'B'] as const).map((section) => (
          <div key={section} style={{ marginBottom: '8pt' }}>
            <p style={{ fontWeight: 600, fontSize: '10pt', marginBottom: '4pt' }}>
              {CP_SECTION_LABELS[section]}
            </p>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '8mm' }}>#</th>
                  <th>შემოწმების პარამეტრი</th>
                  <th style={{ width: '28mm' }}>შედეგი</th>
                  <th>შენიშვნა</th>
                </tr>
              </thead>
              <tbody>
                {CP_ITEMS.filter((ci) => ci.section === section).map((ci) => {
                  const state = item.items.find((s) => s.id === ci.id);
                  return (
                    <tr key={ci.id} style={state?.result === 'fix' ? { background: '#FFFBEB' } : undefined}>
                      <td>{ci.id}</td>
                      <td>{ci.label}</td>
                      <td>
                        {state?.result
                          ? CP_RESULT_LABEL[state.result]
                          : '—'}
                      </td>
                      <td>{state?.comment || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* Section V — Verdict */}
        <h2>V. დასკვნა</h2>
        {item.verdict ? (
          <>
            <div className="field">
              <span className="field-label">ვერდიქტი:</span>{' '}
              <strong>{CP_VERDICT_LABEL[item.verdict]}</strong>
            </div>
            {item.verdictComment && (
              <div className="field">
                <span className="field-label">კომენტარი:</span> {item.verdictComment}
              </div>
            )}
          </>
        ) : (
          <p>—</p>
        )}

        {/* Section VI — Photos */}
        {signedPhotos.length > 0 && (
          <section style={{ pageBreakInside: 'avoid' }}>
            <h2>VI. სარეზიუმო ფოტოები</h2>
            <div className="photo-grid">
              {signedPhotos.map((url, i) => (
                <img key={i} src={url} alt={`photo-${i + 1}`} />
              ))}
            </div>
          </section>
        )}

        {/* Section VII — Signatures */}
        <h2>{signedPhotos.length > 0 ? 'VII' : 'VI'}. ხელმოწერები</h2>
        <div className="signature-block">
          {item.signatures.map((sig, idx) => (
            <div key={idx}>
              <p style={{ fontWeight: 600 }}>{idx === 0 ? 'ინსპექტორი' : 'ხელმომწერი 2'}</p>
              {sig.name && <p>{sig.name}</p>}
              {sig.position && <p style={{ color: '#6B7280', fontSize: '9pt' }}>{sig.position}</p>}
              {sig.organization && <p style={{ color: '#6B7280', fontSize: '9pt' }}>{sig.organization}</p>}
              {sig.signature ? (
                <img
                  src={`data:image/png;base64,${sig.signature}`}
                  alt="ხელმოწერა"
                  style={{ height: 56, marginTop: 4 }}
                />
              ) : (
                <span style={{ fontSize: '9pt', color: '#9CA3AF' }}>
                  ხელმოწერა / თარიღი: ___________
                </span>
              )}
              {sig.date && (
                <p style={{ fontSize: '9pt', color: '#6B7280', marginTop: 2 }}>
                  {new Date(sig.date).toLocaleDateString('ka-GE')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
