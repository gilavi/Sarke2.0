import { useEffect, useMemo, useState } from 'react';
import { imageForDisplay } from '../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { reportCoverPath } from '../../lib/reportSlides';
import type { Report } from '../../types/models';

/**
 * Resolves a report's cover photo (first photo across its slides, see
 * `reportCoverPath`) to a displayable URI. Returns `null` while loading or when
 * the report has no photos. Single owner for the report-thumbnail fetch so the
 * list `ReportThumb` and the new `ReportCard` never drift on bucket/path.
 */
export function useReportCoverUri(report: Report): string | null {
  const path = useMemo(() => reportCoverPath(report.slides), [report.slides]);
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUri(null);
      return;
    }
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.reportPhotos, path)
      .then((u) => { if (!cancelled) setUri(u); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path]);

  return uri;
}
