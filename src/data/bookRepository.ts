/**
 * Book Repository — Data Access Layer
 *
 * WHY A REPOSITORY?
 * -----------------
 * The Repository pattern encapsulates all database access logic behind a clean
 * interface. The rest of the application (services, API handlers) never sees
 * raw SQL or knows which database engine is in use. This provides two key
 * benefits:
 *
 *   1. **Testability** — The service layer can be tested with a mock repository
 *      that returns predictable data, without needing a real database.
 *
 *   2. **Changeability** — If the database schema changes (e.g., a column is
 *      renamed) or the database engine is swapped (e.g., from PostgreSQL to
 *      MySQL), only this file needs to change. The service layer is unaffected.
 *
 * PARAMETERIZED QUERIES
 * ---------------------
 * Every query in this module uses parameterized statements ($1, $2, ...) to
 * prevent SQL injection. User-provided values are NEVER interpolated into
 * query strings. The `pg` driver sends the query text and parameter values
 * separately to PostgreSQL, which binds them safely. See `src/data/db.ts`
 * for a detailed explanation of why this matters.
 *
 * DATA TRANSFORMATION
 * -------------------
 * The `pg` driver returns rows with snake_case column names matching the
 * PostgreSQL schema. The `toBook` helper converts these `BookRow` objects
 * into `Book` domain objects with idiomatic camelCase field names. This
 * keeps the database naming convention isolated to the data access layer.
 */

import { query } from '@/data/db';
import type { BookRow, Book } from '@/types/book';

/**
 * Input shape for inserting a new book into the database.
 *
 * Only includes the four user-provided fields. The database handles defaults
 * for `id` (auto-generated), `status` ('AVAILABLE'), `created_at` (NOW()),
 * `updated_at` (null), and `version` (0).
 */
export interface InsertBookData {
  title: string;
  author: string;
  isbn: string | null;
  price: number;
}

/**
 * Input shape for updating an existing book.
 *
 * Contains all editable fields. The `version` field is passed separately
 * to the `update` method for optimistic locking — it's part of the WHERE
 * clause, not the SET clause.
 */
export interface UpdateBookData {
  title: string;
  author: string;
  isbn: string | null;
  price: number;
}

/**
 * Converts a database row (snake_case) to a domain model (camelCase).
 *
 * This is the single transformation point between the database schema and
 * the application's domain model. By centralizing this conversion here,
 * we ensure that every part of the application above the data access layer
 * works with consistent camelCase field names.
 *
 * @param row - A raw database row as returned by the `pg` driver
 * @returns A `Book` domain object with camelCase field names
 *
 * @example
 * ```typescript
 * const row: BookRow = { id: '1', title: 'Clean Code', created_at: new Date(), ... };
 * const book: Book = toBook(row);
 * // book.createdAt is now a Date, book.updatedAt is Date | null
 * ```
 */
export function toBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    isbn: row.isbn,
    status: row.status,
    price: Number(row.price),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: Number(row.version),
  };
}

/**
 * Book Repository — the single source of truth for all book-related SQL.
 *
 * Each method maps to exactly one SQL operation. The repository returns raw
 * `BookRow` objects (snake_case) — the service layer uses `toBook()` to
 * convert them to domain `Book` objects before applying business logic.
 *
 * Methods that use optimistic locking (`update`, `updateStatus`) include
 * `AND version = $N` in their WHERE clause. If the version doesn't match
 * (meaning another process modified the row), the query affects zero rows
 * and returns null. The service layer interprets this as a conflict.
 */
export const bookRepository = {
  /**
   * Fetch all books, ordered by most recently created first.
   *
   * Returns the full list without pagination — suitable for an MVP with
   * a manageable number of records. For production scale, this would be
   * extended with LIMIT/OFFSET or cursor-based pagination.
   */
  async findAll(): Promise<BookRow[]> {
    const result = await query<BookRow>(
      'SELECT * FROM books ORDER BY created_at DESC',
    );
    return result.rows;
  },

  /**
   * Fetch a single book by its primary key.
   *
   * Returns `null` if no row matches the given ID, allowing the service
   * layer to throw a `NotFoundError` with a meaningful message.
   *
   * @param id - The book's primary key (bigint stored as string)
   */
  async findById(id: string): Promise<BookRow | null> {
    const result = await query<BookRow>(
      'SELECT * FROM books WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  },

  /**
   * Insert a new book and return the created row.
   *
   * Uses `RETURNING *` to get the complete row back in a single round trip,
   * including database-generated defaults (id, status, created_at, version).
   *
   * @param data - The user-provided fields for the new book
   */
  async insert(data: InsertBookData): Promise<BookRow> {
    const result = await query<BookRow>(
      'INSERT INTO books (title, author, isbn, price, status, created_at, version) VALUES ($1, $2, $3, $4, $5, NOW(), 0) RETURNING *',
      [data.title, data.author, data.isbn, data.price, 'AVAILABLE'],
    );
    return result.rows[0];
  },

  /**
   * Update a book's editable fields with optimistic locking.
   *
   * The WHERE clause includes both `id` and `version` — if the version in
   * the database doesn't match the expected version, the UPDATE affects zero
   * rows and `RETURNING *` produces no results. This signals a concurrent
   * modification conflict.
   *
   * On success, `version` is incremented by 1 and `updated_at` is set to
   * the current timestamp via `NOW()`.
   *
   * @param id      - The book's primary key
   * @param data    - The new field values
   * @param version - The expected current version (for optimistic locking)
   * @returns The updated row, or `null` if the version didn't match
   */
  async update(id: string, data: UpdateBookData, version: number): Promise<BookRow | null> {
    const result = await query<BookRow>(
      `UPDATE books
         SET title = $1,
             author = $2,
             isbn = $3,
             price = $4,
             updated_at = NOW(),
             version = version + 1
       WHERE id = $5
         AND version = $6
       RETURNING *`,
      [data.title, data.author, data.isbn, data.price, id, version],
    );
    return result.rows[0] ?? null;
  },

  /**
   * Delete a book by its primary key.
   *
   * Returns `true` if a row was deleted, `false` if no row matched the ID.
   * The service layer uses the boolean to decide whether to throw a
   * `NotFoundError`.
   *
   * @param id - The book's primary key
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM books WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  },

  /**
   * Update a book's status with optimistic locking.
   *
   * Used by the "Buy" action to transition a book from AVAILABLE to SOLD.
   * Like `update`, this includes version checking in the WHERE clause and
   * increments the version on success.
   *
   * @param id      - The book's primary key
   * @param status  - The new status value (e.g., 'SOLD')
   * @param version - The expected current version (for optimistic locking)
   * @returns The updated row, or `null` if the version didn't match
   */
  async updateStatus(id: string, status: string, version: number): Promise<BookRow | null> {
    const result = await query<BookRow>(
      `UPDATE books
         SET status = $1,
             updated_at = NOW(),
             version = version + 1
       WHERE id = $2
         AND version = $3
       RETURNING *`,
      [status, id, version],
    );
    return result.rows[0] ?? null;
  },
};
