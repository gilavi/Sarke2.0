import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKETS, signedUrl, upload, removeObjects } from '@/lib/db/storage';
import type { Json, Tables } from '@/types/database';

export type ReportRow = Tables<'reports'>;

export type ReportStatus = 'draft' | 'completed';

/** Slide render layouts — mirrors the mobile `ReportSlideLayout` (types/models.ts). */
export type ReportSlideLayout = 'text-photo' | 'photo-full' | 'two-side' | 'two-stacked';

/** A slide holds at most 2 photos (mobile `MAX_SLIDE_PHOTOS`). */
export const MAX_SLIDE_PHOTOS = 2;

/** One photo on a slide. Mirrors the mobile `SlideImage` (types/models.ts). */
export interface SlideImage {
  image_path: string | null;
  annotated_image_path: string | null;
}

export interface ReportSlide {
  id: string;
  order: number;
  title: string;
  description: string;
  /** Legacy single-photo fields — mobile mirrors only `images[0]` into these. */
  image_path: string | null;
  annotated_image_path: string | null;
  /** Canonical 1–2 photo list (mobile writes this); may be absent on old rows. */
  images?: SlideImage[];
  /** Chosen render layout. When unset, `slideLayout()` derives it from photo count. */
  layout?: ReportSlideLayout;
}

/**
 * The slide's photos as the canonical `SlideImage[]` (legacy-pair fallback for
 * old rows). Entries with no path at all are dropped.
 */
export function slideImages(slide: ReportSlide): SlideImage[] {
  const imgs = slide.images?.length
    ? slide.images
    : [{ image_path: slide.image_path, annotated_image_path: slide.annotated_image_path }];
  return imgs.filter((im) => im.image_path || im.annotated_image_path);
}

/**
 * Storage paths to DISPLAY for a slide, one per photo — the annotated variant
 * when present, otherwise the original. Mirrors mobile `slideImages()` usage.
 */
export function slideDisplayPaths(slide: ReportSlide): string[] {
  return slideImages(slide)
    .map((im) => im.annotated_image_path ?? im.image_path)
    .filter((p): p is string => !!p);
}

/** Effective layout: the stored choice, else derived from photo count (mobile `slideLayout()`). */
export function slideLayout(slide: ReportSlide): ReportSlideLayout {
  if (slide.layout) return slide.layout;
  return slideImages(slide).length >= 2 ? 'two-side' : 'text-photo';
}

/**
 * Every report-photos storage path on a slide. Reads the canonical `images`
 * array (mobile may store 2 photos there, with only the first mirrored into the
 * legacy fields), falling back to the legacy pair for rows without `images`.
 * Use for storage cleanup and for building signed-URL maps (so a 2nd photo
 * isn't skipped in the gallery).
 */
export function slideStoragePaths(slide: ReportSlide): string[] {
  const imgs = slide.images?.length
    ? slide.images
    : [{ image_path: slide.image_path, annotated_image_path: slide.annotated_image_path }];
  return imgs
    .flatMap((im) => [im.image_path, im.annotated_image_path])
    .filter((p): p is string => !!p);
}

export interface Report {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  status: ReportStatus;
  slides: ReportSlide[] | null;
  pdf_url: string | null;
  created_at: string;
}

const COLS = 'id, project_id, user_id, title, status, slides, pdf_url, created_at';

export async function listReports(projectId?: string): Promise<Report[]> {
  let q = supabase.from('reports').select(COLS).order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Report[];
}

export async function getReport(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select(COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Report | null) ?? null;
}

export function signedReportPdfUrl(path: string): Promise<string> {
  return signedUrl(STORAGE_BUCKETS.pdfs, path);
}

export function signedReportPhotoUrl(path: string): Promise<string> {
  return signedUrl(STORAGE_BUCKETS.reportPhotos, path);
}

export async function createReport(args: {
  projectId: string;
  title: string;
}): Promise<Report> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw userErr ?? new Error('არაავტორიზებული');

  const { data, error } = await supabase
    .from('reports')
    .insert({
      project_id: args.projectId,
      user_id: userData.user.id,
      title: args.title,
      status: 'draft',
      slides: [],
    })
    .select(COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Report;
}

/** Patch top-level report fields (title / status). Returns the updated row. */
export async function updateReport(
  id: string,
  patch: Partial<Pick<Report, 'title' | 'status'>>,
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update(patch)
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Report;
}

/**
 * Upload one slide photo to the `report-photos` bucket under the report's
 * project/report prefix. Returns the storage path (feed to `updateReportSlide`).
 */
export async function uploadReportPhoto(
  report: Pick<Report, 'id' | 'project_id'>,
  file: File,
): Promise<string> {
  const dotIdx = file.name.lastIndexOf('.');
  const ext = dotIdx > 0 ? file.name.slice(dotIdx + 1) : 'bin';
  const path = `${report.project_id}/${report.id}/${Date.now()}_${randomId()}.${ext}`;
  await upload(STORAGE_BUCKETS.reportPhotos, path, file);
  return path;
}

/** Best-effort delete of a single report-photos object. */
export async function deleteReportPhotoObject(path: string): Promise<void> {
  await removeObjects(STORAGE_BUCKETS.reportPhotos, [path]);
}

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function addReportSlide(args: {
  report: Report;
  title: string;
  description: string;
  photo?: File | null;
}): Promise<Report> {
  let imagePath: string | null = null;
  if (args.photo) {
    const dotIdx = args.photo.name.lastIndexOf('.');
    const ext = dotIdx > 0 ? args.photo.name.slice(dotIdx + 1) : 'bin';
    imagePath = `${args.report.project_id}/${args.report.id}/${Date.now()}_${randomId()}.${ext}`;
    await upload(STORAGE_BUCKETS.reportPhotos, imagePath, args.photo);
  }

  const existing = args.report.slides ?? [];
  const nextSlide: ReportSlide = {
    id: randomId(),
    order: existing.length,
    title: args.title,
    description: args.description,
    image_path: imagePath,
    annotated_image_path: null,
  };

  const updated = [...existing, nextSlide];
  const { data, error } = await supabase
    .from('reports')
    .update({ slides: updated as unknown as Json })
    .eq('id', args.report.id)
    .select(COLS)
    .single();
  if (error) {
    // The photo was uploaded before the row write; if the row write fails the blob is
    // orphaned in the bucket. Roll it back (best-effort) before surfacing the error.
    if (imagePath) await removeObjects(STORAGE_BUCKETS.reportPhotos, [imagePath]);
    throw new Error(error.message);
  }
  return data as Report;
}

export async function updateReportSlide(
  report: Report,
  slideId: string,
  patch: Partial<Pick<ReportSlide, 'title' | 'description' | 'images' | 'layout'>>,
): Promise<Report> {
  const updated = (report.slides ?? []).map((s) => {
    if (s.id !== slideId) return s;
    const next = { ...s, ...patch };
    // Keep the legacy single-photo mirror in sync when the photo list changes,
    // so older readers (and mobile's fallback path) keep working.
    if (patch.images) {
      next.image_path = patch.images[0]?.image_path ?? null;
      next.annotated_image_path = patch.images[0]?.annotated_image_path ?? null;
    }
    return next;
  });
  const { data, error } = await supabase
    .from('reports')
    .update({ slides: updated as unknown as Json })
    .eq('id', report.id)
    .select(COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Report;
}

export async function removeReportSlide(report: Report, slideId: string): Promise<Report> {
  const existing = report.slides ?? [];
  const target = existing.find((s) => s.id === slideId);
  if (target) {
    const paths = slideStoragePaths(target);
    if (paths.length) {
      await removeObjects(STORAGE_BUCKETS.reportPhotos, paths);
    }
  }
  const updated = existing
    .filter((s) => s.id !== slideId)
    .map((s, i) => ({ ...s, order: i }));
  const { data, error } = await supabase
    .from('reports')
    .update({ slides: updated as unknown as Json })
    .eq('id', report.id)
    .select(COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Report;
}

export async function deleteReport(report: Report): Promise<void> {
  const paths = (report.slides ?? []).flatMap(slideStoragePaths);
  if (paths.length) {
    await removeObjects(STORAGE_BUCKETS.reportPhotos, paths);
  }
  const { error } = await supabase.from('reports').delete().eq('id', report.id);
  if (error) throw new Error(error.message);
}
