import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md transition-all"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 350 }}
            className={`fixed left-1/2 top-1/2 z-50 w-full ${maxWidth} -translate-x-1/2 -translate-y-1/2 p-4 sm:p-6`}
          >
            <div className={cn("bg-surface border border-divider rounded-[22px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[88vh] overflow-hidden", className)}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-divider/60 bg-surface">
                <h2 className="text-[17px] font-semibold text-primary tracking-tight">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full text-muted hover:text-primary hover:bg-[var(--bg-surface-hover)] transition-all active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

