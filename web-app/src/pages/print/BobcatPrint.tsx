import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BOBCAT_ITEMS,
  BOBCAT_TEMPLATE_ID,
  LARGE_LOADER_ITEMS,
  getBobcatInspection,
  type BobcatChecklistEntry,
  type BobcatItemResult,
} from '@/lib/data/bobcat';
import { getProject } from '@/lib/data/projects';
import { A4_PRINT_STYLES, printAfterRender } from '@/lib/printable';

const RESULT_LABEL: Record<BobcatItemResult, string> = {
  good: 'ნორმაში',
  deficient: 'ხარვეზი',
  unusable: 'გამოუსადეგ.',
};

const VERDICT_LABEL: Record<string, string> = {
  approved: 'დაშვებულია',
  limited: 'პირობით',
  rejected: 'არ დაიშვება',
};

const CATEGORY_LABEL: Record<string, string> = {
  A: 'A — თვლები / მუხრუჭი',
  B: 'B — ციცხვი / ჰიდრავლიკა',
  C: 'C — ძრავი',
  D: 'D — კაბინა / უსაფრთხოება',
};

export default function BobcatPrint() {
  const { id } = useParams();

  const inspectionQ = useQuery({
    queryKey: ['bobcatInspection', id],
    queryFn: () => getBobcatInspection(id!),
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
  const catalog: BobcatChecklistEntry[] =
    item.templateId === BOBCAT_TEMPLATE_ID ? BOBCAT_ITEMS : LARGE_LOADER_ITEMS;
  const stateById = new Map(item.items.map((s) => [s.id, s]));

  const grouped = catalog.reduce<Record<string, BobcatChecklistEntry[]>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {});

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
        <h1>ციცხვიანი დამტვირთველის შემოწმების აქტი</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          {item.equipmentModel || item.company || `#${item.id.slice(0, 8)}`} ·{' '}
          {new Date(item.inspectionDate).toLocaleDateString('ka-GE')}
        </p>

        <h2>I. ზოგადი ინფორმაცია</h2>
        <div className="field"><span className="field-label">პროექტი:</span> {p?.name || '—'}</div>
        <div className="field"><span className="field-label">კომპანია:</span> {item.company || '—'}</div>
        <div className="field"><span className="field-label">მოდელი:</span> {item.equipmentModel || '—'}</div>
        <div className="field"><span className="field-label">სარეგ. ნომერი:</span> {item.registrationNumber || '—'}</div>
        <div className="field"><span className="field-label">ინსპექტორი:</span> {item.inspectorName || '—'}</div>

        <h2>III. შემოწმების სია</h2>
        {Object.entries(grouped).map(([cat, entries]) => (
          <section key={cat} style={{ pageBreakInside: 'avoid' }}>
            <h2 style={{ fontSize: '11pt', borderBottom: 'none', marginTop: '8pt' }}>
              {CATEGORY_LABEL[cat] ?? cat}
            </h2>
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
                {entries.map((e) => {
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
        ))}

        <h2>IV. დასკვნა</h2>
        <div className="field">
          <span className="field-label">დასკვნა:</span>{' '}
          {item.verdict ? VERDICT_LABEL[item.verdict] : '—'}
        </div>
        <div className="field">{item.notes || '—'}</div>

        <div className="signature-block">
          <div>
            ინსპექტორი: {item.inspectorName || '—'}
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
