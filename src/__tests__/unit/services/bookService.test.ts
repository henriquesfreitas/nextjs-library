/**
 * Property-Based Tests for Book Service
 *
 * These tests verify the business logic in the book service layer by mocking
 * the data access layer (bookRepository). Each property test uses fast-check
 * to generate hundreds of random inputs, ensuring the service behaves correctly
 * across the full input space — not just hand-picked examples.
 *
 * WHY MOCK THE REPOSITORY?
 * ------------------------
 * The service layer's job is to orchestrate business rules, not to talk to a
 * real database. By mocking `bookRepository`, we isolate the service logic
 * and test it without a database connection. The mocks simulate realistic
 * database behavior (returning proper BookRow objects) so the service code
 * runs through its real transformation and validation paths.
 *
 * MOCK STRATEGY
 * -------------
 * Each property iteration calls `vi.resetAllMocks()` first, then sets up
 * fresh mocks with `mockResolvedValue`. This ensures:
 *   1. No stale return values leak between iterations
 *   2. fast-check's shrinking phase can re-run the property with the same
 *      mock behavior (mockResolvedValue persists until the next reset)
 *
 * Feature: book-management-crud
 * Properties: 4, 5, 6, 7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mock the repository module BEFORE importing the service.
// vi.mock hoists to the top of the file, so the service will receive
// the mocked version of bookRepository when it imports it.
//
// We use a factory function to keep the real `toBook` helper (it's a pure
// data-transformation function) while replacing the repository object's
// methods with Vitest mocks. This way the service's `toBook(row)` calls
// work against real logic, and only the database-touching methods are faked.
// ---------------------------------------------------------------------------
vi.mock('@/data/bookRepository', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/data/bookRepository')>();
  return {
    ...original,
    bookRepository: {
      findAll: vi.fn(),
      findById: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      deleteById: vi.fn(),
      updateStatus: vi.fn(),
    },
  };
});

import { bookService } from '@/services/bookService';
import { bookRepository } from '@/data/bookRepository';
import { ConflictError } from '@/errors';
import type { BookRow } from '@/types/book';

// Type the mocked functions so TypeScript knows about .mockResolvedValue etc.
const mockedRepo = vi.mocked(bookRepository);

// ---------------------------------------------------------------------------
// Arbitraries — smart generators that constrain to the valid input space
// ---------------------------------------------------------------------------

/**
 * Generates a non-empty string of 1–100 characters (valid title).
 * Filters out whitespace-only strings since Zod trims then checks min(1).
 */
const validTitle = () =>
  fc
    .string({ minLength: 1, maxLength: 100, unit: 'grapheme-ascii' })
    .filter((s) => s.trim().length >= 1);

/**
 * Generates a non-empty string of 1–255 characters (valid author).
 */
const validAuthor = () =>
  fc
    .string({ minLength: 1, maxLength: 255, unit: 'grapheme-ascii' })
    .filter((s) => s.trim().length >= 1);

/**
 * Generates an optional ISBN — either undefined or a string of 0–255 characters.
 */
const validIsbn = () =>
  fc.oneof(
    fc.constant(undefined),
    fc.constant(''),
    fc.string({ minLength: 1, maxLength: 255, unit: 'grapheme-ascii' }),
  );

/**
 * Generates a non-negative finite number (valid price).
 */
const validPrice = () =>
  fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true });

/**
 * Generates a non-negative integer (valid version).
 */
const validVersion = () => fc.nat({ max: 1_000_000 });

/**
 * Generates a valid CreateBookInput object.
 */
const validCreateInput = () =>
  fc.record({
    title: validTitle(),
    author: validAuthor(),
    isbn: validIsbn(),
    price: validPrice(),
  });

/**
 * Generates a valid UpdateBookInput object.
 */
const validUpdateInput = () =>
  fc.record({
    title: validTitle(),
    author: validAuthor(),
    isbn: validIsbn(),
    price: validPrice(),
    version: validVersion(),
  });

/**
 * Generates a random book ID (bigint stored as string, as returned by pg).
 */
const bookId = () => fc.nat({ max: 1_000_000 }).map(String);

/**
 * Builds a realistic BookRow as the database would return it.
 * This helper is used to configure mock return values so the service
 * code runs through its real toBook transformation.
 */
function makeBookRow(overrides: Partial<BookRow> = {}): BookRow {
  return {
    id: '1',
    title: 'Test Book',
    author: 'Test Author',
    isbn: null,
    status: 'AVAILABLE',
    price: 9.99,
    created_at: new Date(),
    updated_at: null,
    version: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset mocks before each test to prevent state leakage between properties
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Property 4: Created book has correct defaults
// ---------------------------------------------------------------------------
// Feature: book-management-crud, Property 4: Created book has correct defaults

describe('Property 4: Created book has correct defaults', () => {
  it('for any valid CreateBookInput, the created book has status AVAILABLE, non-null createdAt, and version 0', async () => {
    // **Validates: Requirements 2.1**
    await fc.assert(
      fc.asyncProperty(validCreateInput(), async (input) => {
        // Reset mocks at the start of each iteration so fast-check's
        // shrinking phase gets fresh mocks too.
        mockedRepo.insert.mockReset();

        // Mock the repository to return a BookRow with database defaults:
        // status='AVAILABLE', created_at=now, version=0
        const now = new Date();
        mockedRepo.insert.mockResolvedValue(
          makeBookRow({
            title: input.title.trim(),
            author: input.author.trim(),
            isbn: input.isbn?.trim() || null,
            price: input.price,
            status: 'AVAILABLE',
            created_at: now,
            updated_at: null,
            version: 0,
          }),
        );

        const book = await bookService.createBook(input);

        // The created book must have the correct defaults
        expect(book.status).toBe('AVAILABLE');
        expect(book.createdAt).not.toBeNull();
        expect(book.createdAt).toBeInstanceOf(Date);
        expect(book.version).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Update increments version and sets updated_at
// ---------------------------------------------------------------------------
// Feature: book-management-crud, Property 5: Update increments version and sets updated_at

describe('Property 5: Update increments version and sets updated_at', () => {
  it('for any valid update on an existing book with matching version, version increments by 1 and updatedAt is non-null', async () => {
    // **Validates: Requirements 4.1**
    await fc.assert(
      fc.asyncProperty(
        bookId(),
        validUpdateInput(),
        async (id, input) => {
          // Reset mocks at the start of each iteration
          mockedRepo.findById.mockReset();
          mockedRepo.update.mockReset();

          const originalVersion = input.version;

          // Mock findById to return an existing AVAILABLE book at the same version.
          // The book must be AVAILABLE so the price-change restriction doesn't
          // interfere with the property under test.
          mockedRepo.findById.mockResolvedValue(
            makeBookRow({
              id,
              status: 'AVAILABLE',
              price: input.price, // same price to avoid sold-book restriction
              version: originalVersion,
            }),
          );

          // Mock update to return a row with version+1 and updated_at set,
          // simulating what the database does on a successful UPDATE.
          mockedRepo.update.mockResolvedValue(
            makeBookRow({
              id,
              title: input.title.trim(),
              author: input.author.trim(),
              isbn: input.isbn?.trim() || null,
              price: input.price,
              status: 'AVAILABLE',
              version: originalVersion + 1,
              updated_at: new Date(),
            }),
          );

          const book = await bookService.updateBook(id, input);

          // Version must be exactly one greater than the original
          expect(book.version).toBe(originalVersion + 1);
          // updatedAt must be set (non-null)
          expect(book.updatedAt).not.toBeNull();
          expect(book.updatedAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Buy transitions status to SOLD
// ---------------------------------------------------------------------------
// Feature: book-management-crud, Property 6: Buy transitions status to SOLD

describe('Property 6: Buy transitions status to SOLD', () => {
  it('for any available book with matching version, buyBook produces status SOLD and non-null updatedAt', async () => {
    // **Validates: Requirements 6.2**
    await fc.assert(
      fc.asyncProperty(
        bookId(),
        validVersion(),
        async (id, version) => {
          // Reset mocks at the start of each iteration
          mockedRepo.findById.mockReset();
          mockedRepo.updateStatus.mockReset();

          // Mock findById to return an AVAILABLE book at the given version
          mockedRepo.findById.mockResolvedValue(
            makeBookRow({
              id,
              status: 'AVAILABLE',
              version,
            }),
          );

          // Mock updateStatus to return a row with status='SOLD',
          // version+1, and updated_at set — simulating the database behavior
          mockedRepo.updateStatus.mockResolvedValue(
            makeBookRow({
              id,
              status: 'SOLD',
              version: version + 1,
              updated_at: new Date(),
            }),
          );

          const book = await bookService.buyBook(id, version);

          // Status must transition to SOLD
          expect(book.status).toBe('SOLD');
          // updatedAt must be set
          expect(book.updatedAt).not.toBeNull();
          expect(book.updatedAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Optimistic locking rejects stale versions
// ---------------------------------------------------------------------------
// Feature: book-management-crud, Property 7: Optimistic locking rejects stale versions

describe('Property 7: Optimistic locking rejects stale versions', () => {
  it('updateBook throws ConflictError when the version does not match', async () => {
    // **Validates: Requirements 4.2, 4.3**
    await fc.assert(
      fc.asyncProperty(
        bookId(),
        validUpdateInput(),
        validVersion(),
        async (id, input, dbVersion) => {
          // Reset mocks at the start of each iteration
          mockedRepo.findById.mockReset();
          mockedRepo.update.mockReset();

          // Ensure the input version differs from the database version.
          // If they happen to match, skip this iteration by adjusting.
          const mismatchedDbVersion =
            dbVersion === input.version ? dbVersion + 1 : dbVersion;

          // Mock findById to return a book at the mismatched version.
          // Use AVAILABLE status and same price to avoid triggering
          // the sold-book price restriction.
          mockedRepo.findById.mockResolvedValue(
            makeBookRow({
              id,
              status: 'AVAILABLE',
              price: input.price,
              version: mismatchedDbVersion,
            }),
          );

          // Mock update to return null — simulating a version mismatch
          // in the WHERE clause (0 rows affected).
          mockedRepo.update.mockResolvedValue(null);

          await expect(bookService.updateBook(id, input)).rejects.toThrow(
            ConflictError,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('buyBook throws ConflictError when the version does not match', async () => {
    // **Validates: Requirements 6.3, 6.4**
    await fc.assert(
      fc.asyncProperty(
        bookId(),
        validVersion(),
        validVersion(),
        async (id, inputVersion, dbVersion) => {
          // Reset mocks at the start of each iteration
          mockedRepo.findById.mockReset();
          mockedRepo.updateStatus.mockReset();

          // Ensure the versions differ
          const mismatchedDbVersion =
            dbVersion === inputVersion ? dbVersion + 1 : dbVersion;

          // Mock findById to return an AVAILABLE book at the mismatched version
          mockedRepo.findById.mockResolvedValue(
            makeBookRow({
              id,
              status: 'AVAILABLE',
              version: mismatchedDbVersion,
            }),
          );

          // Mock updateStatus to return null — version mismatch
          mockedRepo.updateStatus.mockResolvedValue(null);

          await expect(
            bookService.buyBook(id, inputVersion),
          ).rejects.toThrow(ConflictError);
        },
      ),
      { numRuns: 100 },
    );
  });
});
