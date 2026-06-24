import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBottomSheet } from '../../components/BottomSheet';
import { useToast } from '../../lib/toast';
import { friendlyError } from '../../lib/errorMap';
import { reportsApi } from '../../lib/services';
import { queryClient } from '../../lib/queryClient';
import { invalidateRecordLists } from '../../lib/apiHooks';
import type { Report } from '../../types/models';

/**
 * Confirm-then-delete a completed report. Shared by the report card surfaces
 * (rail/grid long-press + inline delete button) and the report-detail header
 * trash button so the confirmation copy, the `reportsApi.remove` call, and the
 * `invalidateRecordLists` refresh all live in exactly one place.
 *
 * Returns a function that opens the destructive bottom sheet for a given
 * report id. `onDeleted` (optional) fires after a successful delete — the
 * detail screen passes `router.back`; list surfaces leave it unset because the
 * invalidation already drops the row from the list.
 */
export function useReportDelete(onDeleted?: () => void): (report: Pick<Report, 'id'>) => void {
  const showSheet = useBottomSheet();
  const toast = useToast();
  const { t } = useTranslation();
  return useCallback(
    (report: Pick<Report, 'id'>) => {
      showSheet(
        {
          title: t('records.deleteTitle'),
          options: [t('projects.deleteConfirmYes'), t('common.cancel')],
          cancelButtonIndex: 1,
          destructiveButtonIndex: 0,
        },
        async (idx) => {
          if (idx !== 0) return;
          try {
            await reportsApi.remove(report.id);
            invalidateRecordLists(queryClient);
            toast.success(t('notifications.deleted'));
            onDeleted?.();
          } catch (e) {
            toast.error(friendlyError(e, t('errors.deleteFailed')));
          }
        },
      );
    },
    [showSheet, toast, t, onDeleted],
  );
}
