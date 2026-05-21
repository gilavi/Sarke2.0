import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { QuestionTable } from './QuestionTable';
import { Sidebar } from './Sidebar';
import { WizardFooter } from './WizardFooter';
import { WizardHeader } from './WizardHeader';
import {
  WIZARD_COLORS as C,
  webStyle,
  type AnswerValue,
  type Question,
  type WizardConfig,
  type WizardItem,
  type WizardItemStatus,
} from './types';

export type {
  AnswerValue,
  Question,
  WizardConfig,
  WizardData,
  WizardItem,
  WizardItemStatus,
} from './types';

/** Tally of yes/no answers across the supplied questions. */
function computeStats(item: WizardItem): { yes: number; no: number } {
  let yes = 0;
  let no = 0;
  for (const value of Object.values(item.answers)) {
    if (value === 'yes') yes += 1;
    else if (value === 'no') no += 1;
  }
  return { yes, no };
}

/** Derive an item's lifecycle status from its current answers. */
function deriveStatus(item: WizardItem, questions: Question[]): WizardItemStatus {
  const answered = questions.filter((q) => item.answers[q.id]).length;
  const hasProblem = questions.some((q) => item.answers[q.id] === 'no');
  if (hasProblem) return 'problem';
  if (answered === 0) return 'pending';
  if (answered === questions.length) return 'done';
  return 'in_progress';
}

/** Apply recomputed stats + status to an item. */
function refresh(item: WizardItem, questions: Question[]): WizardItem {
  return { ...item, stats: computeStats(item), status: deriveStatus(item, questions) };
}

/**
 * Generic full-page inspection wizard for web. Owns the per-item answer state
 * internally; the host flow supplies a {@link WizardConfig} and receives the
 * final snapshot through `onComplete`. Renders nothing on native.
 */
export function InspectionWizard({ config }: { config: WizardConfig }) {
  const { questions, itemLabel, onClose, onComplete, onSaveItem, onAddItem } = config;

  const [items, setItems] = useState<WizardItem[]>(() =>
    config.items.map((item) => refresh(item, questions)),
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(
    config.items[0]?.id ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);

  const activeIndex = useMemo(
    () => items.findIndex((item) => item.id === activeItemId),
    [items, activeItemId],
  );
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
  const isLast = activeIndex === items.length - 1;

  /** Fade content out then in when switching between items. */
  const switchTo = useCallback((id: string) => {
    setContentVisible(false);
    setActiveItemId(id);
    setTimeout(() => setContentVisible(true), 100);
  }, []);

  const goToIndex = useCallback(
    (index: number) => {
      const target = items[index];
      if (target) switchTo(target.id);
    },
    [items, switchTo],
  );

  const handleAdd = useCallback(() => {
    const fresh =
      onAddItem?.() ??
      ({
        id: `item-${Date.now()}`,
        label: `${itemLabel} ${items.length + 1}`,
        status: 'pending',
        answers: {},
        details: {},
      } satisfies WizardItem);
    const normalised = refresh(fresh, questions);
    setItems((prev) => [...prev, normalised]);
    switchTo(normalised.id);
  }, [items.length, itemLabel, onAddItem, questions, switchTo]);

  const updateActive = useCallback(
    (mutate: (item: WizardItem) => WizardItem) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === activeItemId ? refresh(mutate(item), questions) : item,
        ),
      );
    },
    [activeItemId, questions],
  );

  const handleAnswer = useCallback(
    (questionId: string, value: AnswerValue) => {
      updateActive((item) => ({
        ...item,
        answers: { ...item.answers, [questionId]: value },
      }));
    },
    [updateActive],
  );

  const handleComment = useCallback(
    (questionId: string, comment: string) => {
      updateActive((item) => ({
        ...item,
        details: {
          ...item.details,
          [questionId]: { ...item.details?.[questionId], comment },
        },
      }));
    },
    [updateActive],
  );

  const handleAddPhoto = useCallback(
    (questionId: string) => {
      // Photo capture/upload is owned by the host flow; record intent only.
      updateActive((item) => {
        const existing = item.details?.[questionId]?.photos ?? [];
        return {
          ...item,
          details: {
            ...item.details,
            [questionId]: { ...item.details?.[questionId], photos: existing },
          },
        };
      });
    },
    [updateActive],
  );

  const saveActive = useCallback(async () => {
    if (!activeItem || !onSaveItem) return;
    setSaving(true);
    try {
      await onSaveItem(activeItem);
    } finally {
      setSaving(false);
    }
  }, [activeItem, onSaveItem]);

  const handleNext = useCallback(async () => {
    await saveActive();
    if (activeIndex >= 0 && activeIndex < items.length - 1) {
      goToIndex(activeIndex + 1);
    }
  }, [activeIndex, goToIndex, items.length, saveActive]);

  const handleBack = useCallback(() => {
    if (activeIndex > 0) goToIndex(activeIndex - 1);
  }, [activeIndex, goToIndex]);

  const handleComplete = useCallback(async () => {
    await saveActive();
    onComplete({ items });
  }, [items, onComplete, saveActive]);

  // Global keys: Escape closes; Arrow up/down moves between items (only when a
  // question row isn't capturing the event for answer entry).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown' && activeIndex < items.length - 1) {
        event.preventDefault();
        goToIndex(activeIndex + 1);
      } else if (event.key === 'ArrowUp' && activeIndex > 0) {
        event.preventDefault();
        goToIndex(activeIndex - 1);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeIndex, goToIndex, items.length, onClose]);

  if (Platform.OS !== 'web') return null;

  const sectionLabel = `${itemLabel}ები`;

  return (
    <View style={styles.overlay}>
      <WizardHeader
        projectName={config.projectName}
        projectLogo={config.projectLogo}
        actName={config.actName}
        current={activeIndex >= 0 ? activeIndex + 1 : 0}
        total={items.length}
        onClose={onClose}
      />

      <View style={styles.body}>
        <Sidebar
          sectionLabel={sectionLabel}
          itemLabel={itemLabel}
          items={items}
          activeItemId={activeItemId}
          onSelect={switchTo}
          onAdd={handleAdd}
        />

        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
          <View style={[styles.contentInner, { opacity: contentVisible ? 1 : 0 }]}>
            {activeItem ? (
              <>
                <Text style={styles.h2}>{activeItem.label}</Text>
                <Text style={styles.subtitle}>შეამოწმეთ ყველა პუნქტი</Text>
                <View style={styles.divider} />
                <QuestionTable
                  questions={questions}
                  answers={activeItem.answers}
                  details={activeItem.details ?? {}}
                  onAnswer={handleAnswer}
                  onComment={handleComment}
                  onAddPhoto={handleAddPhoto}
                />
              </>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  დაამატეთ {itemLabel} დასაწყებად
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <WizardFooter
        showBack={activeIndex > 0}
        isLast={isLast}
        saving={saving}
        onBack={handleBack}
        onNext={handleNext}
        onComplete={handleComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: webStyle({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
    zIndex: 1000,
  }),
  body: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  main: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainContent: {
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  contentInner: webStyle({
    width: '100%',
    maxWidth: 680,
    transitionProperty: 'opacity',
    transitionDuration: '100ms',
  }),
  h2: {
    fontSize: 20,
    fontWeight: '600',
    color: C.text,
  },
  subtitle: {
    fontSize: 13,
    color: C.textGray,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 16,
  },
  empty: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: C.textGray,
  },
});
