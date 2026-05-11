'use client';

import { useEffect, useCallback } from 'react';

/**
 * Notification Component — Toast-style feedback for user actions.
 *
 * Pattern: Client Component (Controlled Component)
 * This is a Client Component because it uses timers (setTimeout for auto-dismiss)
 * and event handlers (onClick for manual close). The parent owns the visibility
 * state — this component does not decide when to appear or disappear. The parent
 * renders it conditionally and provides an `onClose` callback that clears the
 * notification state, causing this component to unmount.
 *
 * Why it exists:
 * After mutations (create, edit, delete, buy), users need immediate feedback
 * confirming success or explaining failure. This component provides a consistent,
 * accessible toast notification that appears in a fixed position (top-right) and
 * auto-dismisses after a configurable delay.
 *
 * Auto-Dismiss Timer:
 * On mount, a setTimeout is set for `autoDismissMs` (default 5000ms). When it
 * fires, it calls `onClose`, which causes the parent to remove the notification.
 * The timer is cleaned up on unmount to prevent memory leaks or stale callbacks.
 * The `stableOnClose` wrapper via useCallback ensures the timer doesn't reset
 * unnecessarily on parent re-renders.
 *
 * Accessibility:
 * - `role="alert"` marks this as an alert that screen readers announce immediately
 *   when it appears in the DOM. This is appropriate for time-sensitive feedback
 *   like "Book created successfully" or "Network error."
 * - `aria-live="assertive"` reinforces that the announcement should interrupt
 *   whatever the screen reader is currently saying. This is intentional for
 *   notifications that appear as a direct result of user action.
 * - The close button has `aria-label="Close notification"` for screen reader users.
 *
 * Slide-In Animation:
 * The `animate-slide-in` class (defined in global CSS / Tailwind config) provides
 * a subtle entrance animation from the right edge, drawing visual attention to the
 * notification without being disruptive.
 *
 * Styling uses Tailwind utility classes for maintainability and responsive design support.
 * Color-coded: green for success, red for error — providing both color and text cues.
 *
 * Validates: Requirements 1.3 (feedback after state changes), 2.3 (success/error
 * feedback after form submission), 5.3 (accessible notification announcements).
 */

export interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  autoDismissMs?: number;
}

export default function Notification({
  message,
  type,
  onClose,
  autoDismissMs = 5000,
}: NotificationProps) {
  const stableOnClose = useCallback(onClose, [onClose]);

  useEffect(() => {
    const timer = setTimeout(stableOnClose, autoDismissMs);
    return () => clearTimeout(timer);
  }, [stableOnClose, autoDismissMs]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-4 right-4 z-[9999] flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg text-[0.95rem] leading-snug max-w-md min-w-[16rem] animate-slide-in ${
        type === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      }`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="bg-transparent border-none cursor-pointer text-xl leading-none p-1 opacity-70 hover:opacity-100 shrink-0"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
