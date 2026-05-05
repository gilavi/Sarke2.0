import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { countProjects } from '@/lib/data/projects';
import { countInspections } from '@/lib/data/inspections';
import { countCertificates } from '@/lib/data/certificates';

interface Tile {
  to: string;
  title: string;
  description: string;
  load: () => Promise<number>;
}

const tiles: Tile[] = [
  {
    to: '/projects',
    title: 'პროექტები',
    description: 'პროექტების სია, მონაწილეები და ფაილები.',
    load: countProjects,
  },
  {
    to: '/inspections',
    title: 'შემოწმების აქტები',
    description: 'აქტების ნახვა და PDF რეპორტები.',
    load: countInspections,
  },
  {
    to: '/certificates',
    title: 'სერტიფიკატები',
    description: 'გენერირებული PDF სერტიფიკატები.',
    load: countCertificates,
  },
];

export default function Home() {
  const { profile, user } = useAuth();
  const firstName = profile?.first_name?.trim() || user?.email?.split('@')[0] || '';
  const [counts, setCounts] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      tiles.map((t) =>
        t.load().then(
          (n) => [t.to, n] as const,
          () => [t.to, null] as const,
        ),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setCounts(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">
          მოგესალმებით{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sarke ვებ-აპლიკაცია — მუშაობს იმავე ანგარიშებზე, რასაც მობილური აპი.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => {
          const c = counts[t.to];
          return (
            <Link key={t.to} to={t.to} className="block">
              <Card className="h-full transition hover:border-brand-300 hover:shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>{t.title}</span>
                    <span className="text-2xl font-bold text-brand-600">
                      {c === undefined ? '…' : c === null ? '—' : c}
                    </span>
                  </CardTitle>
                  <CardDescription>გახსნა →</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600">{t.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
