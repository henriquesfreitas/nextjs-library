'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { BookViewModel } from '@/types/book';
import ConfirmDialog from '@/components/ConfirmDialog';
import Notification from '@/components/Notification';

/**
 * BookList Component — Renders a table of books with inline Buy actions.
 *
 * Pattern: Presentational + Local State
 * This component is primarily presentational — it receives a pre-formatted array of
 * BookViewModels from its parent Server Component and renders them in a table. The
 * local state it manages is limited to the Buy flow (confirmation dialog visibility,
 * loading state, and notification feedback). It does not own or fetch data itself.
 *
 * Buy Flow:
 * 1. User clicks "Buy" button on an AVAILABLE book row.
 * 2. A ConfirmDialog opens asking for confirmation (prevents accidental purchases).
 * 3. On confirm, a PATCH request is sent to `/api/books/:id/buy` with the book's
 *    current `version` for optimistic locking.
 * 4. On success, a success Notification is shown and `router.refresh()` triggers
 *    a Server Component re-render to reflect the updated status.
 * 5. On failure (conflict, network error), an error Notification is displayed.
 *
 * Why 'use client':
 * The Buy flow requires event handlers (onClick), local state (useState), and
 * imperative navigation (useRouter). These are client-only capabilities in the
 * Next.js App Router model, so this component must be a Client Component.
 *
 * Accessibility:
 * - Uses a semantic <table> with <thead>/<tbody> and `scope="col"` on headers,
 *   enabling screen readers to associate data cells with their column headers.
 * - Each "Buy" button has an `aria-label` that includes the book title, so screen
 *   reader users know which book the action applies to (e.g., "Buy 'Clean Code'").
 * - The title column links use `aria-label` with the book title for context.
 * - Status badges use `aria-label` to announce the status in lowercase prose.
 * - ConfirmDialog and Notification handle their own accessibility concerns.
 *
 * Data Flow:
 * Server Component (page.tsx) → bookService.getAllBooks() → presenter →
 * BookViewModel[] → this component renders the table and handles Buy interactions.
 *
 * Styling uses Tailwind utility classes for maintainability and responsive design support.
 *
 * Validates: Requirements 1.1 (display book list), 1.2 (show all fields in table),
 * 6.1 (Buy button for available books), 6.2 (confirmation before purchase),
 * 6.5 (optimistic locking via version), 6.6 (success/error feedback).
 */

export interface BookListProps {
  books: BookViewModel[];
}

export default function BookList({ books }: BookListProps) {
  const router = useRouter();
  const [buyTarget, setBuyTarget] = useState<BookViewModel | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleBuyClick = useCallback(
    (e: React.MouseEvent, book: BookViewModel) => {
      e.preventDefault();
      e.stopPropagation();
      setBuyTarget(book);
    },
    []
  );

  const handleBuyConfirm = useCallback(async () => {
    if (!buyTarget) return;
    setIsBuying(true);

    try {
      const response = await fetch(`/api/books/${buyTarget.id}/buy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: buyTarget.version }),
      });

      if (response.ok) {
        setNotification({
          message: `"${buyTarget.title}" has been marked as sold.`,
          type: 'success',
        });
        router.refresh();
      } else {
        const errorBody = await response.json();
        setNotification({
          message: errorBody.message || 'Failed to complete the purchase. Please try again.',
          type: 'error',
        });
      }
    } catch {
      setNotification({
        message: 'Network error. Please check your connection and try again.',
        type: 'error',
      });
    } finally {
      setIsBuying(false);
      setBuyTarget(null);
    }
  }, [buyTarget, router]);

  const handleBuyCancel = useCallback(() => {
    setBuyTarget(null);
  }, []);

  return (
    <div className="w-full overflow-x-auto">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <ConfirmDialog
        isOpen={buyTarget !== null}
        title="Confirm Purchase"
        message={
          buyTarget
            ? `Are you sure you want to mark "${buyTarget.title}" as sold? This action cannot be undone.`
            : ''
        }
        confirmLabel="Buy"
        cancelLabel="Cancel"
        onConfirm={handleBuyConfirm}
        onCancel={handleBuyCancel}
      />

      <table className="w-full border-collapse text-sm leading-relaxed">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200 whitespace-nowrap" scope="col">Title</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200 whitespace-nowrap" scope="col">Author</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200 whitespace-nowrap" scope="col">ISBN</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200 whitespace-nowrap" scope="col">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200 whitespace-nowrap" scope="col">Price</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200 whitespace-nowrap" scope="col">Created</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200 whitespace-nowrap" scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr key={book.id}>
              <td className="px-4 py-3 text-gray-900 border-b border-gray-100 align-middle">
                <Link
                  href={`/books/${book.id}`}
                  className="text-blue-600 font-medium hover:underline"
                  aria-label={`View details for "${book.title}"`}
                >
                  {book.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-900 border-b border-gray-100 align-middle">{book.author}</td>
              <td className="px-4 py-3 text-gray-900 border-b border-gray-100 align-middle">{book.isbn || '—'}</td>
              <td className="px-4 py-3 border-b border-gray-100 align-middle">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                    book.status === 'AVAILABLE'
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                  aria-label={`Status: ${book.status.toLowerCase()}`}
                >
                  {book.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-900 border-b border-gray-100 align-middle">{book.price}</td>
              <td className="px-4 py-3 text-gray-900 border-b border-gray-100 align-middle">{book.createdAt}</td>
              <td className="px-4 py-3 border-b border-gray-100 align-middle">
                {book.canBuy && (
                  <button
                    type="button"
                    className="px-3.5 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium whitespace-nowrap hover:bg-green-700 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
                    disabled={isBuying && buyTarget?.id === book.id}
                    onClick={(e) => handleBuyClick(e, book)}
                    aria-label={`Buy "${book.title}"`}
                  >
                    Buy
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
