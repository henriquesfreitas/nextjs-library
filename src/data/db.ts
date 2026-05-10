/**
 * Database Connection Pool — pg.Pool
 *
 * WHY A CONNECTION POOL?
 * ----------------------
 * Opening a new database connection for every query is expensive — each
 * connection requires a TCP handshake, TLS negotiation (for Neon), and
 * authentication. A connection pool solves this by maintaining a set of
 * reusable connections that are checked out when needed and returned when done.
 *
 * Think of it like a library lending desk: instead of buying a new book every
 * time someone wants to read, the library keeps a collection and lends them out.
 * When a reader is done, the book goes back on the shelf for the next person.
 *
 * The `pg.Pool` class manages this automatically:
 *   - It creates connections on demand up to a configurable maximum (default: 10)
 *   - Idle connections are kept alive for reuse
 *   - When all connections are in use, new requests wait in a queue
 *   - Broken connections are detected and replaced transparently
 *
 * WHY PARAMETERIZED QUERIES?
 * --------------------------
 * SQL injection is one of the most common and dangerous web vulnerabilities.
 * It occurs when user input is concatenated directly into SQL strings:
 *
 *   ❌ DANGEROUS — never do this:
 *   `SELECT * FROM books WHERE id = ${userInput}`
 *
 *   If `userInput` is `"1; DROP TABLE books"`, the database executes both
 *   statements, destroying your data.
 *
 *   ✅ SAFE — always use parameterized queries:
 *   `SELECT * FROM books WHERE id = $1`, [userInput]
 *
 *   With parameterized queries, the database treats `$1` as a placeholder
 *   for a data value — not as executable SQL. The `pg` driver sends the
 *   query text and parameters separately to PostgreSQL, which binds them
 *   safely. No matter what the user provides, it can never alter the
 *   query's structure.
 *
 * HOW THIS MODULE WORKS
 * ---------------------
 * We export two things:
 *
 *   1. `pool` — the raw pg.Pool instance, available for advanced use cases
 *      like transactions (where you need to check out a dedicated client).
 *
 *   2. `query` — a typed helper function that wraps `pool.query()` with
 *      TypeScript generics. This is the primary interface for running
 *      parameterized queries throughout the data access layer.
 *
 * Usage:
 *
 *   import { query } from '@/data/db';
 *
 *   // The generic parameter <BookRow> types the returned rows
 *   const result = await query<BookRow>(
 *     'SELECT * FROM books WHERE id = $1',
 *     [bookId]
 *   );
 *   const book = result.rows[0]; // typed as BookRow
 */

import pg, { type QueryResultRow } from 'pg';
import { logger } from '@/lib/logger';

const { Pool } = pg;

/**
 * Create a scoped logger for database operations.
 *
 * Child loggers inherit the parent's configuration and add a `module` field
 * to every log entry, making it easy to filter database-related logs in
 * aggregation tools.
 */
const log = logger.child({ module: 'db' });

/**
 * The application-wide connection pool.
 *
 * Configuration:
 *   - `connectionString`: Read from the `DATABASE_URL` environment variable.
 *     This keeps credentials out of source code and allows different values
 *     per environment (development, staging, production).
 *
 *   - `ssl.rejectUnauthorized`: Set to `false` for Neon and other hosted
 *     PostgreSQL providers that use self-signed or provider-managed certificates.
 *     In a stricter production setup, you would provide the CA certificate instead.
 *
 *   - `max`: Maximum number of connections in the pool. The default of 10 is
 *     suitable for most web applications. Increase this if you observe queries
 *     waiting in the queue under load.
 *
 *   - `idleTimeoutMillis`: How long a connection can sit idle before being
 *     closed. This prevents holding open connections that aren't being used,
 *     which is especially important with hosted databases that charge per
 *     connection or have connection limits.
 *
 *   - `connectionTimeoutMillis`: How long to wait when requesting a connection
 *     from the pool before giving up. Prevents requests from hanging
 *     indefinitely if the database is unreachable.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

/**
 * Log pool-level errors.
 *
 * The pool emits an 'error' event when an idle client encounters an
 * unexpected error (e.g., the database server restarts). Without this
 * listener, the error would crash the Node.js process. By logging it,
 * we keep the application running — the pool will replace the broken
 * connection on the next query.
 */
pool.on('error', (err) => {
  log.error({ err }, 'Unexpected error on idle database client');
});

/**
 * Typed query helper — the primary interface for running database queries.
 *
 * This function wraps `pool.query()` with a TypeScript generic parameter
 * so that the returned `rows` array is properly typed. It enforces the
 * parameterized query pattern by accepting the SQL text and values as
 * separate arguments.
 *
 * @typeParam T - The expected row type (e.g., `BookRow`). Must extend
 *               `QueryResultRow`. Defaults to `Record<string, unknown>`
 *               for ad-hoc queries where typing isn't needed.
 *
 * @param text   - The SQL query string with `$1`, `$2`, ... placeholders.
 *                 NEVER interpolate user input into this string.
 * @param params - An array of values that correspond to the `$1`, `$2`, ...
 *                 placeholders in the query text. The `pg` driver sends these
 *                 separately to PostgreSQL, preventing SQL injection.
 *
 * @returns A `QueryResult<T>` containing `rows`, `rowCount`, and other
 *          metadata from the executed query.
 *
 * @example
 * ```typescript
 * // Fetch a single book by ID — safe from SQL injection
 * const result = await query<BookRow>(
 *   'SELECT * FROM books WHERE id = $1',
 *   [bookId]
 * );
 * const book = result.rows[0]; // typed as BookRow | undefined
 * ```
 *
 * @example
 * ```typescript
 * // Insert a new book with parameterized values
 * const result = await query<BookRow>(
 *   'INSERT INTO books (title, author, isbn, price) VALUES ($1, $2, $3, $4) RETURNING *',
 *   [title, author, isbn, price]
 * );
 * const newBook = result.rows[0]; // typed as BookRow
 * ```
 */
export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const durationMs = Date.now() - start;

    log.debug(
      { query: text, durationMs, rowCount: result.rowCount },
      'Executed database query',
    );

    return result;
  } catch (err) {
    const durationMs = Date.now() - start;

    log.error(
      { query: text, durationMs, err },
      'Database query failed',
    );

    throw err;
  }
}
