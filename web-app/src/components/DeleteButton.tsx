/**
 * DeleteButton — a Trash icon button that opens an AlertDialog before calling onDelete.
 * Replaces the inline "დარწმუნებული ხართ?" toggle pattern across detail pages.
 */
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props {
  onDelete: () => void;
  isPending?: boolean;
  label?: string;
}

export default function DeleteButton({ onDelete, isPending = false, label = 'წაშლა' }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:border-red-300 hover:bg-red-50"
          disabled={isPending}
        >
          <Trash2 size={14} className="mr-1" />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>ჩანაწერის წაშლა</AlertDialogTitle>
        <AlertDialogDescription>
          ეს მოქმედება შეუქცევადია. ჩანაწერი სამუდამოდ წაიშლება.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" size="sm">გაუქმება</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              size="sm"
              variant="danger"
              onClick={onDelete}
              disabled={isPending}
            >
              {isPending ? 'იშლება…' : 'წაშლა'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
