// InspectionPointsContent — the "act" content: the inspection checklist points.
//
// Each template question is a point; its answer drives an OK / issue pill for
// boolean checks, or a value subtitle otherwise. Rows + lead/avatar visuals are
// reused from components/success so the grouped-list look matches the rest of
// the screen.
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react-native';
import { A11yText as Text } from '../../primitives/A11yText';
import { Badge } from '../../primitives/Badge';
import { useTheme, type Theme } from '../../../lib/theme';
import { SuccessListRow, RowLead } from '../../success/SuccessListRow';
import type { Answer, Question } from '../../../types/models';

interface Props {
  questions: Question[];
  answers: Answer[];
}

function answerSubtitle(a: Answer | undefined): string | undefined {
  if (!a) return undefined;
  if (a.value_text) return a.value_text;
  if (a.value_num != null) return String(a.value_num);
  if (a.comment) return a.comment;
  return undefined;
}

export function InspectionPointsContent({ questions, answers }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const byQuestion = useMemo(() => {
    const map: Record<string, Answer> = {};
    for (const a of answers) map[a.question_id] = a;
    return map;
  }, [answers]);

  const ordered = useMemo(
    () => questions.slice().sort((a, b) => a.section - b.section || a.order - b.order),
    [questions],
  );

  if (ordered.length === 0) {
    return <Text style={styles.empty}>{t('details.content.empty')}</Text>;
  }

  return (
    <View style={styles.list}>
      {ordered.map((q, i) => {
        const a = byQuestion[q.id];
        const bool = a?.value_bool;
        return (
          <SuccessListRow
            key={q.id}
            isFirst={i === 0}
            lead={<RowLead icon={ClipboardList} />}
            title={q.title}
            subtitle={bool == null ? answerSubtitle(a) : undefined}
            trailing={
              bool == null ? undefined : (
                <Badge variant={bool ? 'success' : 'danger'}>
                  {bool ? t('details.content.ok') : t('details.content.issue')}
                </Badge>
              )
            }
          />
        );
      })}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.hairline,
      overflow: 'hidden',
    },
    empty: { fontSize: 14, color: theme.colors.inkFaint, paddingHorizontal: 4 },
  });
}
