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
 * This is a Client Component because it manages interactive state:
 * the confirmation dialog for buying, notification toasts, and fetch calls
 * to the buy API endpoint. The parent (BooksPage, a Server Component)
 * fetches the data and passes it down as pre-transformed `BookViewModel[]`.
 *
 * Pattern: "Presentational + Local State" — the component receives
 * display-ready data from the presenter layer (formatted prices, dates,
 * derived `canBuy` flags) and only manages UI interaction state locally.
 * This keeps the component focused on rendering and user actions.
 *
 * Buy flow:
 * 1. User clicks "Buy" → ConfirmDialog opens
 * 2. User confirms → PATCH /api/books/[id]/buy with { version }
 * 3. On success → Notification shown, router.refresh() reloads server data
 * 4. On failure → Error notification shown (409 conflict, 404, etc.)
 *
 * Accessibility:
 * - Semantic <table> with <thead>/<tbody> for screen reader navigation
 * - Each row links to the detail page via Next.js <Link>
 * - Buy buttons have descriptive aria-labels including the book title
 * - Status badges use aria-label for screen reader clarity
 *
 * Validates: Requirements 1.1, 1.2, 6.1, 6.2, 6.5, 6.6
 */

export interface BookListProps {
  /** Pre-transformed book data from the presenter layer */
  books: BookViewModel[];
}

/* ------------------------------------------------------------------ */
/*  Inline styles                                                      */
/* ------------------------------------------------------------------ */

const containerStyles: React.CSSProperties = {
  width: '100%',
  overflowX: 'auto',
};

const tableStyles: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.9rem',
  lineHeight: 1.5,
};

const thStyles: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  borderBottom: '2px solid #e5e7eb',
  whiteSpace: 'nowrap',
};

const tdStyles: React.CSSProperties = {
  padding: '0.75rem 1rem',
  color: '#111827',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
};

const rowLinkStyles: React.CSSProperties = {
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 500,
};

const statusBadgeBase: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.2rem 0.6rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
};

const statusStyles: Record<BookViewModel['status'], React.CSSProperties> = {
  AVAILABLE: {
    ...statusBadgeBase,
    backgroundColor: '#f0fdf4',
    color: '#166534',
  },
  SOLD: {
    ...statusBadgeBase,
    backgroundColor: '#fef2f2',
    color: '#991b1b',
  },
};

const buyButtonStyles: React.CSSProperties = {
  padding: '0.35rem 0.85rem',
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.8rem',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const buyButtonDisabledStyles: React.CSSProperties = {
  ...buyButtonStyles,
  backgroundColor: '#86efac',
  cursor: 'not-allowed',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BookList({ books }: BookListProps) {
  const router = useRouter();

  /**
   * Tracks which book the user wants to buy. When non-null, the
   * ConfirmDialog is shown. Storing the full view model gives us
   * access to the title (for the dialog message) and version
   * (for the optimistic locking request).
   */
  const [buyTarget, setBuyTarget] = useState<BookViewModel | null>(null);

  /** True while the buy API call is in flight — disables the confirm button */
  const [isBuying, setIsBuying] = useState(false);

  /** Toast notification state for success/error feedback */
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  /**
   * Opens the confirmation dialog for a specific book.
   * Stops event propagation so the row's link doesn't navigate away.
   */
  const handleBuyClick = useCallback(
    (e: React.MouseEvent, book: BookViewModel) => {
      e.preventDefault();
      e.stopPropagation();
      setBuyTarget(book);
    },
    []
  );

  /**
   * Executes the buy action after the user confirms.
   *
   * Sends PATCH /api/books/[id]/buy with the book's current version
   * for optimistic locking. On success, shows a notification and
   * refreshes the page so the Server Component re-fetches fresh data.
   */
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
        // Refresh the page so the Server Component re-fetches updated data
        router.refresh();
      } else {
        const errorBody = await response.json();
        setNotification({
          message:
            errorBody.message ||
            'Failed to complete the purchase. Please try again.',
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

  /**
   * Closes the confirmation dialog without taking action.
   */
  const handleBuyCancel = useCallback(() => {
    setBuyTarget(null);
  }, []);

  return (
    <div style={containerStyles}>
      {/* Toast notification for buy success/error feedback */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Confirmation dialog for the buy action */}
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

      {/* Book table — semantic HTML for accessibility */}
      <table style={tableStyles}>
        <thead>
          <tr>
            <th style={thStyles} scope="col">Title</th>
            <th style={thStyles} scope="col">Author</th>
            <th style={thStyles} scope="col">ISBN</th>
            <th style={thStyles} scope="col">Status</th>
            <th style={thStyles} scope="col">Price</th>
            <th style={thStyles} scope="col">Created</th>
            <th style={thStyles} scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr key={book.id}>
              {/* Title links to the book detail page */}
              <td style={tdStyles}>
                <Link
                  href={`/books/${book.id}`}
                  style={rowLinkStyles}
                  aria-label={`View details for "${book.title}"`}
                >
                  {book.title}
                </Link>
              </td>
              <td style={tdStyles}>{book.author}</td>
              <td style={tdStyles}>{book.isbn || '—'}</td>
              <td style={tdStyles}>
                <span
                  style={statusStyles[book.status]}
                  aria-label={`Status: ${book.status.toLowerCase()}`}
                >
                  {book.status}
                </span>
              </td>
              <td style={tdStyles}>{book.price}</td>
              <td style={tdStyles}>{book.createdAt}</td>
              <td style={tdStyles}>
                {book.canBuy && (
                  <button
                    type="button"
                    style={isBuying && buyTarget?.id === book.id
                      ? buyButtonDisabledStyles
                      : buyButtonStyles}
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
