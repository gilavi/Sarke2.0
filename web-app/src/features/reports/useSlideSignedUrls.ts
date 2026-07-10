import { useEffect, useState } from 'react';
import { signedReportPhotoUrl, slideDisplayPaths, type ReportSlide } from '@/lib/data/reports';

/**
 * Resolves signed URLs for every display photo across the given slides.
 * Returns a `storage path → signed URL` map that fills in as URLs resolve
 * (failed resolutions are simply absent, so consumers fall back to a
 * placeholder). New paths are fetched incrementally as slides change.
 */
export function useSlideSignedUrls(slides: ReportSlide[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const allPaths = slides.flatMap(slideDisplayPaths);
  const pathsKey = allPaths.join(',');

  useEffect(() => {
    let cancelled = false;
    const missing = allPaths.filter((p) => !urls[p]);
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (p) => {
        try {
          return [p, await signedReportPhotoUrl(p)] as const;
        } catch {
          return [p, ''] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setUrls((prev) => {
        const next = { ...prev };
        for (const [p, url] of pairs) if (url) next[p] = url;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey]);

  return urls;
}
