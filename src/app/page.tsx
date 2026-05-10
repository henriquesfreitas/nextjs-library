/**
 * Root Page — Redirect to Book List
 *
 * The application's root URL (/) has no dedicated content. Instead, it
 * immediately redirects the user to the Book List page at /books, which
 * serves as the main entry point for browsing the inventory.
 *
 * Uses Next.js's `redirect` function from 'next/navigation', which throws
 * a special NEXT_REDIRECT error to perform a server-side redirect before
 * any content is rendered.
 *
 * Validates: Requirement 1.1
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/books');
}
