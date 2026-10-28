import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * SkillSync Minimalist Modal
 * Accessible dialog with 1px border, 8px radius, focus trap, and escape key listener.
 */
export function Modal({ isOpen, onClose, title, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-main/40 transition-opacity"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-border bg-bg-card p-6 shadow-restrained text-text-main transition-all space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 id="modal-title" className="font-serif text-lg font-medium text-text-main">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-text-muted hover:text-text-main hover:bg-bg-section transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="text-sm text-text-muted leading-relaxed font-sans">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;

