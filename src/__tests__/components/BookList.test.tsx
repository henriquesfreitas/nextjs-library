/**
 * BookList Component Tests
 *
 * Tests the BookList component, verifying:
 * - Book data renders correctly (title, author, price, status displayed)
 * - "Buy" button is visible for AVAILABLE books and hidden for SOLD books
 *
 * Uses @testing-library/react for rendering and interaction, with vitest
 * for assertions. Mocks next/navigation and next/link since we're in a
 * test environment without a real Next.js router.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 6.1, 6.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import BookList from '@/components/BookList';
import type { BookViewModel } from '@/types/book';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/**
 * Mock next/navigation — BookList uses useRouter for router.refresh()
 * after a successful buy action.
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
 * Mock next/link — BookList renders <Link> elements for book detail
 * navigation. In the test environment there's no Next.js router context,
 * so we replace Link with a plain <a> tag that preserves the href.
 */
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

/**
 * Mock global fetch — BookList calls fetch when the user confirms a buy.
 * Each test can override this as needed.
 */
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** An AVAILABLE book — should show a "Buy" button */
const availableBook: BookViewModel = {
  id: '1',
  title: 'Clean Code',
  author: 'Robert C. Martin',
  isbn: '978-0132350884',
  status: 'AVAILABLE',
  price: '$29.99',
  canBuy: true,
  canEdit: true,
  createdAt: '2024-01-15',
  updatedAt: null,
  version: 0,
};

/** A SOLD book — should NOT show a "Buy" button */
const soldBook: BookViewModel = {
  id: '2',
  title: 'The Pragmatic Programmer',
  author: 'David Thomas',
  isbn: '978-0135957059',
  status: 'SOLD',
  price: '$49.99',
  canBuy: false,
  canEdit: false,
  createdAt: '2024-02-20',
  updatedAt: '2024-03-01',
  version: 3,
};

/** A second AVAILABLE book for multi-row tests */
const anotherAvailableBook: BookViewModel = {
  id: '3',
  title: 'Refactoring',
  author: 'Martin Fowler',
  isbn: '',
  status: 'AVAILABLE',
  price: '$39.99',
  canBuy: true,
  canEdit: true,
  createdAt: '2024-03-10',
  updatedAt: null,
  version: 1,
};

const allBooks: BookViewModel[] = [availableBook, soldBook, anotherAvailableBook];

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('BookList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Rendering book data — Requirements 1.1, 1.2
  // -------------------------------------------------------------------------

  describe('renders book data correctly', () => {
    it('displays title, author, price, and status for each book', () => {
      render(<BookList books={allBooks} />);

      // Verify each book's core fields are rendered
      for (const book of allBooks) {
        expect(screen.getByText(book.title)).toBeInTheDocument();
        expect(screen.getByText(book.author)).toBeInTheDocument();
        expect(screen.getByText(book.price)).toBeInTheDocument();
      }

      // Two AVAILABLE badges and one SOLD badge
      const availableBadges = screen.getAllByLabelText('Status: available');
      expect(availableBadges).toHaveLength(2);

      const soldBadges = screen.getAllByLabelText('Status: sold');
      expect(soldBadges).toHaveLength(1);
    });

    it('displays ISBN when present and a dash when absent', () => {
      render(<BookList books={allBooks} />);

      // availableBook has an ISBN
      expect(screen.getByText('978-0132350884')).toBeInTheDocument();
      // soldBook has an ISBN
      expect(screen.getByText('978-0135957059')).toBeInTheDocument();
      // anotherAvailableBook has empty ISBN → rendered as "—"
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('displays createdAt date for each book', () => {
      render(<BookList books={allBooks} />);

      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('2024-02-20')).toBeInTheDocument();
      expect(screen.getByText('2024-03-10')).toBeInTheDocument();
    });

    it('renders a table with correct column headers', () => {
      render(<BookList books={allBooks} />);

      const headers = ['Title', 'Author', 'ISBN', 'Status', 'Price', 'Created', 'Actions'];
      for (const header of headers) {
        expect(
          screen.getByRole('columnheader', { name: header })
        ).toBeInTheDocument();
      }
    });

    it('links each book title to its detail page', () => {
      render(<BookList books={allBooks} />);

      const cleanCodeLink = screen.getByRole('link', {
        name: /view details for "clean code"/i,
      });
      expect(cleanCodeLink).toHaveAttribute('href', '/books/1');

      const pragProgLink = screen.getByRole('link', {
        name: /view details for "the pragmatic programmer"/i,
      });
      expect(pragProgLink).toHaveAttribute('href', '/books/2');
    });
  });

  // -------------------------------------------------------------------------
  // Buy button visibility — Requirements 6.1, 6.5
  // -------------------------------------------------------------------------

  describe('Buy button visibility', () => {
    it('shows "Buy" button for AVAILABLE books', () => {
      render(<BookList books={allBooks} />);

      // AVAILABLE books should have Buy buttons with aria-labels
      expect(
        screen.getByRole('button', { name: /buy "clean code"/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /buy "refactoring"/i })
      ).toBeInTheDocument();
    });

    it('does not show "Buy" button for SOLD books', () => {
      render(<BookList books={allBooks} />);

      // SOLD book should NOT have a Buy button
      expect(
        screen.queryByRole('button', { name: /buy "the pragmatic programmer"/i })
      ).not.toBeInTheDocument();
    });

    it('shows no Buy buttons when all books are SOLD', () => {
      const allSold: BookViewModel[] = [
        { ...soldBook, id: '10', title: 'Book A' },
        { ...soldBook, id: '11', title: 'Book B' },
      ];

      render(<BookList books={allSold} />);

      // No Buy buttons should exist at all
      const buyButtons = screen.queryAllByRole('button', { name: /buy/i });
      expect(buyButtons).toHaveLength(0);
    });

    it('shows Buy buttons for all books when all are AVAILABLE', () => {
      const allAvailable: BookViewModel[] = [
        { ...availableBook, id: '20', title: 'Book X' },
        { ...availableBook, id: '21', title: 'Book Y' },
      ];

      render(<BookList books={allAvailable} />);

      const buyButtons = screen.getAllByRole('button', { name: /buy/i });
      expect(buyButtons).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Status badge rendering
  // -------------------------------------------------------------------------

  describe('status badges', () => {
    it('renders AVAILABLE status badge with correct aria-label', () => {
      render(<BookList books={[availableBook]} />);

      const badge = screen.getByLabelText('Status: available');
      expect(badge).toHaveTextContent('AVAILABLE');
    });

    it('renders SOLD status badge with correct aria-label', () => {
      render(<BookList books={[soldBook]} />);

      const badge = screen.getByLabelText('Status: sold');
      expect(badge).toHaveTextContent('SOLD');
    });
  });
});
