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
            className="fixed inset-0 z-[100] h-full w-full cursor-default bg-slate-950/60 backdrop-blur-sm"
          />

          <div className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center overflow-y-auto p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={cn('pointer-events-auto w-full', maxWidth)}
            >
              <div
                className={cn(
                  'flex max-h-[92dvh] flex-col overflow-hidden rounded-[1.25rem] border border-divider bg-surface-elevated text-primary shadow-[0_32px_90px_-36px_rgb(0_0_0/0.8)]',
                  className,
                )}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-divider px-5 py-4 bg-surface-elevated">
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

                <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
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
