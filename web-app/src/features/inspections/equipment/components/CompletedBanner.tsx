/**
 * The green "inspection completed" banner shown at the top of an equipment
 * detail page after the act is finalized. Identical across the bobcat,
 * excavator, general-equipment, and cargo-platform detail pages — extracted
 * here so the engine renders it once.
 */
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';

interface CompletedBannerProps {
  onViewPdf: () => void;
  /** Where "back to list" links. Defaults to the inspections list. */
  listHref?: string;
}

export function CompletedBanner({ onViewPdf, listHref = routes.inspections.list() }: CompletedBannerProps) {
  return (
    <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-green-800">შემოწმების აქტი დასრულებულია ✓</p>
        <p className="text-sm text-green-700 mt-0.5">შეგიძლიათ PDF ვერსია გახსნათ ან სიაში დაბრუნდეთ.</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onViewPdf}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          PDF ნახვა
        </button>
        <Link
          to={listHref}
          className="rounded-md border border-green-300 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
        >
          სიაში დაბრუნება
        </Link>
      </div>
    </div>
  );
}
