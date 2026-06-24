import { memo, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { CircleAlert, Clock, CircleCheck } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { A11yText as Text } from '../../primitives/A11yText';
import { useTheme } from '../../../lib/theme';
import { useAccessibilitySettings } from '../../../lib/accessibility';
import { haptic } from '../../../lib/haptics';
import type { Answer, Question } from '../../../types/models';
import { badCountFor, componentColsFor, rowKey } from './_shared';
import { getstyles } from './styles';

// ─────────────────────────── Step 2: Overview ───────────────────────────────

type CardState = 'ok' | 'inProgress' | 'problems';

export const KamariOverview = memo(function KamariOverview({
  question,
  answer,
  count,
  visited,
  onOpen,
}: {
  question: Question;
  answer: Answer | undefined;
  count: number;
  visited: Set<number>;
  onOpen: (index: number) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { reduceMotion } = useAccessibilitySettings();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const cols = useMemo(() => componentColsFor(question), [question]);
  const indices = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);

  return (
    <ScrollView
      contentContainerStyle={styles.overviewContent}
      showsVerticalScrollIndicator={false}
    >
      <Text size="xl" weight="bold" style={{ marginBottom: 4 }}>
        {t('wizard.kamariOverviewTitle')}
      </Text>
      <Text size="sm" color={theme.colors.inkSoft} style={{ marginBottom: 16 }}>
        {t('wizard.kamariOverviewSubtitle')}
      </Text>
      <View style={styles.grid}>
        {indices.map(i => {
          const bad = badCountFor(answer, rowKey(i), cols);
          const state: CardState =
            bad > 0 ? 'problems' : visited.has(i) ? 'inProgress' : 'ok';
          return (
            <KamariCard
              key={i}
              index={i}
              state={state}
              problemCount={bad}
              onPress={() => onOpen(i)}
            />
          );
        })}
      </View>
    </ScrollView>
  );
});

const KamariCard = memo(function KamariCard({
  index,
  state,
  problemCount,
  onPress,
}: {
  index: number;
  state: CardState;
  problemCount: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getstyles(theme), [theme]);

  const palette: { bg: string; border: string; Icon: LucideIcon; iconColor: string; label: string; labelColor: string } =
    state === 'problems'
      ? {
          bg: theme.colors.dangerSoft,
          border: theme.colors.danger,
          Icon: CircleAlert,
          iconColor: theme.colors.danger,
          label: t('wizard.kamariProblems', { count: problemCount }),
          labelColor: theme.colors.danger,
        }
      : state === 'inProgress'
        ? {
            bg: theme.colors.semantic.warningSoft,
            border: theme.colors.semantic.warning,
            Icon: Clock,
            iconColor: theme.colors.semantic.warning,
            label: t('wizard.kamariInProgress'),
            labelColor: theme.colors.semantic.warning,
          }
        : {
            bg: theme.colors.semantic.successSoft,
            border: theme.colors.semantic.success,
            Icon: CircleCheck,
            iconColor: theme.colors.semantic.success,
            label: t('wizard.kamariOk'),
            labelColor: theme.colors.semantic.success,
          };
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text size="lg" weight="bold" style={{ marginBottom: 8 }}>
        {t('wizard.kamariCardTitle', { index })}
      </Text>
      {(() => { const PaletteIcon = palette.Icon; return <PaletteIcon size={42} color={palette.iconColor} strokeWidth={1.5} />; })()}
      <Text
        size="sm"
        weight="semibold"
        color={palette.labelColor}
        style={{ marginTop: 8 }}
      >
        {palette.label}
      </Text>
    </Pressable>
  );
});
