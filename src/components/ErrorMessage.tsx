/**
 * ErrorMessage Component — Displays an error with an optional retry action.
 *
 * Pattern: Server Component by default (Presentational)
 * This file has no 'use client' directive. It can render as a Server Component
 * (zero client JS) when used without the `onRetry` callback, or it can be
 * imported into a Client Component that passes an interactive retry handler.
 * In either case, the component itself is purely presentational — it receives
 * a message string and optionally a retry callback, and renders them.
 *
 * Why it exists:
 * Provides a consistent, accessible error display across the application.
 * Rather than each page implementing its own error UI, this component
 * standardizes the visual treatment (red background, warning icon, message,
 * optional retry button) and accessibility semantics.
 *
 * Accessibility:
 * - `role="alert"` marks the container as an alert landmark. Screen readers
 *   will immediately announce the content when it appears in the DOM, without
 *   requiring the user to navigate to it. This is critical for error messages
 *   that appear after an async operation fails.
 * - `aria-live="polite"` provides a fallback live-region behavior for assistive
 *   tech that handles role="alert" differently. "polite" means the announcement
 *   waits until the user is idle, avoiding interruption of ongoing speech.
 * - The warning emoji uses `aria-hidden="true"` to prevent screen readers from
 *   announcing "warning sign" — the role="alert" already conveys urgency.
 *
 * Styling uses Tailwind utility classes for maintainability and responsive design support.
 *
 * Validates: Requirements 5.2 (error feedback for failed operations),
 * 5.3 (accessible error announcements via ARIA live regions).
 */

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col items-center justify-center p-8 text-center bg-red-50 border border-red-200 rounded-lg"
    >
      <div className="text-3xl mb-3" aria-hidden="true">
        ⚠️
      </div>
      <p className="text-base text-red-800 leading-relaxed mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-5 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
