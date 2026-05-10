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
 * This is a Client Component because it manages local form state, performs
 * client-side Zod validation, and makes fetch calls to the API on submission.
 *
 * The component operates in two modes:
 * - **Create mode**: Renders an empty form that POSTs to `/api/books`
 * - **Edit mode**: Pre-fills fields from a `BookViewModel` and PUTs to `/api/books/[id]`
 *
 * Pattern: "Controlled Form" — React state drives every input value, giving us
 * full control over validation timing and field-level error display. The shared
 * Zod schemas (`createBookSchema` / `updateBookSchema`) run on the client for
 * instant feedback and again on the server for security.
 *
 * Business rule: When a book's status is `SOLD`, the price field is disabled
 * to prevent modification of completed sales (Requirement 4.7).
 *
 * Accessibility:
 * - Each input has an associated <label> via htmlFor/id pairing
 * - Field-level errors use aria-describedby to link error messages to inputs
 * - aria-invalid marks inputs with validation errors
 * - The submit button is disabled during submission to prevent double-clicks
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 4.4, 4.5, 4.7
 */

export interface BookFormProps {
  /** Whether the form is for creating a new book or editing an existing one */
  mode: 'create' | 'edit';
  /** Pre-filled book data for edit mode. Ignored in create mode. */
  book?: BookViewModel;
}

/* ------------------------------------------------------------------ */
/*  Inline styles                                                      */
/* ------------------------------------------------------------------ */

const formContainerStyles: React.CSSProperties = {
  maxWidth: '32rem',
  margin: '0 auto',
  padding: '1.5rem',
};

const headingStyles: React.CSSProperties = {
  margin: '0 0 1.5rem',
  fontSize: '1.5rem',
  fontWeight: 600,
  color: '#111827',
};

const fieldGroupStyles: React.CSSProperties = {
  marginBottom: '1.25rem',
};

const labelStyles: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.375rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  color: '#374151',
};

const inputStyles: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '0.95rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  color: '#111827',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
};

const inputErrorStyles: React.CSSProperties = {
  ...inputStyles,
  borderColor: '#dc2626',
};

const inputDisabledStyles: React.CSSProperties = {
  ...inputStyles,
  backgroundColor: '#f3f4f6',
  color: '#9ca3af',
  cursor: 'not-allowed',
};

const fieldErrorStyles: React.CSSProperties = {
  marginTop: '0.25rem',
  fontSize: '0.8rem',
  color: '#dc2626',
  lineHeight: 1.4,
};

const actionsStyles: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  marginTop: '1.5rem',
};

const submitButtonStyles: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const submitButtonDisabledStyles: React.CSSProperties = {
  ...submitButtonStyles,
  backgroundColor: '#93c5fd',
  cursor: 'not-allowed',
};

const cancelButtonStyles: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  backgroundColor: '#f3f4f6',
  color: '#374151',
  border: 'none',
  borderRadius: '0.375rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const soldBadgeStyles: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.2rem 0.5rem',
  backgroundColor: '#fef2f2',
  color: '#991b1b',
  borderRadius: '0.25rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  marginLeft: '0.5rem',
};

/* ------------------------------------------------------------------ */
/*  Helper: parse price string from BookViewModel back to a number     */
/* ------------------------------------------------------------------ */

/**
 * Extracts the numeric value from a formatted currency string like "$12.99".
 * Falls back to an empty string if parsing fails, so the input shows blank
 * rather than NaN.
 */
function parsePriceFromViewModel(priceStr: string): string {
  const num = parseFloat(priceStr.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? '' : String(num);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BookForm({ mode, book }: BookFormProps) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const isSold = isEdit && book?.status === 'SOLD';

  // Form field state — pre-filled in edit mode, empty in create mode
  const [title, setTitle] = useState(isEdit && book ? book.title : '');
  const [author, setAuthor] = useState(isEdit && book ? book.author : '');
  const [isbn, setIsbn] = useState(isEdit && book ? book.isbn : '');
  const [price, setPrice] = useState(
    isEdit && book ? parsePriceFromViewModel(book.price) : ''
  );

  // Field-level validation errors keyed by field name
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  /**
   * Validates form data using the appropriate Zod schema.
   *
   * Returns the parsed data on success, or null if validation fails.
   * On failure, populates fieldErrors with per-field messages so the UI
   * can display inline errors below each input (Requirement 2.4).
   */
  const validateForm = useCallback(() => {
    const rawData: Record<string, unknown> = {
      title,
      author,
      isbn: isbn || undefined,
      price: price === '' ? undefined : Number(price),
    };

    // In edit mode, include the version for optimistic locking
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

  /**
   * Handles form submission.
   *
   * 1. Validates input with the shared Zod schema (client-side)
   * 2. POSTs or PUTs to the appropriate API endpoint
   * 3. On success: shows notification and redirects
   * 4. On failure: shows field-level errors (400) or a notification (other errors)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validData = validateForm();
    if (!validData) return;

    setIsSubmitting(true);

    try {
      const url = isEdit && book
        ? `/api/books/${book.id}`
        : '/api/books';

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validData),
      });

      if (response.ok) {
        // Success — show notification and redirect
        const successMessage = isEdit
          ? 'Book updated successfully'
          : 'Book created successfully';

        setNotification({ message: successMessage, type: 'success' });

        // Short delay so the user sees the notification before redirect
        setTimeout(() => {
          if (isEdit && book) {
            router.push(`/books/${book.id}`);
          } else {
            router.push('/books');
          }
        }, 1000);
      } else {
        // Error — parse the API error response
        const errorBody: ApiErrorResponse = await response.json();

        if (response.status === 400 && errorBody.errors) {
          // Validation errors from the server — display inline
          const errors: Record<string, string> = {};
          for (const err of errorBody.errors) {
            errors[err.field] = err.message;
          }
          setFieldErrors(errors);
        } else {
          // Other errors (409 conflict, 404 not found, 500, etc.)
          setNotification({
            message: errorBody.message || 'An error occurred. Please try again.',
            type: 'error',
          });
        }
      }
    } catch {
      setNotification({
        message: 'Network error. Please check your connection and try again.',
        type: 'error',
      });
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
    <div style={formContainerStyles}>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <h1 style={headingStyles}>
        {isEdit ? 'Edit Book' : 'Create New Book'}
        {isSold && <span style={soldBadgeStyles}>SOLD</span>}
      </h1>

      <form onSubmit={handleSubmit} noValidate>
        {/* Title field */}
        <div style={fieldGroupStyles}>
          <label htmlFor="book-title" style={labelStyles}>
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
            style={fieldErrors.title ? inputErrorStyles : inputStyles}
            placeholder="Enter book title"
          />
          {fieldErrors.title && (
            <p id="book-title-error" style={fieldErrorStyles} role="alert">
              {fieldErrors.title}
            </p>
          )}
        </div>

        {/* Author field */}
        <div style={fieldGroupStyles}>
          <label htmlFor="book-author" style={labelStyles}>
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
            style={fieldErrors.author ? inputErrorStyles : inputStyles}
            placeholder="Enter author name"
          />
          {fieldErrors.author && (
            <p id="book-author-error" style={fieldErrorStyles} role="alert">
              {fieldErrors.author}
            </p>
          )}
        </div>

        {/* ISBN field (optional) */}
        <div style={fieldGroupStyles}>
          <label htmlFor="book-isbn" style={labelStyles}>
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
            style={fieldErrors.isbn ? inputErrorStyles : inputStyles}
            placeholder="Enter ISBN (optional)"
          />
          {fieldErrors.isbn && (
            <p id="book-isbn-error" style={fieldErrorStyles} role="alert">
              {fieldErrors.isbn}
            </p>
          )}
        </div>

        {/* Price field — disabled when book is SOLD */}
        <div style={fieldGroupStyles}>
          <label htmlFor="book-price" style={labelStyles}>
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
            style={
              isSold
                ? inputDisabledStyles
                : fieldErrors.price
                  ? inputErrorStyles
                  : inputStyles
            }
            placeholder="0.00"
          />
          {fieldErrors.price && (
            <p id="book-price-error" style={fieldErrorStyles} role="alert">
              {fieldErrors.price}
            </p>
          )}
          {isSold && (
            <p style={{ ...fieldErrorStyles, color: '#6b7280' }}>
              Price cannot be changed for sold books.
            </p>
          )}
        </div>

        {/*
          Hidden version field for optimistic locking in edit mode.
          The version is included in the validated data automatically via
          the book prop — this hidden input is for form semantics only.
        */}
        {isEdit && book && (
          <input type="hidden" name="version" value={book.version} />
        )}

        {/* Form actions */}
        <div style={actionsStyles}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={isSubmitting ? submitButtonDisabledStyles : submitButtonStyles}
          >
            {isSubmitting
              ? 'Saving...'
              : isEdit
                ? 'Update Book'
                : 'Create Book'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            style={cancelButtonStyles}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
