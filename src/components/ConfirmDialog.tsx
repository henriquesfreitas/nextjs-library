'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * ConfirmDialog Component — Reusable confirmation modal.
 *
 * Pattern: Controlled Modal
 * The parent component owns the open/closed state (`isOpen` prop) and provides
 * callbacks for confirm and cancel actions. This component never manages its own
 * visibility — it simply renders (or returns null) based on the `isOpen` prop.
 * This makes the dialog predictable and testable: the parent decides when to show
 * it and what to do when the user responds.
 *
 * Focus Trap Implementation:
 * When the dialog opens, focus is moved to the dialog container (via `tabIndex={-1}`
 * and `dialogRef.current?.focus()`). A keydown listener intercepts Tab/Shift+Tab
 * to cycle focus only among focusable elements within the dialog. This prevents
 * keyboard users from accidentally interacting with content behind the overlay,
 * which is a WCAG 2.1 requirement for modal dialogs.
 *
 * Escape Key Handling:
 * Pressing Escape calls `onCancel`, closing the dialog. This is a standard UX
 * convention for modals and is expected by keyboard and screen reader users.
 *
 * Focus Restoration on Close:
 * Before opening, the component stores `document.activeElement` in a ref. When
 * the dialog closes (isOpen transitions to false), focus is returned to that
 * previously-focused element. This ensures keyboard users don't lose their place
 * in the page after dismissing the dialog.
 *
 * Backdrop Click:
 * Clicking the semi-transparent backdrop (overlay) triggers `onCancel`. The inner
 * dialog panel uses `e.stopPropagation()` to prevent clicks inside the dialog
 * from bubbling up to the backdrop handler.
 *
 * Accessibility:
 * - `role="dialog"` identifies the element as a dialog to assistive technology.
 * - `aria-modal="true"` tells screen readers that content behind is inert.
 * - `aria-labelledby="confirm-dialog-title"` links the dialog to its heading.
 * - `aria-describedby="confirm-dialog-message"` links to the descriptive text.
 * - Focus trap ensures Tab key cannot escape the dialog while open.
 * - Escape key provides a keyboard-accessible dismiss mechanism.
 *
 * Styling uses Tailwind utility classes for maintainability and responsive design support.
 *
 * Validates: Requirement 5.2 (confirmation dialog before destructive actions).
 */

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

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
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
      previousFocusRef.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl p-6 max-w-md w-[90%] shadow-2xl"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="text-[0.95rem] text-gray-600 leading-relaxed mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
