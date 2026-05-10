/**
 * Create New Book Page
 *
 * A thin wrapper that renders the BookForm component in "create" mode.
 * No server-side data fetching is needed — the form starts empty and
 * POSTs to `/api/books` on submission.
 *
 * On successful creation, the BookForm handles the redirect to the
 * Book List page and displays a success notification (Requirement 2.3).
 *
 * Validates: Requirements 2.1, 2.3
 */

import BookForm from '@/components/BookForm';

export default function CreateBookPage() {
  return <BookForm mode="create" />;
}
