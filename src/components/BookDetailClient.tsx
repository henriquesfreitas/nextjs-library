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
 * This is a Client Component because it manages interactive state:
 * confirmation dialogs for delete and buy actions, notification toasts,
 * and fetch calls to the API endpoints. The parent Server Component
 * (BookDetailPage) fetches the data and passes it down as a pre-transformed
 * `BookViewModel`.
 *
 * Why split Server/Client?
 * ────────────────────────
 * Next.js App Router Server Components cannot use hooks, event handlers,
 * or browser APIs. The detail page needs both:
 *   - Server-side data fetching (fast, no client JS bundle)
 *   - Client-side interactivity (dialogs, notifications, API calls)
 *
 * So the page.tsx (Server Component) fetches the book and renders this
 * Client Component with the pre-transformed view model.
 *
 * Interaction flows:
 *   Delete: Click "Delete" → ConfirmDialog → DELETE /api/books/[id] → redirect to /books
 *   Buy:    Click "Buy"    → ConfirmDialog → PATCH /api/books/[id]/buy → refresh page
 *
 * Accessibility:
 * - Action buttons have descriptive aria-labels
 * - Confirmation dialogs are fully accessible (focus trap, Escape key)
 * - Notifications use role="alert" for screen reader announcements
 * - Semantic HTML structure with definition list for book fields
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.5
 */

export interface BookDetailClientProps {
  /** Pre-transformed book data from the presenter layer */
  book: BookViewModel;
}

/* ------------------------------------------------------------------ */
/*  Inline styles — consistent with other components in the project    */
/* ------------------------------------------------------------------ */

const containerStyles: React.CSSProperties = {
  maxWidth: '640px',
  margin: '0 auto',
  padding: '2rem 1.5rem',
};

const backLinkStyles: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '1.5rem',
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '1.5rem',
  gap: '1rem',
  flexWrap: 'wrap',
};

const titleStyles: React.CSSProperties = {
  margin: 0,
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#111827',
};

const statusBadgeBase: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.8rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.025em',
  marginLeft: '0.75rem',
  verticalAlign: 'middle',
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

const detailCardStyles: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '0.75rem',
  padding: '1.5rem',
  marginBottom: '1.5rem',
};

const dlStyles: React.CSSProperties = {
  margin: 0,
  display: 'grid',
  gridTemplateColumns: '140px 1fr',
  gap: '0.75rem 1rem',
  fontSize: '0.95rem',
  lineHeight: 1.6,
};

const dtStyles: React.CSSProperties = {
  fontWeight: 600,
  color: '#374151',
};

const ddStyles: React.CSSProperties = {
  margin: 0,
  color: '#111827',
};

const actionsContainerStyles: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  flexWrap: 'wrap',
};

const editButtonStyles: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.6rem 1.25rem',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  textDecoration: 'none',
  cursor: 'pointer',
};

const deleteButtonStyles: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  backgroundColor: '#dc2626',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const deleteButtonDisabledStyles: React.CSSProperties = {
  ...deleteButtonStyles,
  backgroundColor: '#fca5a5',
  cursor: 'not-allowed',
};

const buyButtonStyles: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const buyButtonDisabledStyles: React.CSSProperties = {
  ...buyButtonStyles,
  backgroundColor: '#86efac',
  cursor: 'not-allowed',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BookDetailClient({ book }: BookDetailClientProps) {
  const router = useRouter();

  /** Tracks whether the delete confirmation dialog is open */
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  /** True while the delete API call is in flight */
  const [isDeleting, setIsDeleting] = useState(false);

  /** Tracks whether the buy confirmation dialog is open */
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  /** True while the buy API call is in flight */
  const [isBuying, setIsBuying] = useState(false);

  /** Toast notification state for success/error feedback */
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  /* ---------------------------------------------------------------- */
  /*  Delete handlers                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * Executes the delete action after the user confirms.
   *
   * Sends DELETE /api/books/[id]. On success, shows a success notification
   * and redirects to the Book List page. On failure, shows an error
   * notification with the server's error message.
   */
  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        // Redirect to book list with a brief delay so the user sees feedback
        setNotification({
          message: `"${book.title}" has been deleted.`,
          type: 'success',
        });
        setTimeout(() => {
          router.push('/books');
        }, 1000);
      } else {
        const errorBody = await response.json();
        setNotification({
          message:
            errorBody.message ||
            'Failed to delete the book. Please try again.',
          type: 'error',
        });
      }
    } catch {
      setNotification({
        message: 'Network error. Please check your connection and try again.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [book.id, book.title, router]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Buy handlers                                                     */
  /* ---------------------------------------------------------------- */

  /**
   * Executes the buy action after the user confirms.
   *
   * Sends PATCH /api/books/[id]/buy with the book's current version
   * for optimistic locking. On success, shows a notification and
   * refreshes the page so the Server Component re-fetches fresh data.
   */
  const handleBuyConfirm = useCallback(async () => {
    setIsBuying(true);

    try {
      const response = await fetch(`/api/books/${book.id}/buy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: book.version }),
      });

      if (response.ok) {
        setNotification({
          message: `"${book.title}" has been marked as sold.`,
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
      setShowBuyDialog(false);
    }
  }, [book.id, book.title, book.version, router]);

  const handleBuyCancel = useCallback(() => {
    setShowBuyDialog(false);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div style={containerStyles}>
      {/* Toast notification for action feedback */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Confirm Deletion"
        message={`Are you sure you want to delete "${book.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Buy confirmation dialog */}
      <ConfirmDialog
        isOpen={showBuyDialog}
        title="Confirm Purchase"
        message={`Are you sure you want to mark "${book.title}" as sold? This action cannot be undone.`}
        confirmLabel="Buy"
        cancelLabel="Cancel"
        onConfirm={handleBuyConfirm}
        onCancel={handleBuyCancel}
      />

      {/* Back navigation */}
      <Link href="/books" style={backLinkStyles}>
        ← Back to Books
      </Link>

      {/* Page header with title and status badge */}
      <header style={headerStyles}>
        <h1 style={titleStyles}>
          {book.title}
          <span
            style={statusStyles[book.status]}
            aria-label={`Status: ${book.status.toLowerCase()}`}
          >
            {book.status}
          </span>
        </h1>
      </header>

      {/* Book details card — uses a definition list for semantic structure */}
      <div style={detailCardStyles}>
        <dl style={dlStyles}>
          <dt style={dtStyles}>ID</dt>
          <dd style={ddStyles}>{book.id}</dd>

          <dt style={dtStyles}>Title</dt>
          <dd style={ddStyles}>{book.title}</dd>

          <dt style={dtStyles}>Author</dt>
          <dd style={ddStyles}>{book.author}</dd>

          <dt style={dtStyles}>ISBN</dt>
          <dd style={ddStyles}>{book.isbn || '—'}</dd>

          <dt style={dtStyles}>Status</dt>
          <dd style={ddStyles}>{book.status}</dd>

          <dt style={dtStyles}>Price</dt>
          <dd style={ddStyles}>{book.price}</dd>

          <dt style={dtStyles}>Created</dt>
          <dd style={ddStyles}>{book.createdAt}</dd>

          <dt style={dtStyles}>Updated</dt>
          <dd style={ddStyles}>{book.updatedAt || '—'}</dd>

          <dt style={dtStyles}>Version</dt>
          <dd style={ddStyles}>{book.version}</dd>
        </dl>
      </div>

      {/* Action buttons */}
      <div style={actionsContainerStyles}>
        {/* Edit button — links to the edit page */}
        <Link
          href={`/books/${book.id}/edit`}
          style={editButtonStyles}
          aria-label={`Edit "${book.title}"`}
        >
          Edit
        </Link>

        {/* Delete button — opens confirmation dialog */}
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeleting}
          style={isDeleting ? deleteButtonDisabledStyles : deleteButtonStyles}
          aria-label={`Delete "${book.title}"`}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>

        {/* Buy button — only shown for AVAILABLE books (Requirement 6.1) */}
        {book.canBuy && (
          <button
            type="button"
            onClick={() => setShowBuyDialog(true)}
            disabled={isBuying}
            style={isBuying ? buyButtonDisabledStyles : buyButtonStyles}
            aria-label={`Buy "${book.title}"`}
          >
            {isBuying ? 'Buying...' : 'Buy'}
          </button>
        )}
      </div>
    </div>
  );
}
