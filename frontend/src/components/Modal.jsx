import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import t from '../i18n/fr';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const contentRef = useRef(null);
  const lastFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    lastFocusRef.current = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab' && contentRef.current) {
        // Lightweight focus trap.
        const focusable = contentRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => contentRef.current?.querySelector('button, input, textarea')?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      lastFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const maxWidth = size === 'lg' ? 640 : size === 'sm' ? 360 : 480;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div ref={contentRef} className="modal-content" style={{ maxWidth }}>
        <div className="modal-header">
          <h3 id="modal-title" style={{ fontSize: 'var(--text-lg)' }}>
            {title}
          </h3>
          <button
            className="btn btn-ghost btn-icon-only btn-sm"
            onClick={onClose}
            aria-label={t.common.close}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
