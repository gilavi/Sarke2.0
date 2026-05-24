import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    const { tint, bg, icon } = scaffoldColStyle(col, theme);
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
          isSelected && { backgroundColor: bg, borderColor: tint },
        ]}
        {...a11y('სტატუსი: ' + col, 'შეეხეთ ამ სტატუსის ასარჩევად', 'button')}
      >
        <Ionicons
          name={isSelected ? (icon as any) : 'ellipse-outline'}
          size={22}
          color={isSelected ? tint : theme.colors.inkFaint}
        />
        <Text
          style={[
            staticStyles.statusOptionText,
            { color: isSelected ? tint : theme.colors.ink },
          ]}
        >
          {col}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={18} color={tint} />
        )}
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
          iconRight={<Ionicons name="chevron-forward" size={18} color={theme.colors.white} />}
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
