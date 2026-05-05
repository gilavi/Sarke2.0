import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { REGULATIONS } from '@/lib/data/regulations';

export default function Regulations() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">რეგულაციები</h1>
        <p className="mt-1 text-sm text-neutral-500">
          შრომის უსაფრთხოების კანონმდებლობა — ბმულები matsne.gov.ge-ზე.
        </p>
      </header>

      <div className="grid gap-3">
        {REGULATIONS.map((r) => (
          <a
            key={r.id}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="transition hover:border-brand-300 hover:shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-3 text-base">
                  <span>{r.title}</span>
                  <ExternalLink size={16} className="mt-1 shrink-0 text-neutral-400" />
                </CardTitle>
                <CardDescription>{r.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-neutral-500">matsne.gov.ge/ka/document/view/{r.id.split('-')[0]}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
