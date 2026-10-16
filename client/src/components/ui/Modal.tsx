import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  hideCloseButton?: boolean;
  // 'right' = a panel that slides in from the right edge (for details)
  placement?: 'center' | 'right';
}

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// A pop-up window in the middle of the screen.
// Esc or a click outside closes it. Tab stays inside it.
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideCloseButton = false,
  placement = 'center',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // If nothing inside asked for focus (autoFocus), focus the window itself
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.(); // give focus back to the button that opened it
    };
  }, [open, onClose]);

  const isSide = placement === 'right';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 z-[60] flex ${
            isSide ? 'justify-end' : 'items-end justify-center p-4 sm:items-center'
          }`}
        >
          <motion.div
            className="absolute inset-0 bg-foreground/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={`relative flex w-full flex-col border-border bg-card text-card-foreground shadow-xl outline-none ${
              isSide
                ? 'h-full max-w-md border-l'
                : `max-h-[90dvh] rounded-lg border ${WIDTHS[size]}`
            }`}
            initial={
              reduceMotion ? { opacity: 0 } : isSide ? { x: '100%' } : { opacity: 0, y: 12, scale: 0.98 }
            }
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={
              reduceMotion ? { opacity: 0 } : isSide ? { x: '100%' } : { opacity: 0, y: 8, scale: 0.98 }
            }
            transition={{ duration: isSide ? 0.22 : 0.16, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {description && (
                  <div className="mt-1 text-sm text-muted-foreground">{description}</div>
                )}
              </div>
              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-2 -mt-1 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {children && <div className="overflow-y-auto px-6 py-4">{children}</div>}

            {footer && (
              <div className="flex flex-wrap justify-end gap-2 px-6 pb-6 pt-2">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}