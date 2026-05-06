import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBriefing, topicLabel } from '@/lib/data/briefings';
import { getProject } from '@/lib/data/projects';
import { A4_PRINT_STYLES, printAfterRender } from '@/lib/printable';

export default function BriefingPrint() {
  const { id } = useParams();

  const briefingQ = useQuery({
    queryKey: ['briefing', id],
    queryFn: () => getBriefing(id!),
    enabled: !!id,
  });

  const projectQ = useQuery({
    queryKey: ['project', briefingQ.data?.projectId],
    queryFn: () => getProject(briefingQ.data!.projectId),
    enabled: !!briefingQ.data?.projectId,
  });

  const ready = briefingQ.isSuccess && projectQ.isSuccess;

  useEffect(() => {
    if (ready) printAfterRender(500);
  }, [ready]);

  if (!briefingQ.data) {
    return <p style={{ padding: 24 }}>{briefingQ.isLoading ? 'იტვირთება…' : 'ვერ მოიძებნა.'}</p>;
  }

  const b = briefingQ.data;
  const p = projectQ.data;

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
        <h1>უსაფრთხოების ბრიფინგი</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          {new Date(b.dateTime).toLocaleString('ka-GE')}
        </p>

        <h2>1. პროექტი</h2>
        <div className="field"><span className="field-label">დასახელება:</span> {p?.name || '—'}</div>
        <div className="field"><span className="field-label">კომპანია:</span> {p?.company_name || '—'}</div>

        <h2>2. ინსპექტორი</h2>
        <div className="field">{b.inspectorName || '—'}</div>

        <h2>3. თემები</h2>
        {b.topics.length === 0 ? (
          <div className="field">—</div>
        ) : (
          <ul style={{ marginTop: 0, paddingLeft: 20 }}>
            {b.topics.map((t) => (
              <li key={t}>{topicLabel(t)}</li>
            ))}
          </ul>
        )}

        <h2>4. მონაწილეები ({b.participants.length})</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: '8mm' }}>#</th>
              <th>სახელი, გვარი</th>
              <th>თანამდებობა</th>
              <th>ხელმოწერა</th>
            </tr>
          </thead>
          <tbody>
            {b.participants.length === 0 ? (
              <tr><td colSpan={4}>—</td></tr>
            ) : (
              b.participants.map((p, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{p.fullName}</td>
                  <td>{p.position || '—'}</td>
                  <td>
                    {p.signature ? (
                      <img
                        src={
                          p.signature.startsWith('data:')
                            ? p.signature
                            : `data:image/png;base64,${p.signature}`
                        }
                        alt="signature"
                        style={{ height: '12mm' }}
                      />
                    ) : (
                      ''
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="signature-block">
          <div>
            ინსპექტორი: {b.inspectorName || '—'}
            <br />
            ხელმოწერა / თარიღი:
          </div>
        </div>
      </div>
    </>
  );
}
