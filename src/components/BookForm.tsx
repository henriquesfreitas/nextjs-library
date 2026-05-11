'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBookSchema, updateBookSchema } from '@/validators/bookSchemas';
import type { BookViewModel } from '@/types/book';
import type { ApiErrorResponse } from '@/types/api';
import Notification from './Notification';

/**
 * BookForm Component — Reusable form for creating and editing books.
 *
 * Pattern: Controlled Form
 * This component uses the Controlled Form pattern where React state is the single
 * source of truth for every input field. This enables real-time validation feedback
 * and programmatic control over form values (e.g., pre-filling in edit mode).
 *
 * Two Modes:
 * - "create": Renders an empty form for adding a new book to inventory.
 * - "edit": Pre-fills fields from an existing BookViewModel. Includes the book's
 *   `version` field as a hidden input for optimistic locking on the server.
 *
 * Client-Side Validation (Zod):
 * Uses the same Zod schemas (`createBookSchema` / `updateBookSchema`) that run on
 * the server, ensuring consistent validation rules on both sides. Validation runs
 * on submit — if it fails, field-level errors are displayed inline without a
 * network request. Server-side validation errors (e.g., duplicate ISBN) are also
 * mapped back to individual fields when the API returns a 400 with field errors.
 *
 * Business Rule — Sold-Book Price Restriction:
 * When editing a book with status "SOLD", the price input is disabled (via the
 * HTML `disabled` attribute) and styled to indicate non-editability. This enforces
 * the rule that sold books cannot have their price changed, providing immediate
 * visual feedback before any server round-trip.
 *
 * Accessibility:
 * - Every input has an associated <label> via matching `htmlFor`/`id` pairs.
 * - Required fields use `aria-required="true"` for screen readers.
 * - Invalid fields use `aria-invalid={true}` to announce error state.
 * - Error messages are linked via `aria-describedby` pointing to the error <p> id.
 * - Error messages use `role="alert"` for immediate announcement by assistive tech.
 * - The asterisk (*) on required labels uses `aria-hidden="true"` to avoid
 *   redundant "star" announcements (the requirement is conveyed via aria-required).
 *
 * Data Flow:
 * User input → React state → Zod validation → fetch POST/PUT to API route →
 * success notification + router.push, OR error notification / field errors.
 *
 * Styling uses Tailwind utility classes for maintainability and responsive design support.
 *
 * Validates: Requirements 2.2 (form fields), 2.3 (client validation + success feedback),
 * 2.4 (server validation mapping), 4.4 (edit form pre-fill), 4.5 (optimistic locking
 * via version), 4.7 (sold-book price restriction).
 */

export interface BookFormProps {
  mode: 'create' | 'edit';
  book?: BookViewModel;
}

function parsePriceFromViewModel(priceStr: string): string {
  const num = parseFloat(priceStr.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? '' : String(num);
}

export default function BookForm({ mode, book }: BookFormProps) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const isSold = isEdit && book?.status === 'SOLD';

  const [title, setTitle] = useState(isEdit && book ? book.title : '');
  const [author, setAuthor] = useState(isEdit && book ? book.author : '');
  const [isbn, setIsbn] = useState(isEdit && book ? book.isbn : '');
  const [price, setPrice] = useState(
    isEdit && book ? parsePriceFromViewModel(book.price) : ''
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const validateForm = useCallback(() => {
    const rawData: Record<string, unknown> = {
      title,
      author,
      isbn: isbn || undefined,
      price: price === '' ? undefined : Number(price),
    };

    if (isEdit && book) {
      rawData.version = book.version;
    }

    const schema = isEdit ? updateBookSchema : createBookSchema;
    const result = schema.safeParse(rawData);

    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field && !errors[String(field)]) {
          errors[String(field)] = issue.message;
        }
      }
      setFieldErrors(errors);
      return null;
    }

    setFieldErrors({});
    return result.data;
  }, [title, author, isbn, price, isEdit, book]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validData = validateForm();
    if (!validData) return;

    setIsSubmitting(true);

    try {
      const url = isEdit && book ? `/api/books/${book.id}` : '/api/books';
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validData),
      });

      if (response.ok) {
        const successMessage = isEdit ? 'Book updated successfully' : 'Book created successfully';
        setNotification({ message: successMessage, type: 'success' });
        setTimeout(() => {
          if (isEdit && book) {
            router.push(`/books/${book.id}`);
          } else {
            router.push('/books');
          }
        }, 1000);
      } else {
        const errorBody: ApiErrorResponse = await response.json();
        if (response.status === 400 && errorBody.errors) {
          const errors: Record<string, string> = {};
          for (const err of errorBody.errors) {
            errors[err.field] = err.message;
          }
          setFieldErrors(errors);
        } else {
          setNotification({
            message: errorBody.message || 'An error occurred. Please try again.',
            type: 'error',
          });
        }
      }
    } catch {
      setNotification({ message: 'Network error. Please check your connection and try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEdit && book) {
      router.push(`/books/${book.id}`);
    } else {
      router.push('/books');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        {isEdit ? 'Edit Book' : 'Create New Book'}
        {isSold && (
          <span className="ml-2 px-2 py-0.5 bg-red-50 text-red-800 rounded text-xs font-semibold">
            SOLD
          </span>
        )}
      </h1>

      <form onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div className="mb-5">
          <label htmlFor="book-title" className="block mb-1.5 text-sm font-medium text-gray-700">
            Title <span aria-hidden="true">*</span>
          </label>
          <input
            id="book-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.title}
            aria-describedby={fieldErrors.title ? 'book-title-error' : undefined}
            className={`w-full px-3 py-2 text-[0.95rem] border rounded-md text-gray-900 bg-white ${
              fieldErrors.title ? 'border-red-600' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            placeholder="Enter book title"
          />
          {fieldErrors.title && (
            <p id="book-title-error" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.title}
            </p>
          )}
        </div>

        {/* Author */}
        <div className="mb-5">
          <label htmlFor="book-author" className="block mb-1.5 text-sm font-medium text-gray-700">
            Author <span aria-hidden="true">*</span>
          </label>
          <input
            id="book-author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={255}
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.author}
            aria-describedby={fieldErrors.author ? 'book-author-error' : undefined}
            className={`w-full px-3 py-2 text-[0.95rem] border rounded-md text-gray-900 bg-white ${
              fieldErrors.author ? 'border-red-600' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            placeholder="Enter author name"
          />
          {fieldErrors.author && (
            <p id="book-author-error" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.author}
            </p>
          )}
        </div>

        {/* ISBN */}
        <div className="mb-5">
          <label htmlFor="book-isbn" className="block mb-1.5 text-sm font-medium text-gray-700">
            ISBN
          </label>
          <input
            id="book-isbn"
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            maxLength={255}
            aria-invalid={!!fieldErrors.isbn}
            aria-describedby={fieldErrors.isbn ? 'book-isbn-error' : undefined}
            className={`w-full px-3 py-2 text-[0.95rem] border rounded-md text-gray-900 bg-white ${
              fieldErrors.isbn ? 'border-red-600' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            placeholder="Enter ISBN (optional)"
          />
          {fieldErrors.isbn && (
            <p id="book-isbn-error" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.isbn}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="mb-5">
          <label htmlFor="book-price" className="block mb-1.5 text-sm font-medium text-gray-700">
            Price ($) <span aria-hidden="true">*</span>
          </label>
          <input
            id="book-price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            step="0.01"
            required
            disabled={!!isSold}
            aria-required="true"
            aria-invalid={!!fieldErrors.price}
            aria-describedby={fieldErrors.price ? 'book-price-error' : undefined}
            className={`w-full px-3 py-2 text-[0.95rem] border rounded-md ${
              isSold
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300'
                : fieldErrors.price
                  ? 'border-red-600 text-gray-900 bg-white'
                  : 'border-gray-300 text-gray-900 bg-white'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            placeholder="0.00"
          />
          {fieldErrors.price && (
            <p id="book-price-error" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.price}
            </p>
          )}
          {isSold && (
            <p className="mt-1 text-xs text-gray-500">
              Price cannot be changed for sold books.
            </p>
          )}
        </div>

        {isEdit && book && (
          <input type="hidden" name="version" value={book.version} />
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Book' : 'Create Book'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
