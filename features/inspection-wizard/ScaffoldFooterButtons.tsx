import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { KeyboardController } from 'react-native-keyboard-controller';
import { ChevronRight } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button } from '../../components/ui';
import { StatusChip } from '../../components/wizard/StatusChip';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y, useAccessibilitySettings } from '../../lib/accessibility';
import type { Answer, GridValues, Question } from '../../types/models';
import { getstyles, staticStyles } from './styles';
import { scaffoldColStyle } from './wizardSchema';

// Renders the bottom action bar for scaffold grid rows: 3 status buttons by
// default, or 2 detail buttons + a "შემდეგი" Button when option 1 or 2 is
// selected. Lives in the global footer so the buttons sit at the same y as
// the yes/no choice buttons on other steps.
//
// While the keyboard is open (`compact`) the row mirrors the yes/no buttons:
// the two detail statuses (დაზიანება / გამართულია) collapse into mini chips
// side by side, and the "არ გააჩნია" option is hidden — you don't write a
// comment for a part you don't have.
export function ScaffoldFooterButtons({
  question,
  row,
  answer,
  onAnswer,
  onAdvance,
  compact = false,
}: {
  question: Question;
  row: string;
  answer: Answer | undefined;
  onAnswer: (q: Question, m: (a: Answer) => Answer) => Promise<void>;
  onAdvance: () => void;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const { reduceMotion } = useAccessibilitySettings();
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
    const isNone = col === noneCol;
    const label = col.replace('აღენიშნება ', '');
    const { icon: IconComp } = scaffoldColStyle(col, theme);
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
          isSelected && {
            backgroundColor: theme.colors.inverse.background,
            borderColor: theme.colors.inverse.background,
          },
        ]}
        {...a11y('სტატუსი: ' + col, 'შეეხეთ ამ სტატუსის ასარჩევად', 'button')}
      >
        <IconComp
          size={22}
          color={isSelected ? theme.colors.inverse.background : theme.colors.inkSoft}
          fill={isSelected ? theme.colors.inverse.ink : 'transparent'}
          strokeWidth={1.5}
        />
        <Text
          style={[
            staticStyles.statusOptionText,
            { color: isSelected ? theme.colors.inverse.ink : theme.colors.inkSoft },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  // Keyboard-open: mini chips for the two detail statuses, side by side, like
  // the yes/no AnswerButtons. "არ გააჩნია" is dropped (no comment is written
  // for a missing part). Picking a status dismisses the keyboard so the full
  // footer (and "შემდეგი") comes back.
  if (compact) {
    return (
      <Animated.View
        layout={reduceMotion ? undefined : LinearTransition.duration(200)}
        style={{ flexDirection: 'row', gap: 12 }}
      >
        {detailCols.map(col => (
          <StatusChip
            key={col}
            layout="chip"
            selected={selectedStatus === col}
            label={col.replace('აღენიშნება ', '')}
            onPress={() => {
              haptic.light();
              setStatus(col);
              KeyboardController.dismiss();
            }}
            a11yLabel={'სტატუსი: ' + col}
            a11yHint="შეეხეთ ამ სტატუსის ასარჩევად"
          />
        ))}
      </Animated.View>
    );
  }

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
