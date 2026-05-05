import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProject, type Project } from '@/lib/data/projects';
import { listInspections, type Inspection } from '@/lib/data/inspections';
import { listBriefings, topicLabel, type Briefing } from '@/lib/data/briefings';
import {
  listProjectFiles,
  signedFileUrl,
  formatSize,
  type ProjectFile,
} from '@/lib/data/projectFiles';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getProject(id),
      listInspections(id),
      listBriefings(id),
      listProjectFiles(id),
    ])
      .then(([p, ins, bs, fs]) => {
        setProject(p);
        setInspections(ins);
        setBriefings(bs);
        setFiles(fs);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  async function openFile(f: ProjectFile) {
    try {
      setOpening(f.id);
      const url = await signedFileUrl(f.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpening(null);
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (!project) return <p className="text-sm text-neutral-500">პროექტი ვერ მოიძებნა.</p>;

  return (
    <div className="space-y-6">
      <header>
        <Link to="/projects" className="text-sm text-brand-600 hover:underline">
          ← პროექტები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">{project.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">{project.company_name}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">დეტალები</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-neutral-700">
          <div>მისამართი: {project.address || '—'}</div>
          <div>ტელეფონი: {project.contact_phone || '—'}</div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">შემოწმების აქტები</h2>
        {inspections.length === 0 ? (
          <p className="text-sm text-neutral-500">აქტები ჯერ არ არის.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {inspections.map((i) => (
              <li key={i.id}>
                <Link
                  to={`/inspections/${i.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                >
                  <span className="text-sm text-neutral-800">{i.harness_name || i.id.slice(0, 8)}</span>
                  <span className="text-xs text-neutral-500">{i.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">ბრიფინგები</h2>
        {briefings.length === 0 ? (
          <p className="text-sm text-neutral-500">ბრიფინგები ჯერ არ არის.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {briefings.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/briefings/${b.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-800">
                      {new Date(b.dateTime).toLocaleDateString('ka-GE')}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {b.topics.slice(0, 2).map(topicLabel).join(', ')}
                      {b.topics.length > 2 && ` +${b.topics.length - 2}`}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">{b.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">ფაილები</h2>
        {files.length === 0 ? (
          <p className="text-sm text-neutral-500">ფაილები ჯერ არ არის.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-neutral-800">{f.name}</div>
                  <div className="text-xs text-neutral-500">
                    {formatSize(f.size_bytes)}
                    {f.mime_type ? ` · ${f.mime_type}` : ''}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void openFile(f)}
                  disabled={opening === f.id}
                >
                  <Download size={14} className="mr-1" />
                  {opening === f.id ? 'იხსნება…' : 'ჩამოტვირთვა'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
