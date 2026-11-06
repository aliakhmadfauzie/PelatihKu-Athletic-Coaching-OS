import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl'
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'xl',
  showCloseButton = true
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={`w-full ${maxWidthMap[maxWidth]} max-h-[92vh] bg-[#141b2b] border border-white/[0.12] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-in slide-in-from-bottom-4 duration-200`}
      >
        {/* Mobile Grab Handle */}
        <div className="w-10 h-1 rounded-full bg-[#2e3545] mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="px-5 py-4 bg-[#141b2b]/95 border-b border-white/[0.08] flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              {title && (
                <h2 id="modal-title" className="text-base font-bold text-white truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs text-neutral-400 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup modal"
                className="min-w-[44px] min-h-[44px] rounded-xl bg-white/[0.06] text-neutral-400 hover:text-white flex items-center justify-center shrink-0 transition-colors focus-ring"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
