import { Modal, Group, Text } from '@mantine/core';
import { createContext, useContext, type ReactNode, cloneElement, isValidElement } from 'react';

interface AlertDialogCtx {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogCtx>({
  open: false,
  onOpenChange: () => {},
});

interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  defaultOpen?: boolean;
}

export function AlertDialog({ open: controlledOpen, onOpenChange, children, defaultOpen: _defaultOpen }: AlertDialogProps) {
  // Support both controlled (open/onOpenChange) and uncontrolled (internal state).
  // For uncontrolled use, the Trigger manages a local state via context.
  // We use a simple controlled wrapper here; for the uncontrolled case
  // callers must pass open+onOpenChange or rely on AlertDialogTrigger.
  return (
    <AlertDialogContext.Provider value={{ open: controlledOpen ?? false, onOpenChange: onOpenChange ?? (() => {}) }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const { onOpenChange } = useContext(AlertDialogContext);
  if (asChild && isValidElement(children)) {
    return cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as React.ReactElement<any>).props.onClick?.(e);
        onOpenChange(true);
      },
    });
  }
  return <span onClick={() => onOpenChange(true)}>{children}</span>;
}

export function AlertDialogContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { open, onOpenChange } = useContext(AlertDialogContext);
  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      withCloseButton={false}
      radius="md"
      centered
      classNames={{ content: className ?? '' }}
    >
      {children}
    </Modal>
  );
}

export function AlertDialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function AlertDialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Group justify="flex-end" mt="md" className={className ?? ''}>
      {children}
    </Group>
  );
}

export function AlertDialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text fw={600} size="lg" mb={4} className={className ?? ''}>
      {children}
    </Text>
  );
}

export function AlertDialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text size="sm" c="dimmed" className={className ?? ''}>
      {children}
    </Text>
  );
}

export function AlertDialogAction({
  children,
  onClick,
  asChild,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  asChild?: boolean;
  className?: string;
}) {
  const { onOpenChange } = useContext(AlertDialogContext);
  if (asChild && isValidElement(children)) {
    return cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as React.ReactElement<any>).props.onClick?.(e);
        onClick?.();
        onOpenChange(false);
      },
    });
  }
  return (
    <span
      className={className}
      onClick={() => {
        onClick?.();
        onOpenChange(false);
      }}
    >
      {children}
    </span>
  );
}

export function AlertDialogCancel({
  children,
  onClick,
  asChild,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  asChild?: boolean;
  className?: string;
}) {
  const { onOpenChange } = useContext(AlertDialogContext);
  if (asChild && isValidElement(children)) {
    return cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as React.ReactElement<any>).props.onClick?.(e);
        onClick?.();
        onOpenChange(false);
      },
    });
  }
  return (
    <span
      className={className}
      onClick={() => {
        onClick?.();
        onOpenChange(false);
      }}
    >
      {children}
    </span>
  );
}

// Stubs for any other imports
export const AlertDialogOverlay = () => null;
export const AlertDialogPortal = ({ children }: { children: ReactNode }) => <>{children}</>;
