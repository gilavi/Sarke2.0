import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listTemplates, SIGNER_ROLE_LABEL, type Template } from '@/lib/data/templates';

const CATEGORY_LABEL: Record<string, string> = {
  harness: 'დამცავი ქამარი',
  xaracho: 'ფასადის ხარაჩო',
  bobcat: 'ციცხვიანი / დამტვირთველი',
  excavator: 'ექსკავატორი',
  general_equipment: 'ტექნიკური აღჭურვილობა',
};

function categoryLabel(t: Template): string {
  if (t.is_system) return 'სისტემური';
  return 'ჩემი';
}

export default function Templates() {
  const q = useQuery({
    queryKey: ['templates'],
    queryFn: listTemplates,
  });

  const items = q.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">შაბლონები</h1>
        <p className="mt-1 text-sm text-neutral-500">
          სისტემური და თქვენ მიერ შექმნილი შემოწმების შაბლონები. ახალი შაბლონი იქმნება მობილურ აპში.
        </p>
      </header>

      {q.isLoading ? (
        <p className="text-sm text-neutral-500">იტვირთება…</p>
      ) : q.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {q.error instanceof Error ? q.error.message : String(q.error)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-500">შაბლონები ჯერ არ არის.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <p className="text-xs text-neutral-500">
                  {categoryLabel(t)} · {(t.category && CATEGORY_LABEL[t.category]) ?? t.category ?? '—'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-neutral-600">
                  <span className="font-medium text-neutral-700">საჭირო ხელმომწერები:</span>{' '}
                  {t.required_signer_roles.length === 0
                    ? '—'
                    : t.required_signer_roles
                        .map((r) => SIGNER_ROLE_LABEL[r] ?? r)
                        .join(', ')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
