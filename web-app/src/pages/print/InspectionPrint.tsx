import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getInspection,
  listAnswers,
  listQuestions,
  type Answer,
} from '@/lib/data/inspections';
import { getProject } from '@/lib/data/projects';
import { A4_PRINT_STYLES, printAfterRender } from '@/lib/printable';

function answerLabel(q: { type: string }, a?: Answer): string {
  if (!a) return '—';
  if (q.type === 'yesno') {
    if (a.value_bool === true) return 'კი';
    if (a.value_bool === false) return 'არა';
    return 'არ ეხება';
  }
  if (q.type === 'measure') return a.value_num != null ? String(a.value_num) : '—';
  if (q.type === 'freetext') return a.value_text || '—';
  return '—';
}

export default function InspectionPrint() {
  const { id } = useParams();

  const inspectionQ = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => getInspection(id!),
    enabled: !!id,
  });
  const projectQ = useQuery({
    queryKey: ['project', inspectionQ.data?.project_id],
    queryFn: () => getProject(inspectionQ.data!.project_id),
    enabled: !!inspectionQ.data?.project_id,
  });
  const questionsQ = useQuery({
    queryKey: ['questions', inspectionQ.data?.template_id],
    queryFn: () => listQuestions(inspectionQ.data!.template_id),
    enabled: !!inspectionQ.data?.template_id,
  });
  const answersQ = useQuery({
    queryKey: ['answers', id],
    queryFn: () => listAnswers(id!),
    enabled: !!id,
  });

  const ready =
    inspectionQ.isSuccess && projectQ.isSuccess && questionsQ.isSuccess && answersQ.isSuccess;

  useEffect(() => {
    if (ready) printAfterRender(500);
  }, [ready]);

  if (!inspectionQ.data) {
    return <p style={{ padding: 24 }}>{inspectionQ.isLoading ? 'იტვირთება…' : 'ვერ მოიძებნა.'}</p>;
  }

  const item = inspectionQ.data;
  const p = projectQ.data;
  const questions = questionsQ.data ?? [];
  const answers = answersQ.data ?? [];
  const ansById = new Map(answers.map((a) => [a.question_id, a]));

  const sections = [...new Set(questions.map((q) => q.section))].sort((a, b) => a - b);

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
        <h1>შემოწმების აქტი</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          {item.harness_name || `#${item.id.slice(0, 8)}`} ·{' '}
          {new Date(item.created_at).toLocaleDateString('ka-GE')}
        </p>

        <h2>1. პროექტი</h2>
        <div className="field"><span className="field-label">დასახელება:</span> {p?.name || '—'}</div>
        <div className="field"><span className="field-label">კომპანია:</span> {p?.company_name || '—'}</div>
        <div className="field"><span className="field-label">დეპარტამენტი:</span> {item.department || '—'}</div>
        <div className="field"><span className="field-label">ინსპექტორი:</span> {item.inspector_name || '—'}</div>

        {sections.map((s) => (
          <section key={s} style={{ pageBreakInside: 'avoid' }}>
            <h2>სექცია {s}</h2>
            <table>
              <thead>
                <tr>
                  <th>კითხვა</th>
                  <th style={{ width: '32mm' }}>პასუხი</th>
                  <th>კომენტარი</th>
                </tr>
              </thead>
              <tbody>
                {questions
                  .filter((q) => q.section === s)
                  .map((q) => {
                    const a = ansById.get(q.id);
                    return (
                      <tr key={q.id}>
                        <td>{q.title}</td>
                        <td>{answerLabel(q, a)}</td>
                        <td>{a?.comment || ''}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </section>
        ))}

        <h2>დასკვნა</h2>
        <div className="field">
          <span className="field-label">გამოყენებისთვის:</span>{' '}
          {item.is_safe_for_use === null ? '—' : item.is_safe_for_use ? 'უსაფრთხო' : 'არა'}
        </div>
        <div className="field">{item.conclusion_text || '—'}</div>

        <div className="signature-block">
          <div>
            ინსპექტორი: {item.inspector_name || '—'}
            <br />
            {item.inspector_signature
              ? <img src={`data:image/png;base64,${item.inspector_signature}`} alt="ხელმოწერა" style={{ height: 56, marginTop: 4 }} />
              : <span>ხელმოწერა / თარიღი: ___________</span>}
          </div>
        </div>
      </div>
    </>
  );
}
