import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight, EllipsisVertical } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button } from '../../components/ui';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y } from '../../lib/accessibility';
import type { Answer, GridValues, Question } from '../../types/models';
import { getstyles, staticStyles } from './styles';
import { scaffoldColStyle } from './wizardSchema';

// Renders the bottom action bar for scaffold grid rows: 3 status buttons by
// default, or 2 detail buttons + a "შემდეგი" Button when option 1 or 2 is
// selected. Lives in the global footer so the buttons sit at the same y as
// the yes/no choice buttons on other steps.
export function ScaffoldFooterButtons({
  question,
  row,
  answer,
  onAnswer,
  onAdvance,
}: {
  question: Question;
  row: string;
  answer: Answer | undefined;
  onAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onAdvance: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const cols = question.grid_cols ?? [];
  const statusCols = cols.filter(c => c !== 'კომენტარი');
  const values: Record<string, string> = (answer?.grid_values ?? {})[row] ?? {};
  const selectedStatus = statusCols.find(c => values[c] !== undefined) ?? null;
  const noneCol = statusCols.find(c => c.includes('გააჩნია')) ?? null;
  const detailCols = statusCols.filter(c => c !== noneCol);
  const showDetails = selectedStatus !== null && selectedStatus !== noneCol;

  const setStatus = (col: string) => {
    onAnswer(question, a => {
      const grid: GridValues = { ...(a.grid_values ?? {}) };
      const prev = grid[row] ?? {};
      const cur: Record<string, string> = {};
      if (prev['კომენტარი']) cur['კომენტარი'] = prev['კომენტარი'];
      cur[col] = col;
      grid[row] = cur;
      return { ...a, grid_values: grid };
    });
  };

  const renderStatusButton = (col: string) => {
    const isSelected = selectedStatus === col;
    const { icon: IconComp } = scaffoldColStyle(col, theme);
    const isNone = col === noneCol;
    return (
      <Pressable
        key={col}
        onPress={() => {
          haptic.light();
          setStatus(col);
          if (isNone) onAdvance();
        }}
        style={[
          styles.statusOption,
          isSelected && { borderColor: theme.colors.ink },
        ]}
        {...a11y('სტატუსი: ' + col, 'შეეხეთ ამ სტატუსის ასარჩევად', 'button')}
      >
        {isSelected ? (
          <IconComp size={22} color={theme.colors.ink} strokeWidth={1.5} />
        ) : (
          <EllipsisVertical size={22} color={theme.colors.inkFaint} strokeWidth={1.5} />
        )}
        <Text
          style={[
            staticStyles.statusOptionText,
            { color: theme.colors.ink },
          ]}
        >
          {col}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={staticStyles.gap8}>
      {detailCols.map(renderStatusButton)}
      {showDetails ? (
        <Button
          title="შემდეგი"
          style={{ paddingVertical: 14 }}
          rightIcon={ChevronRight}
          onPress={() => {
            haptic.light();
            onAdvance();
          }}
        />
      ) : noneCol ? (
        renderStatusButton(noneCol)
      ) : null}
    </View>
  );
}
