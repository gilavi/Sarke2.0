import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listTemplates, SIGNER_ROLE_LABEL, type Template } from '@/lib/data/templates';
import { templateKeys } from '@/app/queryKeys';
import { SkeletonGrid } from '@/components/SkeletonCard';
import { getInspectionDisplayName } from '@/lib/inspectionDisplayName';

const CATEGORY_LABEL: Record<string, string> = {
  harness:            'დამცავი ქამარი',
  xaracho:            'ფასადის ხარაჩო',
  mobile_scaffold:    'მობილური ხარაჩო',
  mobile_scaffold_n3: 'მობილური ხარაჩო N3',
  bobcat:             'ციცხვიანი / დამტვირთველი',
  excavator:          'ექსკავატორი',
  general_equipment:  'ტექნიკური აღჭურვილობა',
  cargo_platform:     'ტვირთის პლატფორმა',
};

function categoryLabel(t: Template): string {
  if (t.is_system) return 'სისტემური';
  return 'ჩემი';
}

export default function Templates() {
  const q = useQuery({
    queryKey: templateKeys.lists(),
    queryFn: listTemplates,
  });

  const items = q.data ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">შაბლონები</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          სისტემური და თქვენ მიერ შექმნილი შემოწმების შაბლონები.
        </p>
      </header>

      {q.isLoading ? (
        <SkeletonGrid count={6} />
      ) : q.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {q.error instanceof Error ? q.error.message : String(q.error)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">შაბლონები ჯერ არ არის.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="text-heading-3 text-neutral-900 dark:text-neutral-100">{getInspectionDisplayName(t.name)}</CardTitle>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {categoryLabel(t)} · {(t.category && CATEGORY_LABEL[t.category]) ?? t.category ?? '—'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
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
