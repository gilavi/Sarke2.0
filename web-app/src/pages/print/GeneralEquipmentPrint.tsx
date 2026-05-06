import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getGeneralEquipmentInspection,
  type GECondition,
} from '@/lib/data/generalEquipment';
import { getProject } from '@/lib/data/projects';
import { A4_PRINT_STYLES, printAfterRender } from '@/lib/printable';

const COND_LABEL: Record<GECondition, string> = {
  good: 'ნორმაში',
  needs_service: 'ტექ. მომსახურება',
  unusable: 'გამოუსადეგ.',
};

export default function GeneralEquipmentPrint() {
  const { id } = useParams();

  const inspectionQ = useQuery({
    queryKey: ['generalEquipmentInspection', id],
    queryFn: () => getGeneralEquipmentInspection(id!),
    enabled: !!id,
  });
  const projectQ = useQuery({
    queryKey: ['project', inspectionQ.data?.projectId],
    queryFn: () => getProject(inspectionQ.data!.projectId),
    enabled: !!inspectionQ.data?.projectId,
  });

  const ready = inspectionQ.isSuccess && projectQ.isSuccess;
  useEffect(() => {
    if (ready) printAfterRender(500);
  }, [ready]);

  if (!inspectionQ.data) {
    return <p style={{ padding: 24 }}>{inspectionQ.isLoading ? 'იტვირთება…' : 'ვერ მოიძებნა.'}</p>;
  }

  const item = inspectionQ.data;
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
        <h1>ტექნიკური აღჭურვილობის შემოწმების აქტი</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          {item.objectName || `#${item.id.slice(0, 8)}`} · აქტი №{item.actNumber || '—'} ·{' '}
          {new Date(item.inspectionDate).toLocaleDateString('ka-GE')}
        </p>

        <h2>I. ზოგადი ინფორმაცია</h2>
        <div className="field"><span className="field-label">პროექტი:</span> {p?.name || '—'}</div>
        <div className="field"><span className="field-label">ობიექტი:</span> {item.objectName || '—'}</div>
        <div className="field"><span className="field-label">საქმიანობა:</span> {item.activityType || '—'}</div>
        <div className="field"><span className="field-label">ინსპექტორი:</span> {item.inspectorName || '—'}</div>

        <h2>II. აღჭურვილობა ({item.equipment.length})</h2>
        {item.equipment.length === 0 ? (
          <p>—</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '8mm' }}>#</th>
                <th>დასახელება</th>
                <th>მოდელი</th>
                <th>სერ. ნომერი</th>
                <th style={{ width: '32mm' }}>მდგომარეობა</th>
                <th>შენიშვნა</th>
              </tr>
            </thead>
            <tbody>
              {item.equipment.map((row, i) => (
                <tr key={row.id}>
                  <td>{i + 1}</td>
                  <td>{row.name || '—'}</td>
                  <td>{row.model || '—'}</td>
                  <td>{row.serialNumber || '—'}</td>
                  <td>{row.condition ? COND_LABEL[row.condition] : '—'}</td>
                  <td>{row.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>III. დასკვნა</h2>
        <div className="field">{item.conclusion || '—'}</div>

        <div className="signature-block">
          <div>
            {item.signerName || item.inspectorName || '—'}
            <br />
            ხელმოწერა / თარიღი:
          </div>
        </div>
      </div>
    </>
  );
}
