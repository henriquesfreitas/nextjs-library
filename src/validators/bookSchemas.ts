/**
 * Book Validation Schemas (Zod)
 *
 * Why Zod? — Zod lets us define a single validation schema that runs on both
 * the client (inside React components for instant feedback) and the server
 * (inside API route handlers for security). This eliminates the common problem
 * of duplicated validation logic drifting out of sync between front-end and
 * back-end. The inferred TypeScript types keep our code type-safe without
 * maintaining separate type definitions for validated input.
 *
 * Each schema uses:
 *  - `.trim()` on strings to sanitize whitespace before validation (Req 7.3)
 *  - `.strip()` on objects to silently remove unknown fields (Req 7.5)
 *  - Constraints matching the database column definitions (Req 2.2, 4.4)
 */

import { z } from "zod";

/**
 * Schema for creating a new book.
 *
 * Validates the four user-provided fields. The database handles defaults
 * for id, status (AVAILABLE), created_at (NOW()), and version (0).
 *
 * - title:  required, 1–100 characters (matches VARCHAR(100) NOT NULL)
 * - author: required, 1–255 characters (matches VARCHAR(255) NOT NULL)
 * - isbn:   optional or empty string, max 255 characters (matches VARCHAR(255) nullable)
 * - price:  non-negative number (matches FLOAT8 CHECK (price >= 0))
 */
export const createBookSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(100, "Title must be at most 100 characters"),
    author: z.string().trim().min(1, "Author is required").max(255, "Author must be at most 255 characters"),
    isbn: z
      .string()
      .trim()
      .max(255, "ISBN must be at most 255 characters")
      .optional()
      .or(z.literal("")),
    price: z.number({ required_error: "Price is required" }).min(0, "Price must be a non-negative number"),
  })
  .strip();

/**
 * Schema for updating an existing book.
 *
 * Identical to the create schema but includes the `version` field required
 * for optimistic locking. The service layer compares this version against
 * the database's current version — a mismatch means someone else modified
 * the record, and the update is rejected with 409 Conflict.
 */
export const updateBookSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(100, "Title must be at most 100 characters"),
    author: z.string().trim().min(1, "Author is required").max(255, "Author must be at most 255 characters"),
    isbn: z
      .string()
      .trim()
      .max(255, "ISBN must be at most 255 characters")
      .optional()
      .or(z.literal("")),
    price: z.number({ required_error: "Price is required" }).min(0, "Price must be a non-negative number"),
    version: z.number().int("Version must be an integer").min(0, "Version must be a non-negative integer"),
  })
  .strip();

/**
 * Schema for the buy (mark as sold) operation.
 *
 * Only requires the version field for optimistic locking — the service
 * layer handles the status transition from AVAILABLE to SOLD.
 */
export const buyBookSchema = z
  .object({
    version: z.number().int("Version must be an integer").min(0, "Version must be a non-negative integer"),
  })
  .strip();

/**
 * Inferred TypeScript types from the schemas.
 *
 * Using z.infer ensures these types always stay in sync with the schema
 * definitions above — if a field is added or changed in the schema, the
 * type updates automatically. No manual type maintenance needed.
 */
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type BuyBookInput = z.infer<typeof buyBookSchema>;
