/**
 * Book Service — Business Logic Layer
 *
 * WHY A SERVICE LAYER?
 * --------------------
 * The Service pattern sits between the API route handlers (HTTP concerns) and
 * the data access layer (SQL concerns). It owns the application's business
 * rules — validation, authorization checks, status transitions, and error
 * classification. This separation means:
 *
 *   1. **API handlers stay thin** — they parse the request, call the service,
 *      and format the response. No business logic leaks into HTTP code.
 *
 *   2. **Business rules are centralized** — rules like "sold books can't have
 *      their price changed" live in one place, not scattered across multiple
 *      route handlers or UI components.
 *
 *   3. **Testability** — the service can be tested with a mock repository,
 *      verifying business logic without a database connection.
 *
 * HOW THIS MODULE WORKS
 * ---------------------
 * The `bookService` object exposes methods that map to user-facing operations:
 *
 *   - getAllBooks()    → Browse inventory
 *   - getBookById()   → View book details
 *   - createBook()    → Add a new book
 *   - updateBook()    → Edit book information (with optimistic locking)
 *   - deleteBook()    → Remove a book
 *   - buyBook()       → Mark a book as sold (with optimistic locking)
 *
 * Each method follows the same pattern:
 *   1. Validate input (if applicable) using Zod schemas
 *   2. Call the repository for data access
 *   3. Apply business rules (e.g., sold-book restrictions)
 *   4. Throw typed errors for exceptional cases (NotFound, Conflict, Validation)
 *   5. Log the operation outcome for observability
 *
 * ERROR STRATEGY
 * --------------
 * The service throws typed errors from `@/errors`:
 *   - `ValidationError` → input fails Zod schema parsing
 *   - `NotFoundError`   → requested book doesn't exist
 *   - `ConflictError`   → optimistic locking version mismatch
 *
 * The API route handlers catch these and map them to HTTP status codes.
 * This keeps HTTP semantics out of the service layer.
 */

import { bookRepository, toBook } from '@/data/bookRepository';
import { ValidationError, NotFoundError, ConflictError } from '@/errors';
import { createBookSchema, updateBookSchema, buyBookSchema } from '@/validators/bookSchemas';
import { logger } from '@/lib/logger';
import type { Book, CreateBookInput, UpdateBookInput } from '@/types/book';
import type { FieldError } from '@/types/api';

/**
 * Scoped logger for the service layer.
 *
 * Child loggers inherit the parent's configuration and add a `module` field
 * to every log entry. This makes it easy to filter service-layer logs in
 * aggregation tools (e.g., `module:bookService` in Datadog or Kibana).
 */
const log = logger.child({ module: 'bookService' });

/**
 * Converts Zod validation issues into the application's `FieldError[]` format.
 *
 * Zod's error structure uses a `path` array (for nested fields) and an `issues`
 * array. We flatten this into a simple `{ field, message }` array that the API
 * handler can include directly in the 400 response body. The client uses these
 * to display inline error messages next to each form field.
 *
 * @param issues - The array of Zod validation issues from a failed `.safeParse()`
 * @returns An array of `FieldError` objects for the API error response
 */
function toFieldErrors(issues: { path: (string | number)[]; message: string }[]): FieldError[] {
  return issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Book Service — the single source of truth for book-related business logic.
 *
 * Exported as a plain object (not a class) for simplicity. In a larger
 * application, you might use a class with dependency injection to swap
 * the repository in tests. For this MVP, the direct import keeps things
 * straightforward while still maintaining clean layer separation.
 */
export const bookService = {
  /**
   * Retrieve all books from the database.
   *
   * Fetches every book row and transforms them from the database's snake_case
   * format into the application's camelCase domain model. The API handler
   * returns this array directly as JSON.
   *
   * @returns An array of all books, ordered by most recently created first
   */
  async getAllBooks(): Promise<Book[]> {
    log.info('Fetching all books');

    const rows = await bookRepository.findAll();
    const books = rows.map(toBook);

    log.info({ count: books.length }, 'Fetched all books successfully');
    return books;
  },

  /**
   * Retrieve a single book by its ID.
   *
   * Throws `NotFoundError` if no book exists with the given ID, which the
   * API handler converts into a 404 response. This keeps the "not found"
   * decision in the service layer where it belongs — the API handler doesn't
   * need to check for null.
   *
   * @param id - The book's primary key (bigint stored as string)
   * @throws {NotFoundError} If no book exists with the given ID
   */
  async getBookById(id: string): Promise<Book> {
    log.info({ bookId: id }, 'Fetching book by ID');

    // Validate that the ID is a valid numeric string before querying.
    // PostgreSQL BIGINT columns reject non-numeric values with a cryptic error.
    if (!/^\d+$/.test(id)) {
      log.warn({ bookId: id }, 'Invalid book ID format');
      throw new NotFoundError('Book');
    }

    const row = await bookRepository.findById(id);

    if (!row) {
      log.warn({ bookId: id }, 'Book not found');
      throw new NotFoundError('Book');
    }

    log.info({ bookId: id }, 'Fetched book successfully');
    return toBook(row);
  },

  /**
   * Create a new book after validating the input.
   *
   * The flow:
   *   1. Validate input against `createBookSchema` (Zod)
   *   2. Insert the validated data into the database
   *   3. Return the created book with database-generated defaults
   *      (id, status=AVAILABLE, created_at=NOW(), version=0)
   *
   * @param input - The raw user input to validate and insert
   * @throws {ValidationError} If the input fails schema validation
   */
  async createBook(input: CreateBookInput): Promise<Book> {
    log.info({ operation: 'create' }, 'Creating a new book');

    // Validate input — safeParse returns a result object instead of throwing,
    // giving us control over how validation errors are reported.
    const result = createBookSchema.safeParse(input);

    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error.issues);
      log.warn({ errors: fieldErrors }, 'Validation failed for book creation');
      throw new ValidationError(fieldErrors);
    }

    // Use the validated (and sanitized — trimmed, stripped) data for insertion.
    // The isbn field is converted from undefined to null for the database.
    const validated = result.data;
    const row = await bookRepository.insert({
      title: validated.title,
      author: validated.author,
      isbn: validated.isbn || null,
      price: validated.price,
    });

    const book = toBook(row);
    log.info({ bookId: book.id, title: book.title }, 'Book created successfully');
    return book;
  },

  /**
   * Update an existing book with optimistic locking and sold-book restrictions.
   *
   * Business rules enforced here:
   *   1. The book must exist (404 if not)
   *   2. Sold books cannot have their price changed from the current value
   *   3. The version must match the database's current version (409 if not)
   *
   * The sold-book restriction (rule 2) prevents users from altering the price
   * of a completed sale. The UI disables the price field for sold books, but
   * the server enforces this rule as well to guard against API-level bypasses.
   *
   * @param id    - The book's primary key
   * @param input - The raw user input to validate and apply
   * @throws {ValidationError} If the input fails schema validation
   * @throws {NotFoundError}   If no book exists with the given ID
   * @throws {ConflictError}   If the version doesn't match (concurrent edit)
   */
  async updateBook(id: string, input: UpdateBookInput): Promise<Book> {
    log.info({ bookId: id, operation: 'update' }, 'Updating book');

    // Step 1: Validate input against the update schema
    const result = updateBookSchema.safeParse(input);

    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error.issues);
      log.warn({ bookId: id, errors: fieldErrors }, 'Validation failed for book update');
      throw new ValidationError(fieldErrors);
    }

    const validated = result.data;

    // Step 2: Fetch the current book to check existence and apply business rules
    const existingRow = await bookRepository.findById(id);

    if (!existingRow) {
      log.warn({ bookId: id }, 'Book not found for update');
      throw new NotFoundError('Book');
    }

    // Step 3: Enforce sold-book restrictions
    // When a book is SOLD, the price cannot be changed from its current value.
    // This protects the integrity of completed sales — once a book is sold at
    // a certain price, that price is part of the transaction record.
    if (existingRow.status === 'SOLD' && validated.price !== existingRow.price) {
      log.warn(
        { bookId: id, currentPrice: existingRow.price, attemptedPrice: validated.price },
        'Attempted to change price of a sold book',
      );
      throw new ValidationError([
        { field: 'price', message: 'Cannot change the price of a sold book' },
      ]);
    }

    // Step 4: Perform the update with optimistic locking
    // The repository's WHERE clause includes `AND version = $N`. If another
    // process modified the book between our read and this write, the version
    // won't match and the update returns null (zero rows affected).
    const updatedRow = await bookRepository.update(
      id,
      {
        title: validated.title,
        author: validated.author,
        isbn: validated.isbn || null,
        price: validated.price,
      },
      validated.version,
    );

    if (!updatedRow) {
      log.warn({ bookId: id, version: validated.version }, 'Version conflict during book update');
      throw new ConflictError('Book was modified by another process. Please refresh and try again.');
    }

    const book = toBook(updatedRow);
    log.info({ bookId: book.id, version: book.version }, 'Book updated successfully');
    return book;
  },

  /**
   * Delete a book by its ID.
   *
   * The repository returns a boolean indicating whether a row was actually
   * deleted. If no row matched the ID, we throw `NotFoundError` so the API
   * handler returns 404 instead of a misleading 204.
   *
   * @param id - The book's primary key
   * @throws {NotFoundError} If no book exists with the given ID
   */
  async deleteBook(id: string): Promise<void> {
    log.info({ bookId: id, operation: 'delete' }, 'Deleting book');

    const deleted = await bookRepository.deleteById(id);

    if (!deleted) {
      log.warn({ bookId: id }, 'Book not found for deletion');
      throw new NotFoundError('Book');
    }

    log.info({ bookId: id }, 'Book deleted successfully');
  },

  /**
   * Mark a book as sold (the "Buy" action).
   *
   * The flow:
   *   1. Validate the version input
   *   2. Fetch the book to verify it exists
   *   3. Update the status to SOLD with optimistic locking
   *   4. Return the updated book
   *
   * This is separated from `updateBook` because buying is a distinct business
   * action — it only changes the status, not the book's content fields. Having
   * a dedicated method makes the intent clear and keeps the update logic simpler.
   *
   * @param id      - The book's primary key
   * @param version - The expected current version (for optimistic locking)
   * @throws {ValidationError} If the version input is invalid
   * @throws {NotFoundError}   If no book exists with the given ID
   * @throws {ConflictError}   If the version doesn't match (concurrent purchase)
   */
  async buyBook(id: string, version: number): Promise<Book> {
    log.info({ bookId: id, operation: 'buy' }, 'Processing book purchase');

    // Step 1: Validate the version input
    const result = buyBookSchema.safeParse({ version });

    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error.issues);
      log.warn({ bookId: id, errors: fieldErrors }, 'Validation failed for book purchase');
      throw new ValidationError(fieldErrors);
    }

    // Step 2: Verify the book exists before attempting the status update
    const existingRow = await bookRepository.findById(id);

    if (!existingRow) {
      log.warn({ bookId: id }, 'Book not found for purchase');
      throw new NotFoundError('Book');
    }

    // Step 3: Update the status to SOLD with optimistic locking
    // The repository's WHERE clause checks both the ID and version. If another
    // user bought or modified the book concurrently, the version won't match
    // and the update returns null.
    const updatedRow = await bookRepository.updateStatus(id, 'SOLD', version);

    if (!updatedRow) {
      log.warn({ bookId: id, version }, 'Version conflict during book purchase');
      throw new ConflictError('Book was modified by another process. Please refresh and try again.');
    }

    const book = toBook(updatedRow);
    log.info({ bookId: book.id, status: book.status }, 'Book purchased successfully');
    return book;
  },
};
