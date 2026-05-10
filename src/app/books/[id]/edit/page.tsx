/**
 * Edit Book Page — Server Component
 *
 * Fetches an existing book by ID on the server and renders the BookForm
 * component in "edit" mode with the book's current data pre-filled.
 *
 * Data flow:
 *   bookService.getBookById(id)  →  Book
 *   toBookViewModel()            →  BookViewModel
 *   <BookForm mode="edit" book={viewModel} />  →  pre-filled form
 *
 * The page handles three states:
 *   1. **Book found**    — renders BookForm with pre-filled data
 *   2. **Not found**     — renders a "Book not found" message with a back link
 *   3. **Fetch error**   — renders the ErrorMessage component
 *
 * On successful update, the BookForm handles the redirect to the Book Detail
 * page and displays a success notification (Requirement 4.5).
 *
 * In Next.js 15 App Router, dynamic route params are accessed as a Promise:
 *   params: Promise<{ id: string }>
 *
 * Validates: Requirements 4.1, 4.5, 4.6, 4.7
 */

import Link from 'next/link';
import { bookService } from '@/services/bookService';
import { toBookViewModel } from '@/presenters/bookPresenter';
import { NotFoundError } from '@/errors';
import BookForm from '@/components/BookForm';
import ErrorMessage from '@/components/ErrorMessage';

/* ------------------------------------------------------------------ */
/*  Inline styles — consistent with other pages in the project         */
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

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const book = await bookService.getBookById(id);
    const viewModel = toBookViewModel(book);

    return <BookForm mode="edit" book={viewModel} />;
  } catch (error) {
    // NotFoundError → show "Book not found" with a back link (Requirement 4.6)
    if (error instanceof NotFoundError) {
      return (
        <div style={pageContainerStyles}>
          <Link href="/books" style={backLinkStyles}>
            ← Back to Books
          </Link>
          <div style={notFoundContainerStyles}>
            <h1 style={notFoundHeadingStyles}>Book not found</h1>
            <p style={notFoundTextStyles}>
              The book you are trying to edit does not exist or has been removed.
            </p>
            <Link href="/books" style={backLinkStyles}>
              Return to Book List
            </Link>
          </div>
        </div>
      );
    }

    // Any other error → show generic error message
    return (
      <div style={pageContainerStyles}>
        <Link href="/books" style={backLinkStyles}>
          ← Back to Books
        </Link>
        <ErrorMessage message="Failed to load book for editing. Please try again later." />
      </div>
    );
  }
}
