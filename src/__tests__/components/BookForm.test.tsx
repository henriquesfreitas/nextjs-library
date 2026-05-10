/**
 * BookForm Component Tests
 *
 * Tests the BookForm component in both create and edit modes, verifying:
 * - Empty fields render in create mode
 * - Pre-filled fields render in edit mode
 * - Field-level validation errors display on invalid submission
 * - Price field is disabled when book status is SOLD
 *
 * Uses @testing-library/react for rendering and interaction, with vitest
 * for assertions. Mocks next/navigation since we're in a test environment.
 *
 * Validates: Requirements 2.2, 2.4, 4.4, 4.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import BookForm from '@/components/BookForm';
import type { BookViewModel } from '@/types/book';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/**
 * Mock next/navigation — BookForm uses useRouter for navigation after
 * successful submission or cancel. We provide stub implementations so
 * the component can call push() and refresh() without errors.
 */
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

/**
 * Mock global fetch — BookForm calls fetch on form submission.
 * Each test can override this as needed.
 */
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * A sample BookViewModel representing an AVAILABLE book for edit mode tests.
 * The price is a formatted currency string as produced by the presenter.
 */
const availableBook: BookViewModel = {
  id: '42',
  title: 'Clean Code',
  author: 'Robert C. Martin',
  isbn: '978-0132350884',
  status: 'AVAILABLE',
  price: '$29.99',
  canBuy: true,
  canEdit: true,
  createdAt: '2024-01-15',
  updatedAt: null,
  version: 3,
};

/**
 * A sample BookViewModel representing a SOLD book.
 * Used to verify that the price field is disabled for sold books.
 */
const soldBook: BookViewModel = {
  id: '99',
  title: 'The Pragmatic Programmer',
  author: 'David Thomas',
  isbn: '978-0135957059',
  status: 'SOLD',
  price: '$49.99',
  canBuy: false,
  canEdit: false,
  createdAt: '2024-02-20',
  updatedAt: '2024-03-01',
  version: 5,
};

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('BookForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Create mode tests
  // -------------------------------------------------------------------------

  describe('create mode', () => {
    it('renders with empty fields', () => {
      render(<BookForm mode="create" />);

      // Title field should be empty
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveValue('');

      // Author field should be empty
      const authorInput = screen.getByLabelText(/author/i);
      expect(authorInput).toHaveValue('');

      // ISBN field should be empty
      const isbnInput = screen.getByLabelText(/isbn/i);
      expect(isbnInput).toHaveValue('');

      // Price field should be empty
      const priceInput = screen.getByLabelText(/price/i);
      expect(priceInput).toHaveValue(null);
    });

    it('renders the "Create New Book" heading', () => {
      render(<BookForm mode="create" />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Create New Book'
      );
    });

    it('renders a "Create Book" submit button', () => {
      render(<BookForm mode="create" />);

      expect(
        screen.getByRole('button', { name: /create book/i })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Edit mode tests
  // -------------------------------------------------------------------------

  describe('edit mode', () => {
    it('renders with pre-filled values from BookViewModel', () => {
      render(<BookForm mode="edit" book={availableBook} />);

      // Title should be pre-filled
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveValue('Clean Code');

      // Author should be pre-filled
      const authorInput = screen.getByLabelText(/author/i);
      expect(authorInput).toHaveValue('Robert C. Martin');

      // ISBN should be pre-filled
      const isbnInput = screen.getByLabelText(/isbn/i);
      expect(isbnInput).toHaveValue('978-0132350884');

      // Price should be the numeric value extracted from "$29.99"
      const priceInput = screen.getByLabelText(/price/i);
      expect(priceInput).toHaveValue(29.99);
    });

    it('renders the "Edit Book" heading', () => {
      render(<BookForm mode="edit" book={availableBook} />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Edit Book'
      );
    });

    it('renders an "Update Book" submit button', () => {
      render(<BookForm mode="edit" book={availableBook} />);

      expect(
        screen.getByRole('button', { name: /update book/i })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Validation error tests
  // -------------------------------------------------------------------------

  describe('validation errors', () => {
    it('displays "Title is required" when submitting with empty title', async () => {
      render(<BookForm mode="create" />);

      // Submit the form without filling any fields
      const submitButton = screen.getByRole('button', { name: /create book/i });
      fireEvent.click(submitButton);

      // Wait for validation error to appear
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    });

    it('displays "Author is required" when submitting with empty author', async () => {
      render(<BookForm mode="create" />);

      // Fill only the title to isolate the author error
      const titleInput = screen.getByLabelText(/title/i);
      fireEvent.change(titleInput, { target: { value: 'Some Title' } });

      const submitButton = screen.getByRole('button', { name: /create book/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Author is required')).toBeInTheDocument();
      });
    });

    it('marks invalid fields with aria-invalid', async () => {
      render(<BookForm mode="create" />);

      const submitButton = screen.getByRole('button', { name: /create book/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title/i);
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  // -------------------------------------------------------------------------
  // SOLD book tests — price field disabled
  // -------------------------------------------------------------------------

  describe('SOLD book behavior', () => {
    it('disables the price field when book status is SOLD', () => {
      render(<BookForm mode="edit" book={soldBook} />);

      const priceInput = screen.getByLabelText(/price/i);
      expect(priceInput).toBeDisabled();
    });

    it('shows the SOLD badge in the heading', () => {
      render(<BookForm mode="edit" book={soldBook} />);

      expect(screen.getByText('SOLD')).toBeInTheDocument();
    });

    it('shows informational message about price being locked', () => {
      render(<BookForm mode="edit" book={soldBook} />);

      expect(
        screen.getByText(/price cannot be changed for sold books/i)
      ).toBeInTheDocument();
    });

    it('does not disable the price field for AVAILABLE books', () => {
      render(<BookForm mode="edit" book={availableBook} />);

      const priceInput = screen.getByLabelText(/price/i);
      expect(priceInput).not.toBeDisabled();
    });
  });
});
