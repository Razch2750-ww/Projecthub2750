import React, { useEffect } from 'react';
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

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className, maxWidth = "max-w-md" }) => {
  const titleId = React.useId();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[var(--z-modal)] bg-slate-950/48 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`fixed left-1/2 top-1/2 z-[calc(var(--z-modal)+1)] w-full ${maxWidth} -translate-x-1/2 -translate-y-1/2 p-4`}
          >
            <div className={cn("flex max-h-[90dvh] flex-col overflow-hidden rounded-[1.25rem] border border-divider bg-surface-elevated shadow-[0_32px_90px_-36px_rgb(0_0_0/0.8)]", className)}>
              <div className="flex items-center justify-between border-b border-divider px-5 py-4">
                <h2 id={titleId} className="text-lg font-semibold tracking-[-0.025em] text-primary">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="icon-button"
                  aria-label={`Tutup ${title}`}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-5">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
