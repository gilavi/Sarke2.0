/**
 * NewReportPage — the "ახალი ფოტო-რეპორტი" entry: pick the project (skipped
 * when `?project=` is present, mobile parity), create the draft report row,
 * then jump to `/reports/:id` where ReportEditor continues the flow inside
 * the same SplitWizard chrome.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { SplitWizard } from '@/components/ui/split-wizard';
import { toastError } from '@/lib/errors';
import { listProjects } from '@/lib/data/projects';
import { createReport } from '@/lib/data/reports';
import { projectKeys, reportKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { ListRow } from '@/components/ui/list-row';

function defaultTitle(): string {
  return `ფოტო-რეპორტი — ${new Date().toLocaleDateString('ka-GE')}`;
}

export default function NewReportPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const presetProjectId = searchParams.get('project') ?? '';
  const [submitting, setSubmitting] = useState(false);

  const { data: projects } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });

  async function launch(projectId: string) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const created = await createReport({ projectId, title: defaultTitle() });
      qc.invalidateQueries({ queryKey: reportKeys.lists() });
      navigate(routes.reports.detail(created.id), { replace: true });
    } catch (e) {
      toastError(e);
      setSubmitting(false);
    }
  }

  // `?project=` skips the pick step entirely — the draft is created as soon as
  // the page mounts (guarded so StrictMode's double-invoke can't create two rows).
  const autoLaunched = useRef(false);
  useEffect(() => {
    if (presetProjectId && !autoLaunched.current) {
      autoLaunched.current = true;
      void launch(presetProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetProjectId]);

  return (
    <SplitWizard
      title="ახალი ფოტო-რეპორტი"
      subtitle={submitting ? 'იქმნება…' : 'ნაბიჯი 1/1'}
      onClose={() => navigate(-1)}
    >
      <PickSection heading="რომელ ობიექტზე?">
        {projects == null ? (
          <PickListNote text="იტვირთება…" />
        ) : projects.length === 0 ? (
          <PickListNote text="პროექტები ვერ მოიძებნა." />
        ) : (
          projects.map((p) => (
            <ListRow
              key={p.id}
              title={p.name}
              subtitle={p.address ?? undefined}
              trailing={<ChevronRight size={16} className="text-[var(--text-muted)]" />}
              onClick={() => void launch(p.id)}
            />
          ))
        )}
      </PickSection>
    </SplitWizard>
  );
}

function PickSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[var(--text-primary)]">{heading}</h2>
      <div className="overflow-hidden rounded-xl border border-[var(--border-default)]">{children}</div>
    </div>
  );
}

function PickListNote({ text }: { text: string }) {
  return <p className="px-4 py-5 text-sm text-[var(--text-muted)]">{text}</p>;
}
