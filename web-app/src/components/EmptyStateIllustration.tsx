import type { ReactNode } from 'react';

interface Props {
  image: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyStateIllustration({ image, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className="h-40 w-40 object-contain"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{title}</p>
        {description && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
