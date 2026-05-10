/**
 * Book Detail Page — Server Component
 *
 * Displays the full details of a single book. As a Server Component, it
 * fetches data directly from the service layer on the server — no HTTP
 * round-trip to the API routes is needed.
 *
 * Data flow:
 *   bookService.getBookById(id)  →  Book
 *   toBookViewModel()            →  BookViewModel
 *   <BookDetailClient book={…} />  →  interactive detail view
 *
 * The page handles three states:
 *   1. **Book found**    — renders the BookDetailClient with all fields
 *   2. **Not found**     — renders a "Book not found" message with a back link
 *   3. **Fetch error**   — renders the ErrorMessage component
 *
 * Why Server + Client split?
 * ──────────────────────────
 * The page needs both server-side data fetching (fast, no client JS) and
 * client-side interactivity (delete/buy confirmation dialogs, notifications).
 * The Server Component fetches and transforms the data, then passes the
 * view model to the BookDetailClient (Client Component) for rendering.
 *
 * In Next.js 15 App Router, dynamic route params are accessed as a Promise:
 *   params: Promise<{ id: string }>
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.5
 */

import Link from 'next/link';
import { bookService } from '@/services/bookService';
import { toBookViewModel } from '@/presenters/bookPresenter';
import { NotFoundError } from '@/errors';
import BookDetailClient from '@/components/BookDetailClient';
import ErrorMessage from '@/components/ErrorMessage';

/* ------------------------------------------------------------------ */
/*  Inline styles                                                      */
/* ------------------------------------------------------------------ */

const pageContainerStyles: React.CSSProperties = {
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

const notFoundContainerStyles: React.CSSProperties = {
  textAlign: 'center',
  padding: '3rem 1.5rem',
};

const notFoundHeadingStyles: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '1rem',
};

const notFoundTextStyles: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#6b7280',
  marginBottom: '1.5rem',
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const book = await bookService.getBookById(id);
    const viewModel = toBookViewModel(book);

    return <BookDetailClient book={viewModel} />;
  } catch (error) {
    // NotFoundError → show "Book not found" with a back link (Requirement 3.2)
    if (error instanceof NotFoundError) {
      return (
        <div style={pageContainerStyles}>
          <Link href="/books" style={backLinkStyles}>
            ← Back to Books
          </Link>
          <div style={notFoundContainerStyles}>
            <h1 style={notFoundHeadingStyles}>Book not found</h1>
            <p style={notFoundTextStyles}>
              The book you are looking for does not exist or has been removed.
            </p>
            <Link href="/books" style={backLinkStyles}>
              Return to Book List
            </Link>
          </div>
        </div>
      );
    }

    // Any other error → show generic error message (Requirement 3.3)
    return (
      <div style={pageContainerStyles}>
        <Link href="/books" style={backLinkStyles}>
          ← Back to Books
        </Link>
        <ErrorMessage message="Failed to load book details. Please try again later." />
      </div>
    );
  }
}
