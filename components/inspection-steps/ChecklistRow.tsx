/**
 * Single row in an equipment checklist step. A thin adapter over the shared
 * monochrome {@link ChecklistItemRow}: three result chips (ვარგისია / ხარვეზი /
 * გამოუსადეგარია), no per-row note/photo (problem detail + photos live on the
 * conclusion step). The `comment`/`photo_paths` state fields are kept on the
 * type for the PDF/schema but are no longer captured here.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, TriangleAlert } from 'lucide-react-native';
import { ChecklistItemRow, type ChecklistRowOption } from '../inspection-parts/ChecklistItemRow';
import type { ChecklistLegendItem } from '../inspection-parts/ChecklistLegend';
import i18n from '../../lib/i18n';

export type ChecklistResult = 'good' | 'deficient' | 'unusable' | null;

export interface ChecklistItem {
  id: string;
  description: string;
  /** Optional section label - used to render section headers in ChecklistStep */
  section?: string;
}

export interface ChecklistItemState {
  id: string;
  result: ChecklistResult;
  comment: string | null;
  photo_paths: string[];
}

/** Legend explaining the three monochrome result chips (rendered by ChecklistStep). */
export const CHECKLIST_LEGEND: ChecklistLegendItem[] = [
  { icon: Check, label: i18n.t('inspections.checklistGood') },
  { icon: TriangleAlert, label: i18n.t('inspections.checklistDeficient') },
  { icon: X, label: i18n.t('inspections.checklistUnusable') },
];

export interface ChecklistRowProps {
  item: ChecklistItem;
  state: ChecklistItemState;
  /** Called with only the changed fields - the caller supplies the id. */
  onStateChange: (patch: Partial<ChecklistItemState>) => void;
  // ── Legacy props (per-row notes/photos removed app-wide). Accepted so existing
  //    callers keep compiling; ignored. ──
  onPhotoPress?: () => void;
  showCommentButton?: boolean;
  isCommentExpanded?: boolean;
  onCommentToggle?: () => void;
}

export function ChecklistRow({ item, state, onStateChange }: ChecklistRowProps) {
  const { t } = useTranslation();
  const options = useMemo<ChecklistRowOption[]>(
    () => [
      { value: 'good', icon: Check, a11yLabel: `${item.description} - ${t('inspections.checklistGood')}` },
      { value: 'deficient', icon: TriangleAlert, a11yLabel: `${item.description} - ${t('inspections.checklistDeficient')}` },
      { value: 'unusable', icon: X, a11yLabel: `${item.description} - ${t('inspections.checklistUnusable')}` },
    ],
    [item.description, t],
  );
  return (
    <ChecklistItemRow
      label={item.description}
      options={options}
      value={state.result}
      onChange={v => onStateChange({ result: v as ChecklistResult })}
      dense
    />
  );
}
