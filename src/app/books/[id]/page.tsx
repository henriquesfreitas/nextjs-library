/**
 * Book Detail Page — Server Component
 *
 * Displays full details for a single book and delegates interactive behavior
 * (Delete, Buy) to the BookDetailClient component.
 *
 * Pattern: Server Component with Server/Client Split
 * This page fetches data on the server and renders one of three states. The "happy
 * path" delegates to BookDetailClient (a Client Component) for interactivity. The
 * error paths render entirely on the server with zero client JS.
 *
 * Data Flow:
 * 1. Extracts the book `id` from the route params (Next.js 15 async params).
 * 2. Calls `bookService.getBookById(id)` to fetch from the database.
 * 3. Transforms the domain Book into a BookViewModel via the presenter.
 * 4. Passes the view model to BookDetailClient for interactive rendering.
 *
 * Three States:
 * - Found: Renders BookDetailClient with the full book view model. The client
 *   component handles Delete/Buy flows, navigation, and notifications.
 * - Not Found (NotFoundError): Renders a friendly "Book not found" message with
 *   a link back to the book list. No client JS needed.
 * - Error (unexpected): Renders an ErrorMessage component with a generic failure
 *   message and a back link. Graceful degradation — never shows raw errors.
 *
 * Server/Client Split Rationale:
 * Fetching a single book by ID is a server concern — it benefits from direct DB
 * access, avoids client-side loading spinners, and keeps the API key/connection
 * string off the client. But the detail page has interactive features (Delete
 * confirmation, Buy confirmation, notifications, router navigation) that require
 * client-side state and event handlers. The split keeps the fetch path lean while
 * enabling rich interactivity in the client subtree.
 *
 * Next.js 15 Params:
 * In Next.js 15 App Router, `params` is a Promise that must be awaited. This is
 * a breaking change from earlier versions where params was a plain object.
 *
 * Styling uses Tailwind utility classes for maintainability and responsive design support.
 *
 * Validates: Requirements 3.1 (display book details), 3.2 (show all fields),
 * 3.3 (back navigation link), 5.1 (delete action available), 5.2 (confirmation
 * before delete), 5.3 (success/error feedback), 5.4 (redirect after delete),
 * 5.5 (handle errors gracefully), 6.1 (Buy for available books),
 * 6.5 (optimistic locking via version).
 */

import Link from 'next/link';
import { bookService } from '@/services/bookService';
import { toBookViewModel } from '@/presenters/bookPresenter';
import { NotFoundError } from '@/errors';
import BookDetailClient from '@/components/BookDetailClient';
import ErrorMessage from '@/components/ErrorMessage';

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
    if (error instanceof NotFoundError) {
      return (
        <div className="max-w-[640px] mx-auto px-6 py-8">
          <Link href="/books" className="inline-block mb-6 text-blue-600 text-sm font-medium hover:underline">
            ← Back to Books
          </Link>
          <div className="text-center py-12 px-6">
            <h1 className="text-xl font-semibold text-gray-700 mb-4">Book not found</h1>
            <p className="text-[0.95rem] text-gray-500 mb-6">
              The book you are looking for does not exist or has been removed.
            </p>
            <Link href="/books" className="text-blue-600 text-sm font-medium hover:underline">
              Return to Book List
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-[640px] mx-auto px-6 py-8">
        <Link href="/books" className="inline-block mb-6 text-blue-600 text-sm font-medium hover:underline">
          ← Back to Books
        </Link>
        <ErrorMessage message="Failed to load book details. Please try again later." />
      </div>
    );
  }
}
