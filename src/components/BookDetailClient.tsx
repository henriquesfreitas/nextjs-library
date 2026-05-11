'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { BookViewModel } from '@/types/book';
import ConfirmDialog from '@/components/ConfirmDialog';
import Notification from '@/components/Notification';

/**
 * BookDetailClient Component — Interactive wrapper for the Book Detail page.
 *
 * Pattern: Client Component in a Server/Client Split
 * The Book Detail page is split into two parts:
 * - Server Component (`src/app/books/[id]/page.tsx`): Fetches the book from the
 *   database via the service layer, transforms it through the presenter, and handles
 *   not-found / error states. This runs on the server with zero client JS.
 * - This Client Component: Receives the pre-fetched BookViewModel as a prop and
 *   handles all interactive behaviors (Delete, Buy, navigation).
 *
 * Why this split exists:
 * Data fetching benefits from server execution (direct DB access, no waterfall,
 * no exposed API keys). But Delete and Buy flows require event handlers, local
 * state, and imperative router calls — all client-only capabilities. The split
 * keeps the data-fetching path lean while enabling rich interactivity.
 *
 * Delete Flow:
 * 1. User clicks "Delete" → ConfirmDialog opens with a warning.
 * 2. On confirm, a DELETE request is sent to `/api/books/:id`.
 * 3. On success, a success Notification appears and the user is redirected to
 *    `/books` after a 1-second delay (giving time to read the notification).
 * 4. On failure, an error Notification is shown; the user stays on the page.
 *
 * Buy Flow:
 * 1. "Buy" button is only rendered when `book.canBuy` is true (AVAILABLE status).
 * 2. User clicks "Buy" → ConfirmDialog opens.
 * 3. On confirm, a PATCH request to `/api/books/:id/buy` with the book's `version`
 *    for optimistic locking.
 * 4. On success, a Notification appears and `router.refresh()` re-fetches the
 *    Server Component data to reflect the new SOLD status.
 * 5. On failure (409 conflict, network error), an error Notification is shown.
 *
 * Accessibility:
 * - Action buttons (Edit, Delete, Buy) each have `aria-label` attributes that
 *   include the book title, providing context for screen reader users.
 * - The status badge uses `aria-label` to announce status in readable prose.
 * - ConfirmDialog provides focus trap, Escape key handling, and ARIA roles.
 * - Notification uses `role="alert"` and `aria-live="assertive"` for immediate
 *   announcement of success/error feedback.
 * - The "Back to Books" link provides clear navigation context.
 * - Book details use a <dl> (description list) for semantic key-value display.
 *
 * Data Flow:
 * Server fetches Book → presenter formats to BookViewModel → passed as prop →
 * this component renders details and handles mutations via fetch to API routes.
 *
 * Styling uses Tailwind utility classes for maintainability and responsive design support.
 *
 * Validates: Requirements 3.1 (display book details), 3.2 (show all fields),
 * 3.3 (back navigation), 5.1 (delete button), 5.2 (delete confirmation dialog),
 * 5.3 (delete success/error feedback), 5.4 (redirect after delete),
 * 5.5 (handle delete errors gracefully), 6.1 (Buy button for available books),
 * 6.5 (optimistic locking via version).
 */

export interface BookDetailClientProps {
  book: BookViewModel;
}

export default function BookDetailClient({ book }: BookDetailClientProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/books/${book.id}`, { method: 'DELETE' });
      if (response.ok || response.status === 204) {
        setNotification({ message: `"${book.title}" has been deleted.`, type: 'success' });
        setTimeout(() => router.push('/books'), 1000);
      } else {
        const errorBody = await response.json();
        setNotification({
          message: errorBody.message || 'Failed to delete the book. Please try again.',
          type: 'error',
        });
      }
    } catch {
      setNotification({ message: 'Network error. Please check your connection and try again.', type: 'error' });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [book.id, book.title, router]);

  const handleBuyConfirm = useCallback(async () => {
    setIsBuying(true);
    try {
      const response = await fetch(`/api/books/${book.id}/buy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: book.version }),
      });
      if (response.ok) {
        setNotification({ message: `"${book.title}" has been marked as sold.`, type: 'success' });
        router.refresh();
      } else {
        const errorBody = await response.json();
        setNotification({
          message: errorBody.message || 'Failed to complete the purchase. Please try again.',
          type: 'error',
        });
      }
    } catch {
      setNotification({ message: 'Network error. Please check your connection and try again.', type: 'error' });
    } finally {
      setIsBuying(false);
      setShowBuyDialog(false);
    }
  }, [book.id, book.title, book.version, router]);

  return (
    <div className="max-w-[640px] mx-auto px-6 py-8">
      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Confirm Deletion"
        message={`Are you sure you want to delete "${book.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <ConfirmDialog
        isOpen={showBuyDialog}
        title="Confirm Purchase"
        message={`Are you sure you want to mark "${book.title}" as sold? This action cannot be undone.`}
        confirmLabel="Buy"
        cancelLabel="Cancel"
        onConfirm={handleBuyConfirm}
        onCancel={() => setShowBuyDialog(false)}
      />

      <Link href="/books" className="inline-block mb-6 text-blue-600 text-sm font-medium hover:underline">
        ← Back to Books
      </Link>

      <header className="flex justify-between items-start mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">
          {book.title}
          <span
            className={`inline-block ml-3 px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide align-middle ${
              book.status === 'AVAILABLE' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
            aria-label={`Status: ${book.status.toLowerCase()}`}
          >
            {book.status}
          </span>
        </h1>
      </header>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-[0.95rem] leading-relaxed">
          <dt className="font-semibold text-gray-700">ID</dt>
          <dd className="text-gray-900">{book.id}</dd>

          <dt className="font-semibold text-gray-700">Title</dt>
          <dd className="text-gray-900">{book.title}</dd>

          <dt className="font-semibold text-gray-700">Author</dt>
          <dd className="text-gray-900">{book.author}</dd>

          <dt className="font-semibold text-gray-700">ISBN</dt>
          <dd className="text-gray-900">{book.isbn || '—'}</dd>

          <dt className="font-semibold text-gray-700">Status</dt>
          <dd className="text-gray-900">{book.status}</dd>

          <dt className="font-semibold text-gray-700">Price</dt>
          <dd className="text-gray-900">{book.price}</dd>

          <dt className="font-semibold text-gray-700">Created</dt>
          <dd className="text-gray-900">{book.createdAt}</dd>

          <dt className="font-semibold text-gray-700">Updated</dt>
          <dd className="text-gray-900">{book.updatedAt || '—'}</dd>

          <dt className="font-semibold text-gray-700">Version</dt>
          <dd className="text-gray-900">{book.version}</dd>
        </dl>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link
          href={`/books/${book.id}/edit`}
          className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          aria-label={`Edit "${book.title}"`}
        >
          Edit
        </Link>

        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeleting}
          className="px-5 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
          aria-label={`Delete "${book.title}"`}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>

        {book.canBuy && (
          <button
            type="button"
            onClick={() => setShowBuyDialog(true)}
            disabled={isBuying}
            className="px-5 py-2.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
            aria-label={`Buy "${book.title}"`}
          >
            {isBuying ? 'Buying...' : 'Buy'}
          </button>
        )}
      </div>
    </div>
  );
}
