'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * ConfirmDialog Component — Reusable confirmation modal.
 *
 * This is a Client Component because it manages focus, keyboard events,
 * and conditional rendering based on the `isOpen` prop.
 *
 * Pattern: "Controlled Modal" — the parent controls open/close state via
 * `isOpen`, `onConfirm`, and `onCancel` props. The dialog itself handles
 * focus trapping and keyboard dismissal internally.
 *
 * Accessibility:
 * - Uses role="dialog" with aria-modal="true" for screen reader semantics
 * - aria-labelledby and aria-describedby link the title and message
 * - Focus is trapped inside the dialog while open
 * - Escape key dismisses the dialog
 * - Focus returns to the previously focused element on close
 *
 * Validates: Requirements 5.2
 */

export interface ConfirmDialogProps {
  /** Whether the dialog is currently visible */
  isOpen: boolean;
  /** The dialog heading */
  title: string;
  /** The confirmation question or description */
  message: string;
  /** Callback fired when the user confirms the action */
  onConfirm: () => void;
  /** Callback fired when the user cancels (or presses Escape) */
  onCancel: () => void;
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
}

/* ------------------------------------------------------------------ */
/*  Inline styles                                                      */
/* ------------------------------------------------------------------ */

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
};

const panelStyles: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '0.75rem',
  padding: '1.5rem',
  maxWidth: '28rem',
  width: '90%',
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
};

const titleStyles: React.CSSProperties = {
  margin: '0 0 0.5rem',
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#111827',
};

const messageStyles: React.CSSProperties = {
  margin: '0 0 1.5rem',
  fontSize: '0.95rem',
  color: '#4b5563',
  lineHeight: 1.5,
};

const actionsStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
};

const buttonBase: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '0.375rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
};

const cancelButtonStyles: React.CSSProperties = {
  ...buttonBase,
  backgroundColor: '#f3f4f6',
  color: '#374151',
};

const confirmButtonStyles: React.CSSProperties = {
  ...buttonBase,
  backgroundColor: '#dc2626',
  color: '#ffffff',
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  /** Store the element that had focus before the dialog opened */
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /**
   * Focus trap + Escape key handler.
   *
   * When the dialog opens we move focus into it and listen for Tab / Escape.
   * Tab is constrained to the focusable elements inside the panel.
   * Escape triggers onCancel, matching native <dialog> behavior.
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (isOpen) {
      // Remember the currently focused element so we can restore it later
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Move focus into the dialog panel
      dialogRef.current?.focus();

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } else {
      // Restore focus when the dialog closes
      previousFocusRef.current?.focus();
    }
  }, [isOpen, handleKeyDown]);

  // Render nothing when the dialog is closed
  if (!isOpen) return null;

  return (
    <div
      style={overlayStyles}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      /**
       * Clicking the overlay (outside the panel) cancels the dialog.
       * We stop propagation on the panel click so it doesn't bubble up.
       */
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        style={panelStyles}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" style={titleStyles}>
          {title}
        </h2>
        <p id="confirm-dialog-message" style={messageStyles}>
          {message}
        </p>
        <div style={actionsStyles}>
          <button
            type="button"
            onClick={onCancel}
            style={cancelButtonStyles}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={confirmButtonStyles}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
