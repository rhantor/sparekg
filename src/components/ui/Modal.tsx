'use client';
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: number;
}

/** Centered light modal with backdrop + ESC close. Used for Contact / Bid / Video dialogs. */
export function Modal({ open, onClose, title, subtitle, children, maxWidth = 440 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[997] flex items-center justify-center bg-black/65 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full bg-white rounded-2xl p-6 sm:p-8 shadow-float"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-paper text-ash hover:bg-line flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {title && <h3 className="font-display text-2xl text-navy mb-1 pr-8">{title}</h3>}
        {subtitle && <p className="text-sm text-ash mb-5">{subtitle}</p>}

        {children}
      </div>
    </div>
  );
}
