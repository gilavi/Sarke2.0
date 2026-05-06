import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CABIN_ITEMS,
  ENGINE_ITEMS,
  EXCAVATOR_VERDICT_LABEL,
  MAINTENANCE_ITEMS,
  SAFETY_ITEMS,
  UNDERCARRIAGE_ITEMS,
  getExcavatorInspection,
  type ExcavatorChecklistEntry,
  type ExcavatorChecklistItemState,
  type ExcavatorChecklistResult,
} from '@/lib/data/excavator';
import { getProject } from '@/lib/data/projects';
import { A4_PRINT_STYLES, printAfterRender } from '@/lib/printable';

const RESULT_LABEL: Record<Exclude<ExcavatorChecklistResult, null>, string> = {
  good: 'ნორმაში',
  deficient: 'ხარვეზი',
  unusable: 'გამოუსადეგ.',
};

interface SectionDef {
  title: string;
  items: ExcavatorChecklistEntry[];
  field: 'engineItems' | 'undercarriageItems' | 'cabinItems' | 'safetyItems';
}

const SECTIONS: SectionDef[] = [
  { title: 'III.1 ძრავი', items: ENGINE_ITEMS, field: 'engineItems' },
  { title: 'III.2 ხოდოვაი / მკლავი', items: UNDERCARRIAGE_ITEMS, field: 'undercarriageItems' },
  { title: 'III.3 კაბინა', items: CABIN_ITEMS, field: 'cabinItems' },
  { title: 'III.4 უსაფრთხოება', items: SAFETY_ITEMS, field: 'safetyItems' },
];

export default function ExcavatorPrint() {
  const { id } = useParams();

  const inspectionQ = useQuery({
    queryKey: ['excavatorInspection', id],
    queryFn: () => getExcavatorInspection(id!),
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
        <h1>ექსკავატორის ტექნიკური შემოწმების აქტი</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          {item.serialNumber || `#${item.id.slice(0, 8)}`} ·{' '}
          {new Date(item.inspectionDate).toLocaleDateString('ka-GE')}
        </p>

        <h2>I. ტექნიკის მახასიათებლები</h2>
        <table>
          <tbody>
            <tr><td><b>წონა</b></td><td>{item.machineSpecs.weight}</td><td><b>ძრავი</b></td><td>{item.machineSpecs.engine}</td></tr>
            <tr><td><b>სიმძლავრე</b></td><td>{item.machineSpecs.power}</td><td><b>ჩაღრმავება</b></td><td>{item.machineSpecs.depth}</td></tr>
            <tr><td><b>გადაადგილება</b></td><td>{item.machineSpecs.travel}</td><td><b>მაქს. წვდომა</b></td><td>{item.machineSpecs.maxReach}</td></tr>
          </tbody>
        </table>

        <h2>II. ზოგადი ინფორმაცია</h2>
        <div className="field"><span className="field-label">პროექტი:</span> {p?.name || item.projectName || '—'}</div>
        <div className="field"><span className="field-label">სერ. ნომერი:</span> {item.serialNumber || '—'}</div>
        <div className="field"><span className="field-label">ინვ. ნომერი:</span> {item.inventoryNumber || '—'}</div>
        <div className="field"><span className="field-label">დეპარტამენტი:</span> {item.department || '—'}</div>
        <div className="field"><span className="field-label">მუშა საათები:</span> {item.motoHours ?? '—'}</div>
        <div className="field"><span className="field-label">ინსპექტორი:</span> {item.inspectorName || '—'}</div>

        {SECTIONS.map((s) => {
          const list = item[s.field] as ExcavatorChecklistItemState[];
          const stateById = new Map(list.map((st) => [st.id, st]));
          return (
            <section key={s.field} style={{ pageBreakInside: 'avoid' }}>
              <h2>{s.title}</h2>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '8mm' }}>#</th>
                    <th>პუნქტი</th>
                    <th style={{ width: '24mm' }}>შედეგი</th>
                    <th>კომენტარი</th>
                  </tr>
                </thead>
                <tbody>
                  {s.items.map((e) => {
                    const st = stateById.get(e.id);
                    return (
                      <tr key={e.id}>
                        <td>{e.id}</td>
                        <td><b>{e.label}</b> · {e.description}</td>
                        <td>{st?.result ? RESULT_LABEL[st.result] : '—'}</td>
                        <td>{st?.comment || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}

        <h2>VI. ტექნიკური მომსახურება</h2>
        <table>
          <thead>
            <tr><th style={{ width: '8mm' }}>#</th><th>პუნქტი</th><th style={{ width: '20mm' }}>პასუხი</th><th style={{ width: '32mm' }}>თარიღი</th></tr>
          </thead>
          <tbody>
            {MAINTENANCE_ITEMS.map((m) => {
              const st = item.maintenanceItems.find((x) => x.id === m.id);
              return (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.label}</td>
                  <td>{st?.answer === 'yes' ? 'კი' : st?.answer === 'no' ? 'არა' : '—'}</td>
                  <td>{st?.date || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h2>IV. დასკვნა</h2>
        <div className="field">
          <span className="field-label">დასკვნა:</span>{' '}
          {item.verdict ? EXCAVATOR_VERDICT_LABEL[item.verdict] : '—'}
        </div>
        <div className="field">{item.notes || '—'}</div>

        <div className="signature-block">
          <div>
            {item.inspectorName || '—'} {item.inspectorPosition ? `· ${item.inspectorPosition}` : ''}
            <br />
            {item.inspectorSignature
              ? <img src={`data:image/png;base64,${item.inspectorSignature}`} alt="ხელმოწერა" style={{ height: 56, marginTop: 4 }} />
              : <span>ხელმოწერა / თარიღი: ___________</span>}
          </div>
        </div>
      </div>
    </>
  );
}
