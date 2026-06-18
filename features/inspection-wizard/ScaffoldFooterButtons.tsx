import { useMemo } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { KeyboardController } from 'react-native-keyboard-controller';
import { ChevronRight } from 'lucide-react-native';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { Button } from '../../components/ui';
import { useTheme } from '../../lib/theme';
import { haptic } from '../../lib/haptics';
import { a11y, useAccessibilitySettings } from '../../lib/accessibility';
import type { Answer, GridValues, Question } from '../../types/models';
import { getstyles, staticStyles } from './styles';
import { scaffoldColStyle } from './wizardSchema';
import { useMorphStage } from './useMorphStage';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  // One persistent button instance per status. The morph between the big
  // stacked option and the side-by-side chip is sequenced one property at a
  // time (icons → shrink → rearrange) via useMorphStage, so the per-element
  // `layout` transition only ever animates a single change at once.
  const morph = useMorphStage(compact, reduceMotion);
  const layoutAnim = reduceMotion ? undefined : LinearTransition.duration(160);

  const renderDetail = (col: string) => {
    const isSelected = selectedStatus === col;
    const isNone = col === noneCol;
    const label = col.replace('აღენიშნება ', '');
    const { icon: IconComp } = scaffoldColStyle(col, theme);
    return (
      <AnimatedPressable
        key={col}
        layout={layoutAnim}
        onPress={() => {
          haptic.light();
          setStatus(col);
          if (isNone) onAdvance();
          else if (compact) KeyboardController.dismiss();
        }}
        style={[
          morph.sized === 'chip' ? styles.statusChip : styles.statusOption,
          isSelected && {
            backgroundColor: theme.colors.inverse.background,
            borderColor: theme.colors.inverse.background,
          },
        ]}
        {...a11y('სტატუსი: ' + col, 'შეეხეთ ამ სტატუსის ასარჩევად', 'button')}
      >
        {morph.showIcon ? (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(150)}
            exiting={reduceMotion ? undefined : FadeOut.duration(120)}
          >
            <IconComp
              size={22}
              color={isSelected ? theme.colors.inverse.background : theme.colors.inkSoft}
              fill={isSelected ? theme.colors.inverse.ink : 'transparent'}
              strokeWidth={1.5}
            />
          </Animated.View>
        ) : null}
        <Text
          style={[
            morph.sized === 'chip' ? staticStyles.statusChipText : staticStyles.statusOptionText,
            { color: isSelected ? theme.colors.inverse.ink : theme.colors.inkSoft },
          ]}
        >
          {label}
        </Text>
      </AnimatedPressable>
    );
  };

  return (
    <Animated.View layout={layoutAnim} style={morph.row ? styles.statusRow : staticStyles.gap8}>
      {detailCols.map(renderDetail)}
      {morph.expanded ? (
        showDetails ? (
          <Animated.View
            key="next"
            layout={layoutAnim}
            entering={reduceMotion ? undefined : FadeIn.duration(150)}
            exiting={reduceMotion ? undefined : FadeOut.duration(120)}
          >
            <Button
              title="შემდეგი"
              style={{ paddingVertical: 14 }}
              rightIcon={ChevronRight}
              onPress={() => {
                haptic.light();
                onAdvance();
              }}
            />
          </Animated.View>
        ) : noneCol ? (
          renderDetail(noneCol)
        ) : null
      ) : null}
    </Animated.View>
  );
}
