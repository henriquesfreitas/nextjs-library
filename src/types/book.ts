/**
 * Book Type Definitions
 *
 * These types define the data structures used across the application's layered
 * architecture. Data flows through three transformation boundaries:
 *
 *   BookRow (Database) → Book (Domain) → BookViewModel (UI)
 *
 * - BookRow: Raw database row with snake_case fields, as returned by the `pg` driver.
 * - Book: Domain model with camelCase fields, used in the service layer for business logic.
 * - BookViewModel: UI-ready model with formatted strings and derived display flags,
 *   produced by the presenter layer for React components.
 *
 * Keeping these as separate types enforces clear boundaries between layers and
 * makes it easy to change one layer (e.g., a DB column rename) without rippling
 * through the entire codebase.
 */

/**
 * Direct mapping from a database row returned by the `pg` driver.
 *
 * Field names use snake_case to match the PostgreSQL column names exactly.
 * The `pg` driver returns `bigint` columns as strings (not numbers), so `id`
 * is typed as `string`. Timestamps are parsed into `Date` objects by `pg`.
 */
export interface BookRow {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  status: "AVAILABLE" | "SOLD";
  price: number;
  created_at: Date;
  updated_at: Date | null;
  version: number;
}

/**
 * Domain model used in the service layer.
 *
 * Converts snake_case database fields to idiomatic camelCase for use in
 * TypeScript business logic. This is the canonical representation of a book
 * throughout the application's core — services, API handlers, and presenters
 * all work with this type.
 */
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  status: "AVAILABLE" | "SOLD";
  price: number;
  createdAt: Date;
  updatedAt: Date | null;
  version: number;
}

/**
 * Input shape for creating a new book.
 *
 * Only includes the fields a user provides — the database handles defaults
 * for `id`, `status` (AVAILABLE), `created_at` (NOW()), and `version` (0).
 * The `isbn` field is optional since not every book has one.
 */
export interface CreateBookInput {
  title: string;
  author: string;
  isbn?: string;
  price: number;
}

/**
 * Input shape for updating an existing book.
 *
 * Includes all editable fields plus the `version` field required for
 * optimistic locking. The service layer compares this version against the
 * database's current version to detect concurrent modifications — if they
 * don't match, the update is rejected with a 409 Conflict.
 */
export interface UpdateBookInput {
  title: string;
  author: string;
  isbn?: string;
  price: number;
  version: number;
}

/**
 * View model produced by the presenter layer for React components.
 *
 * This is the final transformation in the data flow:
 *   BookRow → Book → BookViewModel
 *
 * Key differences from the domain `Book`:
 * - `price` is a formatted currency string (e.g., "$12.99") instead of a number
 * - `isbn` is an empty string instead of null (simpler for UI rendering)
 * - `createdAt` and `updatedAt` are formatted date strings instead of Date objects
 * - `canBuy` and `canEdit` are derived boolean flags based on the book's status,
 *   so components don't need to duplicate that logic
 */
export interface BookViewModel {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: "AVAILABLE" | "SOLD";
  price: string;
  canBuy: boolean;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string | null;
  version: number;
}
