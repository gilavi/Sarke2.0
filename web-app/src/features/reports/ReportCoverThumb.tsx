import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { IconChip } from '@/components/ui/icon-chip';
import { signedReportPhotoUrl, slideDisplayPaths, type Report } from '@/lib/data/reports';

/**
 * ReportCoverThumb — the leading element for report list rows: the report's
 * cover photo (first photo of the first slide, via a signed URL) as a small
 * rounded thumbnail, falling back to the FileText IconChip (danger tone —
 * the reports record-family color) while loading or when there is no photo.
 */
export function ReportCoverThumb({ report }: { report: Report }) {
  const cover = (report.slides ?? []).map((s) => slideDisplayPaths(s)[0]).find(Boolean) ?? null;
  const [url, setUrl] = useState<string | null>(null);

  // Reset during render when the cover path changes ("store previous value"
  // pattern) so a stale photo never shows for the new path.
  const [prevCover, setPrevCover] = useState(cover);
  if (prevCover !== cover) {
    setPrevCover(cover);
    setUrl(null);
  }

  useEffect(() => {
    let cancelled = false;
    if (!cover) return;
    signedReportPhotoUrl(cover)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cover]);

  if (!url) return <IconChip icon={FileText} tone="danger" size="lg" />;
  return (
    <img
      src={url}
      alt=""
      className="h-10 w-10 shrink-0 rounded-lg border border-[var(--border-default)] object-cover"
    />
  );
}
