/**
 * NewActPage — the unified "ახალი შემოწმების აქტი" entry (steps 1–2 of the
 * split-view creation flow): pick WHAT to inspect, then WHERE, with a blank
 * act-sheet preview on the right. Tap-to-advance rows, no footer on step 1.
 *
 * - `?project=<id>` preselects the project and skips step 2 (mobile parity).
 * - Structured acts create their row immediately and jump to the act's detail
 *   route, where StructuredInspectionWizard continues the flow.
 * - Generic questionnaire templates (harness / scaffold) keep their working
 *   modal flow: InspectionWizard is mounted on top of this page.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import InspectionWizard from '@/components/InspectionWizard';
import { SplitWizard, DocPreviewFrame } from '@/components/ui/split-wizard';
import { ListRow } from '@/components/ui/list-row';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { toastError } from '@/lib/errors';
import { listProjects } from '@/lib/data/projects';
import { listTemplates, type Template } from '@/lib/data/templates';
import { projectKeys, templateKeys } from '@/app/queryKeys';
import {
  STRUCTURED_ACT_LIST,
  getStructuredActByCategory,
  type StructuredAct,
} from '@/features/inspections/structured/acts';
import { buildBlankActPreviewHtml } from '@/features/inspections/structured/useActPreviewHtml';

type PickerEntry =
  | { kind: 'act'; key: string; label: string; act: StructuredAct }
  | { kind: 'generic'; key: string; label: string; template: Template };

export default function NewActPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const presetProjectId = searchParams.get('project') ?? '';
  const { profile } = useAuth();
  const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null;

  const { data: templates } = useQuery({ queryKey: templateKeys.lists(), queryFn: listTemplates });
  const { data: projects } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });

  const [picked, setPicked] = useState<PickerEntry | null>(null);
  const [projectId, setProjectId] = useState(presetProjectId);
  const [submitting, setSubmitting] = useState(false);
  const [genericLaunch, setGenericLaunch] = useState<{ templateId: string; projectId: string } | null>(null);

  const entries = useMemo<PickerEntry[]>(() => {
    // Every structured act is a create entry — including large_loader: its
    // `excludeFromList` flag only prevents double-listing on READ lists (it
    // shares bobcat's table/query); in the picker it must appear.
    const acts: PickerEntry[] = STRUCTURED_ACT_LIST.map((act) => ({
      kind: 'act',
      key: act.key,
      label: act.menuLabel,
      act,
    }));
    // Generic questionnaire templates = those with no structured counterpart.
    const generic: PickerEntry[] = (templates ?? [])
      .filter((t) => getStructuredActByCategory(t.category) == null)
      .map((t) => ({ kind: 'generic', key: t.id, label: t.name, template: t }));
    return [...acts, ...generic];
  }, [templates]);

  async function launch(entry: PickerEntry, projId: string) {
    if (submitting) return;
    if (entry.kind === 'generic') {
      setGenericLaunch({ templateId: entry.template.id, projectId: projId });
      return;
    }
    setSubmitting(true);
    try {
      const created = await entry.act.descriptor.create(
        entry.act.descriptor.buildCreateArgs({ projectId: projId, inspectorName: profileName, specValues: {} }),
      );
      qc.invalidateQueries({ queryKey: entry.act.descriptor.listKey() });
      navigate(entry.act.detail(created.id), { replace: true });
    } catch (e) {
      toastError(e);
      setSubmitting(false);
    }
  }

  function handleTemplatePick(entry: PickerEntry) {
    if (submitting) return;
    setPicked(entry);
    if (presetProjectId) void launch(entry, presetProjectId);
  }

  function handleProjectPick(id: string) {
    if (submitting) return;
    setProjectId(id);
    if (picked) void launch(picked, id);
  }

  const onProjectStep = !!picked && !presetProjectId;
  const totalSteps = presetProjectId ? 1 : 2;
  const selectedProject = (projects ?? []).find((p) => p.id === projectId) ?? null;

  const previewHtml = useMemo(
    () =>
      buildBlankActPreviewHtml({
        templateName: picked?.label ?? null,
        projectName: selectedProject?.name ?? null,
        inspectorName: profileName,
      }),
    [picked, selectedProject, profileName],
  );

  return (
    <>
      <SplitWizard
        title="ახალი შემოწმების აქტი"
        subtitle={submitting ? 'იქმნება…' : `ნაბიჯი ${onProjectStep ? 2 : 1}/${totalSteps}`}
        onClose={() => navigate(-1)}
        preview={<DocPreviewFrame html={previewHtml} />}
        footer={
          onProjectStep ? (
            <Button variant="outline" onClick={() => setPicked(null)} disabled={submitting}>
              უკან
            </Button>
          ) : undefined
        }
      >
        {onProjectStep ? (
          <PickSection heading="რომელ ობიექტზე?">
            {projects == null ? (
              <PickListNote text="იტვირთება…" />
            ) : projects.length === 0 ? (
              <PickListNote text="პროექტები ვერ მოიძებნა." />
            ) : (
              projects.map((p) => (
                <ListRow
                  key={p.id}
                  leading={<AvatarChip label={p.name} />}
                  title={p.name}
                  subtitle={p.address ?? undefined}
                  trailing={<ChevronRight size={16} className="text-[var(--text-muted)]" />}
                  onClick={() => handleProjectPick(p.id)}
                />
              ))
            )}
          </PickSection>
        ) : (
          <PickSection heading="რის შემოწმებას იწყებთ?">
            {entries.map((entry) => (
              <ListRow
                key={`${entry.kind}:${entry.key}`}
                leading={<AvatarChip label={entry.label} />}
                title={entry.label}
                trailing={<ChevronRight size={16} className="text-[var(--text-muted)]" />}
                onClick={() => handleTemplatePick(entry)}
              />
            ))}
            {templates == null ? <PickListNote text="შაბლონები იტვირთება…" /> : null}
          </PickSection>
        )}
      </SplitWizard>

      {genericLaunch ? (
        <InspectionWizard
          open
          preset={{ templateId: genericLaunch.templateId }}
          defaultProjectId={genericLaunch.projectId}
          onClose={() => navigate('/home')}
        />
      ) : null}
    </>
  );
}

/* ─── Pick-list building blocks ─── */

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

/** Two-letter avatar chip: first letters of the label's first two words. */
function AvatarChip({ label }: { label: string }) {
  const letters = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-hover)] text-[13px] font-bold text-[var(--text-secondary)]"
    >
      {letters || '?'}
    </span>
  );
}
