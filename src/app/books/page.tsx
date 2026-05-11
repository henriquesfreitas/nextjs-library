/**
 * Books List Page — Server Component
 *
 * Main entry point for browsing the book inventory.
 *
 * Pattern: Server Component (Data Fetching + Conditional Rendering)
 * This page runs entirely on the server. It fetches all books via the service layer,
 * transforms them through the presenter into view models, and renders the appropriate
 * UI state. No client-side JavaScript is shipped for the page shell itself — only the
 * interactive BookList child component (which is a Client Component) adds JS.
 *
 * Data Flow:
 * 1. `bookService.getAllBooks()` queries the database via the repository layer.
 * 2. `toBookListViewModel()` transforms domain Book objects into BookViewModels
 *    (formatted prices, dates, derived flags like `canBuy`).
 * 3. The view models are passed as props to the BookList component for rendering.
 *
 * Three States:
 * - Books exist: Renders the page header with a "Create Book" link and the BookList
 *   table showing all books with their details and action buttons.
 * - Empty: Renders the page header and the EmptyState component, which guides the
 *   user to create their first book.
 * - Error: If the service throws (DB connection failure, unexpected error), renders
 *   the page header and an ErrorMessage component. The error is caught gracefully
 *   so the page never shows an unhandled exception to the user.
 *
 * Why Server Component:
 * The list page is read-only at the page level — it just displays data. Server
 * Components can directly call the service layer without an API round-trip, reducing
 * latency and eliminating client-side loading states for the initial render.
 *
 * Styling uses Tailwind utility classes for maintainability and responsive design support.
 *
 * Validates: Requirements 1.1 (display list of books), 1.2 (show title, author, ISBN,
 * status, price, created date), 1.3 (empty state when no books), 1.4 (link to create).
 */

import Link from 'next/link';
import { bookService } from '@/services/bookService';
import { toBookListViewModel } from '@/presenters/bookPresenter';
import BookList from '@/components/BookList';
import EmptyState from '@/components/EmptyState';
import ErrorMessage from '@/components/ErrorMessage';

export default async function BooksPage() {
  try {
    const books = await bookService.getAllBooks();
    const viewModels = toBookListViewModel(books);

    return (
      <div className="max-w-[960px] mx-auto px-6 py-8">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Books</h1>
          <Link
            href="/books/new"
            className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
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
      <div className="max-w-[960px] mx-auto px-6 py-8">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Books</h1>
          <Link
            href="/books/new"
            className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Create Book
          </Link>
        </header>

        <ErrorMessage message="Failed to load books. Please try again later." />
      </div>
    );
  }
}
