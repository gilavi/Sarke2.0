import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toastError } from '@/lib/errors';
import { SPRING } from '@/lib/animations';
import type { ReportSlide } from '@/lib/data/reports';

interface SlideCardProps {
  slide: ReportSlide;
  index: number;
  /** Draft reports allow editing title/description and removing the slide. */
  editable: boolean;
  imageUrl?: string;
  /** Persist a title/description patch. Must reject on failure so we can revert. */
  onSave: (patch: { title?: string; description?: string }) => Promise<unknown>;
  onRemove: () => void;
  isRemoving?: boolean;
}

/**
 * A single report slide. In draft mode the title/description are CONTROLLED inputs
 * (not `defaultValue`), so:
 *   - they resync when the saved value changes (refetch / reorder), and
 *   - a failed save reverts to the last-saved value instead of silently diverging
 *     from the database (the bug `defaultValue` + onBlur had).
 */
export function SlideCard({
  slide,
  index,
  editable,
  imageUrl,
  onSave,
  onRemove,
  isRemoving,
}: SlideCardProps) {
  const [title, setTitle] = useState(slide.title);
  const [description, setDescription] = useState(slide.description);

  // Resync local edits from the saved value whenever the server copy changes
  // (refetch / reorder / another tab). Done during render via the React-recommended
  // "store previous value" pattern rather than an effect, so an unchanged refetch
  // never clobbers an in-progress edit.
  const [synced, setSynced] = useState({ title: slide.title, description: slide.description });
  if (synced.title !== slide.title || synced.description !== slide.description) {
    setSynced({ title: slide.title, description: slide.description });
    setTitle(slide.title);
    setDescription(slide.description);
  }

  async function commit(
    patch: { title?: string; description?: string },
    revert: () => void,
  ) {
    try {
      await onSave(patch);
    } catch (e) {
      revert(); // restore the last-saved value so the field never lies about the DB
      toastError(e);
    }
  }

  const label = slide.title || `სლაიდი ${index + 1}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', ...SPRING.listItem }}
    >
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1 pr-2">
          {editable ? (
            <Input
              value={title}
              placeholder={`სლაიდი ${index + 1}`}
              className="font-semibold"
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                const v = title.trim();
                if (v !== slide.title) void commit({ title: v }, () => setTitle(slide.title));
              }}
            />
          ) : (
            <CardTitle className="text-base">
              {index + 1}. {slide.title || 'სლაიდი'}
            </CardTitle>
          )}
        </div>
        <div className="flex items-start gap-2 shrink-0 ml-2">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={label}
              className="h-16 w-16 rounded-lg object-cover border border-neutral-200"
            />
          ) : null}
          {editable && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isRemoving}
              aria-label={`${label} - სლაიდის წაშლა`}
              className="mt-1 text-neutral-400 hover:text-red-500 disabled:opacity-50"
              title="სლაიდის წაშლა"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editable ? (
          <Textarea
            rows={2}
            value={description}
            placeholder="აღწერა"
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== slide.description)
                void commit({ description }, () => setDescription(slide.description));
            }}
          />
        ) : (
          slide.description && <p className="text-sm text-neutral-700">{slide.description}</p>
        )}
      </CardContent>
    </Card>
    </motion.div>
  );
}
