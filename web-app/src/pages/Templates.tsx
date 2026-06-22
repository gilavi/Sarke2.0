import { useQuery } from '@tanstack/react-query';
import { View, Text } from 'react-native';
import { Card, Badge } from '@root/components/primitives';
import { useTheme } from '@root/lib/theme';
import { listTemplates, SIGNER_ROLE_LABEL, type Template } from '@/lib/data/templates';
import { templateKeys } from '@/app/queryKeys';
import { SkeletonGrid } from '@/components/SkeletonCard';
import { inspectionDisplayName } from '@/lib/documentNames';
import { ErrorMessage } from '@/components/ui/error-message';
import { humanizeError } from '@/lib/errors';

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
  const { theme } = useTheme();
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
        <ErrorMessage>{humanizeError(q.error)}</ErrorMessage>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">შაბლონები ჯერ არ არის.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.ink, flex: 1 }}>
                  {inspectionDisplayName(t.name)}
                </Text>
                <Badge variant={t.is_system ? 'info' : 'default'}>{categoryLabel(t)}</Badge>
              </View>
              <Text style={{ marginTop: 4, fontSize: 12, color: theme.colors.inkSoft }}>
                {(t.category && CATEGORY_LABEL[t.category]) ?? t.category ?? '-'}
              </Text>
              <Text style={{ marginTop: 12, fontSize: 12, color: theme.colors.inkSoft }}>
                <Text style={{ fontWeight: '600', color: theme.colors.ink }}>საჭირო ხელმომწერები: </Text>
                {t.required_signer_roles.length === 0
                  ? '-'
                  : t.required_signer_roles.map((r) => SIGNER_ROLE_LABEL[r] ?? r).join(', ')}
              </Text>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
