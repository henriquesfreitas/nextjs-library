/**
 * Book Presenter
 *
 * Transforms domain `Book` objects into `BookViewModel` objects ready for
 * React components. This is the final step in the data transformation pipeline:
 *
 *   BookRow (DB) → Book (Domain) → BookViewModel (UI)
 *
 * The presenter encapsulates all display-formatting logic — currency strings,
 * human-readable dates, and derived boolean flags — so that React components
 * never need to duplicate this work. This follows the Presenter pattern from
 * MVP architecture, keeping the View layer thin and testable.
 */

import type { Book, BookViewModel } from "@/types/book";

/**
 * Formats a numeric price as a US-dollar currency string.
 *
 * Uses `Intl.NumberFormat` for locale-aware formatting with exactly two
 * decimal places, producing strings like "$12.99" or "$0.00".
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Formats a Date object as a human-readable UTC string.
 *
 * Uses explicit UTC timezone to guarantee identical output on server and
 * client, preventing React hydration mismatches. Without a fixed timezone,
 * the server (running in Docker with a potentially different TZ) and the
 * browser could produce different formatted strings for the same Date.
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Transforms a single domain `Book` into a `BookViewModel` for the UI.
 *
 * Key transformations:
 * - `price` → formatted currency string (e.g., "$12.99")
 * - `isbn` → empty string when null (simpler for rendering)
 * - `createdAt` → human-readable date string
 * - `updatedAt` → human-readable date string or null
 * - `canBuy` → true only when the book is AVAILABLE
 * - `canEdit` → true only when the book is AVAILABLE
 *
 * The derived `canBuy` and `canEdit` flags centralize the status-based
 * display logic so components can bind directly without conditional checks.
 */
export function toBookViewModel(book: Book): BookViewModel {
  const isAvailable = book.status === "AVAILABLE";

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn ?? "",
    status: book.status,
    price: formatPrice(book.price),
    canBuy: isAvailable,
    canEdit: isAvailable,
    createdAt: formatDate(book.createdAt),
    updatedAt: book.updatedAt ? formatDate(book.updatedAt) : null,
    version: book.version,
  };
}

/**
 * Transforms an array of domain `Book` objects into `BookViewModel[]`.
 *
 * Convenience wrapper that maps `toBookViewModel` over a list, used by
 * the Book List page to prepare data for the `BookList` component.
 */
export function toBookListViewModel(books: Book[]): BookViewModel[] {
  return books.map(toBookViewModel);
}
