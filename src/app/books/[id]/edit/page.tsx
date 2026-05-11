/**
 * Edit Book Page — Server Component
 *
 * Fetches an existing book and renders the BookForm in "edit" mode, pre-filled
 * with the book's current data.
 *
 * Pattern: Server Component (Data Fetching + Delegation)
 * This page runs on the server to fetch the book, then delegates rendering to
 * the BookForm Client Component. The server handles the data-fetching and error
 * states; the client handles form interactivity.
 *
 * Data Flow:
 * 1. Extracts the book `id` from route params (Next.js 15 async params).
 * 2. Calls `bookService.getBookById(id)` to fetch the current book state.
 * 3. Transforms to BookViewModel via the presenter (for consistent formatting).
 * 4. Passes the view model to BookForm with `mode="edit"`, which pre-fills all
 *    fields and includes the `version` for optimistic locking on submit.
 *
 * Three States:
 * - Found: Renders BookForm in edit mode with pre-filled data. The form handles
 *   validation, submission, and navigation.
 * - Not Found (NotFoundError): Renders a "Book not found" message explaining the
 *   book may have been deleted, with a link back to the list.
 * - Error (unexpected): Renders an ErrorMessage with a generic failure message.
 *
 * Next.js 15 Params:
 * In Next.js 15 App Router, `params` is a Promise that must be awaited. This
 * differs from earlier versions where params was synchronously available.
 *
 * Why Server Component:
 * The edit page needs to pre-fetch the book's current state to populate the form.
 * Doing this on the server avoids a client-side loading state and ensures the form
 * always opens with fresh data (no stale cache). The BookForm itself is a Client
 * Component because it needs controlled inputs and event handlers.
 *
 * Styling uses Tailwind utility classes for maintainability and responsive design support.
 *
 * Validates: Requirements 4.1 (edit page accessible from detail), 4.5 (optimistic
 * locking — version passed to form), 4.6 (handle not-found gracefully),
 * 4.7 (sold-book price restriction enforced in BookForm).
 */

import Link from 'next/link';
import { bookService } from '@/services/bookService';
import { toBookViewModel } from '@/presenters/bookPresenter';
import { NotFoundError } from '@/errors';
import BookForm from '@/components/BookForm';
import ErrorMessage from '@/components/ErrorMessage';

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
    if (error instanceof NotFoundError) {
      return (
        <div className="max-w-[640px] mx-auto px-6 py-8">
          <Link href="/books" className="inline-block mb-6 text-blue-600 text-sm font-medium hover:underline">
            ← Back to Books
          </Link>
          <div className="text-center py-12 px-6">
            <h1 className="text-xl font-semibold text-gray-700 mb-4">Book not found</h1>
            <p className="text-[0.95rem] text-gray-500 mb-6">
              The book you are trying to edit does not exist or has been removed.
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
        <ErrorMessage message="Failed to load book for editing. Please try again later." />
      </div>
    );
  }
}
