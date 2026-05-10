/**
 * ErrorMessage Component — Displays an error with an optional retry action.
 *
 * This is a Server Component by default (no 'use client' directive needed
 * when no `onRetry` is provided). However, when `onRetry` is passed, the
 * parent must be a Client Component since callbacks require client-side JS.
 *
 * We intentionally keep this as a Server Component because:
 * 1. The retry button works via the parent's onClick handler — no local state
 * 2. It renders correctly in both Server and Client Component trees
 * 3. It avoids shipping unnecessary JavaScript to the client
 *
 * Pattern: "Presentational Component" — receives all data and callbacks via
 * props, owns no state, and focuses purely on rendering. This makes it easy
 * to test and reuse across different error scenarios (fetch failures, 404s,
 * API errors, etc.).
 *
 * Accessibility:
 * - role="alert" announces the error to screen readers immediately
 * - aria-live="polite" avoids interrupting the user mid-task
 * - The retry button is a standard <button> with clear labeling
 *
 * Validates: Requirements 5.2, 5.3
 */

export interface ErrorMessageProps {
  /** The error message to display */
  message: string;
  /** Optional callback to retry the failed operation. When provided, a retry button is rendered. */
  onRetry?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Inline styles                                                      */
/* ------------------------------------------------------------------ */

const containerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1.5rem',
  textAlign: 'center',
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '0.5rem',
};

const iconStyles: React.CSSProperties = {
  fontSize: '2rem',
  marginBottom: '0.75rem',
};

const messageTextStyles: React.CSSProperties = {
  margin: '0 0 1rem',
  fontSize: '1rem',
  color: '#991b1b',
  lineHeight: 1.5,
};

const retryButtonStyles: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  backgroundColor: '#dc2626',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  cursor: 'pointer',
};

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div role="alert" aria-live="polite" style={containerStyles}>
      <div style={iconStyles} aria-hidden="true">
        ⚠️
      </div>
      <p style={messageTextStyles}>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} style={retryButtonStyles}>
          Try Again
        </button>
      )}
    </div>
  );
}
