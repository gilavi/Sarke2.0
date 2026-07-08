import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Close-confirm for the structured wizard: drafts persist per answer, so
 * closing never loses work — the dialog just says where to resume.
 */
export function WizardCloseDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>დახურვა?</AlertDialogTitle>
          <AlertDialogDescription>
            პროგრესი შენახულია დრაფტად — გააგრძელებთ ისტორიიდან ან მთავარი გვერდიდან.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">გაუქმება</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild onClick={onConfirm}>
            <Button>დახურვა</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
