import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/data/projects';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE: Record<AvatarSize, { outer: string; text: string; radius: string }> = {
  xs: { outer: 'h-5 w-5',   text: 'text-[10px]', radius: 'rounded-md'  },
  sm: { outer: 'h-8 w-8',   text: 'text-sm',     radius: 'rounded-xl'  },
  md: { outer: 'h-11 w-11', text: 'text-base',    radius: 'rounded-xl'  },
  lg: { outer: 'h-14 w-14', text: 'text-lg',      radius: 'rounded-xl'  },
};

interface ProjectAvatarProps {
  project: Pick<Project, 'name' | 'company_name' | 'logo'>;
  size?: AvatarSize;
  className?: string;
}

export function ProjectAvatar({ project, size = 'md', className }: ProjectAvatarProps) {
  const { outer, text, radius } = SIZE[size];
  const initial = (project.company_name || project.name)
    .charAt(0)
    .toLocaleUpperCase('ka-GE');

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden bg-brand-100',
        outer,
        radius,
        className,
      )}
    >
      {project.logo ? (
        <img src={project.logo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className={cn(
            'flex h-full w-full items-center justify-center font-bold text-brand-700',
            text,
          )}
        >
          {initial}
        </span>
      )}
    </div>
  );
}

/** Editable variant — shows camera overlay on hover, opens a file picker. */
interface EditableProjectAvatarProps extends ProjectAvatarProps {
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export function EditableProjectAvatar({
  project,
  size = 'lg',
  className,
  onFileInputChange,
  disabled,
}: EditableProjectAvatarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { outer, text, radius } = SIZE[size];
  const initial = (project.company_name || project.name)
    .charAt(0)
    .toLocaleUpperCase('ka-GE');

  return (
    <>
      <button
        type="button"
        title="ლოგოს შეცვლა"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        className={cn(
          'group relative shrink-0 overflow-hidden bg-brand-100 transition',
          'border border-neutral-200 hover:border-brand-400 disabled:opacity-60',
          outer,
          radius,
          className,
        )}
      >
        {project.logo ? (
          <img src={project.logo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className={cn(
              'flex h-full w-full items-center justify-center font-bold text-brand-700',
              text,
            )}
          >
            {initial}
          </span>
        )}
        {/* Hover overlay */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
          <Camera size={size === 'xs' || size === 'sm' ? 12 : 16} className="text-white" />
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileInputChange}
      />
    </>
  );
}
