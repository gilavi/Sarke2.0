import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBriefing, topicLabel } from '@/lib/data/briefings';

export default function BriefingDetail() {
  const { id } = useParams();
  const { data: b, error, isLoading } = useQuery({
    queryKey: ['briefing', id],
    queryFn: () => getBriefing(id!),
    enabled: !!id,
  });

  if (isLoading) return <p className="text-sm text-neutral-500">იტვირთება…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  if (!b) return <p className="text-sm text-neutral-500">ბრიფინგი ვერ მოიძებნა.</p>;

  return (
    <div className="space-y-6">
      <header>
        <Link to="/briefings" className="text-sm text-brand-600 hover:underline">
          ← ბრიფინგები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
          {new Date(b.dateTime).toLocaleString('ka-GE')}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">სტატუსი: {b.status}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">მონაცემები</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-neutral-700">
          <div>ინსპექტორი: {b.inspectorName || '—'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">თემები</CardTitle>
        </CardHeader>
        <CardContent>
          {b.topics.length === 0 ? (
            <p className="text-sm text-neutral-500">თემები არ არის.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {b.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700"
                >
                  {topicLabel(t)}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">მონაწილეები ({b.participants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {b.participants.length === 0 ? (
            <p className="text-sm text-neutral-500">მონაწილეები არ არიან.</p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {b.participants.map((p, i) => (
                <li key={i} className="py-2 text-sm">
                  <div className="font-medium text-neutral-900">{p.fullName}</div>
                  {p.position && <div className="text-xs text-neutral-500">{p.position}</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
