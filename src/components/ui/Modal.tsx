import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  maxWidth = 'max-w-md',
}) => {
  const titleId = React.useId();

  // Project add/edit forms were widened to max-w-4xl by a later UI change,
  // while the intended workflow is the original compact vertical editor.
  // Heat Load also uses max-w-4xl, but its direct child is not a form, so it
  // correctly remains wide.
  const isCompactProjectForm =
    maxWidth === 'max-w-4xl' &&
    React.isValidElement(children) &&
    children.type === 'form';

  const resolvedMaxWidth = isCompactProjectForm ? 'max-w-md' : maxWidth;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label={`Tutup ${title}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] h-full w-full cursor-default bg-slate-950/48 backdrop-blur-[3px]"
          />

          <div className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center overflow-y-auto p-3 sm:p-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 16 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={`pointer-events-auto w-full ${resolvedMaxWidth}`}
            >
              <div
                className={cn(
                  'flex max-h-[94dvh] flex-col overflow-hidden rounded-[1.25rem] border border-divider bg-surface-elevated shadow-[0_32px_90px_-36px_rgb(0_0_0/0.8)]',
                  className,
                )}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-divider px-4 py-3.5 sm:px-5 sm:py-4">
                  <h2 id={titleId} className="text-base font-semibold tracking-[-0.02em] text-primary sm:text-lg">
                    {title}
                  </h2>
                  <button
                    type="button"
                    onClick={onClose}
                    className="icon-button"
                    aria-label={`Tutup ${title}`}
                  >
                    <X size={20} />
                  </button>
                </div>

                {isCompactProjectForm && (
                  <style>{`
                    [data-compact-project-form="true"] > form > div:first-child {
                      grid-template-columns: minmax(0, 1fr) !important;
                    }
                  `}</style>
                )}

                <div
                  data-compact-project-form={isCompactProjectForm ? 'true' : undefined}
                  className="min-h-0 overflow-y-auto p-4 sm:p-5"
                >
                  {children}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
