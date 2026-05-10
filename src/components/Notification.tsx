'use client';

import { useEffect, useCallback } from 'react';

/**
 * Notification Component — Toast-style feedback for user actions.
 *
 * This is a Client Component because it relies on browser-side behavior:
 * timers (auto-dismiss), event handlers (close button), and dynamic rendering.
 *
 * Pattern: "Controlled Component" — the parent owns the visibility state and
 * passes an `onClose` callback. This keeps the Notification stateless and
 * reusable across different pages (create, edit, delete, buy flows).
 *
 * Accessibility:
 * - role="alert" announces the message to screen readers immediately
 * - aria-live="assertive" ensures the notification is read even if the user
 *   is focused elsewhere
 * - The close button has an accessible label
 *
 * Validates: Requirements 1.3, 2.3, 5.3
 */

/** Props for the Notification component */
export interface NotificationProps {
  /** The message to display in the notification */
  message: string;
  /** Visual style: 'success' for green, 'error' for red */
  type: 'success' | 'error';
  /** Callback fired when the notification should be dismissed */
  onClose: () => void;
  /** Auto-dismiss delay in milliseconds. Defaults to 5000 (5 seconds). */
  autoDismissMs?: number;
}

/**
 * Base styles shared by both success and error notifications.
 * Uses inline styles to avoid external CSS framework dependencies.
 */
const baseStyles: React.CSSProperties = {
  position: 'fixed',
  top: '1rem',
  right: '1rem',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  borderRadius: '0.5rem',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  fontSize: '0.95rem',
  lineHeight: 1.4,
  maxWidth: '28rem',
  minWidth: '16rem',
  animation: 'slideIn 0.25s ease-out',
};

/** Color variants keyed by notification type */
const typeStyles: Record<NotificationProps['type'], React.CSSProperties> = {
  success: {
    backgroundColor: '#f0fdf4',
    color: '#166534',
    border: '1px solid #bbf7d0',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  },
};

/** Styles for the close button */
const closeButtonStyles: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1.25rem',
  lineHeight: 1,
  padding: '0.25rem',
  color: 'inherit',
  opacity: 0.7,
  flexShrink: 0,
};

export default function Notification({
  message,
  type,
  onClose,
  autoDismissMs = 5000,
}: NotificationProps) {
  /**
   * Auto-dismiss: schedule a timer that calls onClose after the timeout.
   * useCallback stabilizes the reference so the effect doesn't re-run
   * unnecessarily if the parent re-renders.
   */
  const stableOnClose = useCallback(onClose, [onClose]);

  useEffect(() => {
    const timer = setTimeout(stableOnClose, autoDismissMs);
    return () => clearTimeout(timer);
  }, [stableOnClose, autoDismissMs]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{ ...baseStyles, ...typeStyles[type] }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        style={closeButtonStyles}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
