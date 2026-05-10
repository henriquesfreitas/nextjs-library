/**
 * Books List Page — Server Component
 *
 * This is the main entry point for browsing the book inventory. As a Server
 * Component (no 'use client' directive), it fetches data directly on the server
 * using the service layer — no HTTP round-trip to the API routes is needed.
 *
 * Data flow:
 *   bookService.getAllBooks()  →  Book[]
 *   toBookListViewModel()     →  BookViewModel[]
 *   <BookList books={...} />  →  rendered table
 *
 * The page handles three states:
 *   1. **Books exist** — renders the BookList table
 *   2. **No books**    — renders the EmptyState component with a create link
 *   3. **Fetch error** — renders the ErrorMessage component
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

import Link from 'next/link';
import { bookService } from '@/services/bookService';
import { toBookListViewModel } from '@/presenters/bookPresenter';
import BookList from '@/components/BookList';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';

/* ------------------------------------------------------------------ */
/*  Inline styles — consistent with other components in the project    */
/* ------------------------------------------------------------------ */

const pageContainerStyles: React.CSSProperties = {
  maxWidth: '960px',
  margin: '0 auto',
  padding: '2rem 1.5rem',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.5rem',
};

const headingStyles: React.CSSProperties = {
  margin: 0,
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#111827',
};

const createLinkStyles: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.6rem 1.25rem',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  borderRadius: '0.375rem',
  textDecoration: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default async function BooksPage() {
  try {
    const books = await bookService.getAllBooks();
    const viewModels = toBookListViewModel(books);

    return (
      <div style={pageContainerStyles}>
        <header style={headerStyles}>
          <h1 style={headingStyles}>Books</h1>
          <Link href="/books/new" style={createLinkStyles}>
            Create Book
          </Link>
        </header>

        {viewModels.length === 0 ? (
          <EmptyState />
        ) : (
          <BookList books={viewModels} />
        )}
      </div>
    );
  } catch {
    return (
      <div style={pageContainerStyles}>
        <header style={headerStyles}>
          <h1 style={headingStyles}>Books</h1>
          <Link href="/books/new" style={createLinkStyles}>
            Create Book
          </Link>
        </header>

        <ErrorMessage message="Failed to load books. Please try again later." />
      </div>
    );
  }
}
