/**
 * AlertDialog (23% covered) - the Mantine-Modal-backed dialog wrapper.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test-utils';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

describe('AlertDialog', () => {
  it('renders the trigger element only when closed', () => {
    render(
      <AlertDialog open={false} onOpenChange={() => {}}>
        <AlertDialogTrigger>
          <span>trigger</span>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Desc</AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText('trigger')).toBeInTheDocument();
    // Modal not open → title not shown.
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
  });

  it('renders the modal contents when open=true', () => {
    render(
      <AlertDialog open onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Title</AlertDialogTitle>
            <AlertDialogDescription>Desc</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('AlertDialogTrigger click fires onOpenChange(true)', () => {
    const onOpenChange = vi.fn();
    render(
      <AlertDialog open={false} onOpenChange={onOpenChange}>
        <AlertDialogTrigger>
          <span>trigger</span>
        </AlertDialogTrigger>
      </AlertDialog>,
    );
    fireEvent.click(screen.getByText('trigger'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('AlertDialogAction click fires onClick + onOpenChange(false)', () => {
    const onClick = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogAction onClick={onClick}>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    fireEvent.click(screen.getByText('OK'));
    expect(onClick).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('AlertDialogCancel click fires onClick + onOpenChange(false)', () => {
    const onClick = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogCancel onClick={onClick}>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClick).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('AlertDialogAction with asChild clones the child', () => {
    const onClick = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogAction onClick={onClick} asChild>
            <button type="button">OK</button>
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onClick).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
