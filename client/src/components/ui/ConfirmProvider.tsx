import { useCallback, useRef, useState, type ReactNode } from 'react';
import { CircleHelp, TriangleAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './confirm-context';

// Put this once near the top of the app. After that, any component can ask:
//   const confirm = useConfirm();
//   if (await confirm({ title: 'Delete product?', tone: 'danger' })) { ... }
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // If one is somehow already open, treat it as "No"
    resolver.current?.(false);
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpen(false);
  };

  const danger = options.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={open}
        onClose={() => answer(false)}
        title={options.title}
        size="sm"
        hideCloseButton
        footer={
          <>
            {/* For risky actions the safe button gets the focus first */}
            <Button type="button" variant="outline" autoFocus={danger} onClick={() => answer(false)}>
              {options.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              type="button"
              variant={danger ? 'destructive' : 'primary'}
              autoFocus={!danger}
              onClick={() => answer(true)}
            >
              {options.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="flex gap-4">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
              danger ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
            }`}
          >
            {danger ? <TriangleAlert size={20} /> : <CircleHelp size={20} />}
          </span>
          {options.message && (
            <div className="pt-1 text-sm text-muted-foreground">{options.message}</div>
          )}
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}