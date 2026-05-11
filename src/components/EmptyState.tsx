import Link from 'next/link';

/**
 * EmptyState Component — Shown when the book list has zero results.
 *
 * Pattern: Server Component (Presentational)
 * This file has no 'use client' directive, which means it renders entirely on the
 * server as a React Server Component. It ships zero client-side JavaScript — the
 * browser receives only the final HTML. This is ideal for static, non-interactive
 * UI like an empty-state message.
 *
 * Why it exists:
 * When the book inventory is empty, users need clear guidance on what to do next.
 * This component provides a friendly message, a visual cue (📚 emoji), and a
 * prominent call-to-action link to create their first book. Without it, users
 * would see a blank page with no affordance for the next step.
 *
 * Semantic HTML:
 * - Uses a <section> element to group the empty-state content semantically.
 * - The emoji is wrapped in a div with `aria-hidden="true"` so screen readers
 *   skip the decorative icon and focus on the meaningful text.
 * - The heading (<h2>) provides document outline structure.
 *
 * Accessibility:
 * - `role="status"` on the container tells assistive technology that this is a
 *   status message (live region with implicit aria-live="polite"). When the empty
 *   state appears (e.g., after deleting the last book), screen readers will
 *   announce the content without interrupting the user.
 * - The "Create a Book" link is clearly labeled and visually prominent.
 *
 * Styling uses Tailwind utility classes for maintainability and responsive design support.
 *
 * Validates: Requirement 1.3 (display empty state when no books exist).
 */

export interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({
  message = 'No books found',
}: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center justify-center py-12 px-6 text-center" role="status">
      <div className="text-5xl mb-4" aria-hidden="true">
        📚
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">{message}</h2>
      <p className="text-[0.95rem] text-gray-500 leading-relaxed mb-6">
        Get started by adding your first book to the inventory.
      </p>
      <Link
        href="/books/new"
        className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Create a Book
      </Link>
    </section>
  );
}
